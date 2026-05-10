import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { closePool, pool, query } from './db.js';
import { notifyOrderConfirmed, notifyOrderDispatched, notifyOrderUpdate, notifyBakeryOverdue } from './notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const serviceFeePercentage = Number(process.env.STRIPE_SERVICE_FEE_PERCENTAGE || 0);
const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
const fallbackPublicPath = path.join(__dirname, '..', 'public');
const staticPath = existsSync(frontendDistPath) ? frontendDistPath : fallbackPublicPath;

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(staticPath));

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query('select is_active from bakery_users where id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'Account deactivated. Please contact the bakery.' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

async function generateBuyerId() {
  const result = await query("select count(*) from bakery_users where role = 'buyer'");
  const count = parseInt(result.rows[0].count) + 1;
  return `BKR-${String(count).padStart(4, '0')}`;
}

function maskContact(email, phone) {
  if (email) {
    const [local, domain] = email.split('@');
    const visible = local[0];
    const stars = '*'.repeat(Math.max(local.length - 1, 3));
    return `${visible}${stars}@${domain}`;
  }
  if (phone) {
    return `${'*'.repeat(Math.max(phone.length - 4, 4))}${phone.slice(-4)}`;
  }
  return '***';
}

function toMenuItem(row) {
  const qty = row.quantity_available ?? 0;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.image_url,
    category: row.category,
    isAvailable: row.is_available,
    weightGrams: row.weight_grams ?? 500,
    ingredients: row.ingredients || null,
    allergens: row.allergens || null,
    isSoldOut: row.quantity_available !== null && Number(row.quantity_available) === 0,
    inventory: {
      quantityAvailable: qty,
      lowStockThreshold: row.low_stock_threshold ?? 5
    }
  };
}

function calculateShippingCost(weightGrams, tierRates) {
  const entry = tierRates.rates.find((r) => weightGrams <= r.max_grams)
    ?? tierRates.rates[tierRates.rates.length - 1];
  return Number(entry.price);
}

function getEstimatedDelivery(cutoffHour, daysToAdd) {
  const now = new Date();
  const ukNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

  const addWorkingDays = (date, n) => {
    const d = new Date(date);
    let added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      if (!isWeekend(d)) added++;
    }
    return d;
  };

  const shipDate = ukNow.getHours() < cutoffHour
    ? new Date(ukNow)
    : addWorkingDays(ukNow, 1);

  let dispatch = new Date(shipDate);
  while (isWeekend(dispatch)) dispatch = addWorkingDays(dispatch, 1);

  return addWorkingDays(dispatch, daysToAdd);
}

async function calculateOrderItems(client, items, { lockInventory = false } = {}) {
  let subtotalAmount = 0;
  const orderItems = [];

  for (const item of items) {
    const menuResult = await client.query(`
      select mi.id, mi.name, mi.price, i.quantity_available
      from bakery_menu_items mi
      join bakery_inventory i on i.menu_item_id = mi.id
      where mi.id = $1 and mi.is_available = true
      ${lockInventory ? 'for update of mi, i' : ''}
    `, [item.menuItemId]);

    const menuItem = menuResult.rows[0];
    const quantity = Number(item.quantity);
    if (!menuItem || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Invalid order item');
    }

    if (menuItem.quantity_available !== null && menuItem.quantity_available < quantity) {
      throw new Error(`${menuItem.name} does not have enough stock`);
    }

    const unitPrice = Number(menuItem.price);
    const itemSubtotal = unitPrice * quantity;
    subtotalAmount += itemSubtotal;
    orderItems.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      unitPrice,
      subtotal: itemSubtotal
    });
  }

  const serviceFee = Number((subtotalAmount * (serviceFeePercentage / 100)).toFixed(2));
  const totalAmount = Number((subtotalAmount + serviceFee).toFixed(2));
  return { orderItems, subtotalAmount, serviceFee, totalAmount };
}

function isLikelyPlaceholderStripeKey(key) {
  const normalized = String(key || '').trim().toLowerCase();
  return !normalized || normalized.includes('your_stripe_secret_key') || normalized.includes('your-stripe-secret-key') || normalized.endsWith('_key');
}

async function createPendingOrder(client, payload) {
  const {
    tableNumber, customerName, customerPhone, customerEmail,
    specialInstructions, items,
    fulfillmentType = 'collection',
    shippingType, shippingTier,
    deliveryAddress,
    deliveryAddressLine1, deliveryAddressLine2, deliveryCity, deliveryPostcode,
  } = payload;

  const resolvedShippingType = shippingType || shippingTier || 'standard';
  const resolvedAddress = deliveryAddress || (deliveryAddressLine1 ? {
    line1: deliveryAddressLine1,
    line2: deliveryAddressLine2 || null,
    city: deliveryCity,
    postcode: deliveryPostcode,
  } : null);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart items are required');
  }

  if (!['collection', 'delivery'].includes(fulfillmentType)) {
    throw new Error('Invalid fulfillment type');
  }

  if (fulfillmentType === 'delivery') {
    if (!deliveryName || !deliveryAddressLine1 || !deliveryCity || !deliveryPostcode) {
      throw new Error('Full delivery address is required');
    }
    if (!shippingTier) throw new Error('Shipping tier is required for delivery');
  }

  const { serviceFee, subtotalAmount, totalAmount: itemsTotal } = await calculateOrderItems(client, items);

  if (fulfillmentType === 'delivery' && subtotalAmount < 10) {
    throw new Error('Minimum order for delivery is £10.00');
  }

  let shippingCost = 0;
  let estimatedDelivery = null;

  if (fulfillmentType === 'delivery') {
    const ratesResult = await client.query('select * from bakery_shipping_rates where tier = $1', [shippingTier]);
    const tierRates = ratesResult.rows[0];
    if (!tierRates) throw new Error('Invalid shipping tier');

    const weightResult = await client.query(`
      select coalesce(sum(mi.weight_grams * $1::int), 0) as total_weight
      from unnest($2::int[]) with ordinality as u(id, ord)
      join bakery_menu_items mi on mi.id = u.id
    `, [1, items.map((i) => i.menuItemId)]);

    let totalWeight = 0;
    for (const item of items) {
      const menuRes = await client.query('select coalesce(weight_grams, 500) as w from bakery_menu_items where id = $1', [item.menuItemId]);
      totalWeight += (menuRes.rows[0]?.w ?? 500) * Number(item.quantity);
    }

    shippingCost = calculateShippingCost(totalWeight, tierRates);
    estimatedDelivery = getEstimatedDelivery(tierRates.cutoff_hour, shippingTier === 'next_day' ? 1 : 2);
  }

  const totalAmount = Number((itemsTotal + shippingCost).toFixed(2));
  const orderNumber = `BKY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  let paymentIntent = null;

  if (stripe && !isLikelyPlaceholderStripeKey(process.env.STRIPE_SECRET_KEY)) {
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: 'gbp',
        metadata: {
          orderNumber,
          tableNumber: String(tableNumber)
        },
        description: `The Bakery order ${orderNumber}`
      });
    } catch (error) {
      if (isProduction) throw error;
      console.warn(`[Stripe] PaymentIntent creation failed. Falling back to manual completion. ${error.message}`);
    }
  } else if (isProduction) {
    throw new Error('Stripe is not configured correctly');
  }

  const orderResult = await client.query(`
    insert into bakery_orders (
      table_number,
      customer_name,
      customer_phone,
      customer_email,
      special_instructions,
      order_number,
      total_amount,
      service_fee,
      stripe_payment_intent_id,
      fulfillment_type,
      shipping_type,
      delivery_address_line1,
      delivery_address_line2,
      delivery_city,
      delivery_postcode
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    returning *
  `, [
    Number(tableNumber) || 0,
    customerName || 'Guest',
    customerPhone || '',
    customerEmail || null,
    specialInstructions || null,
    orderNumber,
    totalAmount,
    serviceFee,
    paymentIntent?.id || null,
    fulfillmentType,
    resolvedShippingType,
    resolvedAddress?.line1 || null,
    resolvedAddress?.line2 || null,
    resolvedAddress?.city || null,
    resolvedAddress?.postcode || null,
  ]);

  return { order: orderResult.rows[0], clientSecret: paymentIntent?.client_secret || null };
}

async function completePendingOrder(orderId, payload) {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const orderResult = await client.query('select * from bakery_orders where id = $1 for update', [Number(orderId)]);
    const order = orderResult.rows[0];
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'paid') {
      const existingItems = await client.query('select * from bakery_order_items where order_id = $1 order by id', [order.id]);
      await client.query('commit');
      return { order, items: existingItems.rows };
    }

    const { orderItems, serviceFee, totalAmount } = await calculateOrderItems(client, payload.items, { lockInventory: true });

    for (const item of orderItems) {
      await client.query(`
        update bakery_inventory
        set quantity_available = quantity_available - $1, updated_at = now()
        where menu_item_id = $2
      `, [item.quantity, item.menuItemId]);

      await client.query(`
        insert into bakery_order_items (order_id, menu_item_id, quantity, unit_price, subtotal)
        values ($1, $2, $3, $4, $5)
      `, [order.id, item.menuItemId, item.quantity, item.unitPrice, item.subtotal]);
    }

    const updatedResult = await client.query(`
      update bakery_orders
      set status = 'paid',
          service_fee = $1,
          total_amount = $2,
          payment_method = $3,
          completed_at = now(),
          updated_at = now()
      where id = $4
      returning *
    `, [serviceFee, totalAmount, payload.paymentMethod || 'manual', order.id]);

    await client.query('commit');
    const paidOrder = updatedResult.rows[0];
    notifyOrderConfirmed({
      customerName: paidOrder.customer_name,
      orderNumber: paidOrder.order_number,
      customerEmail: paidOrder.customer_email,
      customerPhone: paidOrder.customer_phone,
      fulfillmentType: paidOrder.fulfillment_type || 'collection',
    }).catch((e) => console.warn('[confirm notify]', e.message));
    return { order: paidOrder, items: orderItems };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

app.get('/health', async (req, res, next) => {
  try {
    await query('select 1');
    res.json({ status: 'OK', database: 'OK', timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    stripeServiceFeePercentage: serviceFeePercentage
  });
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await query('select * from bakery_users where username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive. Please contact the bakery.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, buyerId: user.buyer_id || null },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, buyerId: user.buyer_id || null }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/menu/categories', async (req, res, next) => {
  try {
    const result = await query(`
      select distinct category
      from bakery_menu_items
      where is_available = true and category is not null and trim(category) <> ''
      order by category asc
    `);
    res.json(result.rows.map((row) => row.category));
  } catch (error) {
    next(error);
  }
});

app.get('/api/shipping/rates', (req, res) => {
  res.json({
    rates: [
      {
        tier: 'standard',
        display_name: 'Standard Delivery',
        estimated_days: '3–5 working days',
        cutoff_hour: 14,
        rates: [
          { max_grams: 500,  price: 3.99 },
          { max_grams: 1000, price: 4.99 },
          { max_grams: 2000, price: 5.99 },
          { max_grams: 5000, price: 7.99 },
          { max_grams: 99999, price: 9.99 },
        ],
      },
      {
        tier: 'express',
        display_name: 'Express Delivery',
        estimated_days: '1–2 working days',
        cutoff_hour: 12,
        rates: [
          { max_grams: 500,  price: 6.99 },
          { max_grams: 1000, price: 8.99 },
          { max_grams: 2000, price: 10.99 },
          { max_grams: 5000, price: 13.99 },
          { max_grams: 99999, price: 16.99 },
        ],
      },
    ],
  });
});

app.get('/api/menu', async (req, res, next) => {
  try {
    const params = [];
    let categoryFilter = '';
    if (req.query.category) {
      params.push(req.query.category);
      categoryFilter = `and mi.category = $${params.length}`;
    }

    const result = await query(`
      select mi.*, i.quantity_available, i.low_stock_threshold
      from bakery_menu_items mi
      left join bakery_inventory i on i.menu_item_id = mi.id
      where mi.is_available = true
        ${categoryFilter}
      order by mi.category asc, mi.name asc
    `, params);

    res.json(result.rows.map(toMenuItem));
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query('begin');
    const payload = await createPendingOrder(client, req.body);
    await client.query('commit');
    res.status(201).json({
      order: payload.order,
      clientSecret: payload.clientSecret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null
    });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/orders/:orderId/complete', async (req, res, next) => {
  try {
    const result = await completePendingOrder(req.params.orderId, req.body);
    res.json({ order: formatCompletedOrder(result.order, result.items), items: result.items });
  } catch (error) {
    next(error);
  }
});

const kitchenOrdersQuery = `
  select
    o.*,
    coalesce(json_agg(json_build_object(
      'id', oi.id,
      'quantity', oi.quantity,
      'unitPrice', oi.unit_price,
      'subtotal', oi.subtotal,
      'menuItem', json_build_object('id', mi.id, 'name', mi.name, 'price', mi.price)
    ) order by oi.id) filter (where oi.id is not null), '[]') as order_items
  from bakery_orders o
  left join bakery_order_items oi on oi.order_id = o.id
  left join bakery_menu_items mi on mi.id = oi.menu_item_id
  where o.status in ('paid', 'preparing', 'ready')
  group by o.id
  order by o.created_at asc
`;

app.get('/api/orders/kitchen', async (req, res, next) => {
  try {
    const result = await query(kitchenOrdersQuery);
    const orders = result.rows.map(formatOrder);

    // Fire overdue alerts for any newly-overdue delivery orders
    const ownerEmail = process.env.BAKERY_OWNER_EMAIL;
    for (const order of orders) {
      if (order.isOverdue && !order.alertTriggered) {
        await query('update bakery_orders set alert_triggered = true where id = $1', [order.id]);
        order.alertTriggered = true;
        notifyBakeryOverdue(order, ownerEmail).catch((e) => console.warn('[overdue alert]', e.message));
      }
    }

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/kitchen/history', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const result = await query(`
      select
        o.*,
        coalesce(json_agg(json_build_object(
          'id', oi.id,
          'quantity', oi.quantity,
          'unitPrice', oi.unit_price,
          'subtotal', oi.subtotal,
          'menuItem', json_build_object('id', mi.id, 'name', mi.name, 'price', mi.price)
        ) order by oi.id) filter (where oi.id is not null), '[]') as order_items
      from bakery_orders o
      left join bakery_order_items oi on oi.order_id = o.id
      left join bakery_menu_items mi on mi.id = oi.menu_item_id
      where o.status in ('delivered', 'cancelled')
      group by o.id
      order by o.updated_at desc
      limit $1 offset $2
    `, [limit, offset]);
    res.json({ orders: result.rows.map(formatOrder) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/orders/:orderId/dispatch', async (req, res, next) => {
  try {
    const { trackingNumber } = req.body;
    if (!trackingNumber || !trackingNumber.trim()) {
      return res.status(400).json({ error: 'Tracking number is required to mark as dispatched' });
    }

    const result = await query(`
      update bakery_orders
      set status = 'delivered', tracking_number = $1, dispatched_at = now(), updated_at = now()
      where id = $2
      returning *
    `, [trackingNumber.trim(), Number(req.params.orderId)]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });

    const row = result.rows[0];
    const orderForNotify = {
      customerName: row.customer_name,
      orderNumber: row.order_number,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      trackingNumber: row.tracking_number,
      fulfillmentType: row.fulfillment_type || 'collection',
    };
    notifyOrderDispatched(orderForNotify).catch((e) => console.warn('[dispatch notify]', e.message));

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/orders/:orderId/notes', async (req, res, next) => {
  try {
    const { kitchenNotes } = req.body;
    const result = await query(`
      update bakery_orders
      set kitchen_notes = $1, updated_at = now()
      where id = $2
      returning id, kitchen_notes
    `, [kitchenNotes ?? null, Number(req.params.orderId)]);

    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, kitchenNotes: result.rows[0].kitchen_notes });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/orders/:orderId/status', async (req, res, next) => {
  try {
    const validStatuses = ['paid', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` });
    }

    const result = await query(`
      update bakery_orders
      set status = $1, updated_at = now()
      where id = $2
      returning *
    `, [req.body.status, Number(req.params.orderId)]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const row = result.rows[0];
    if (req.body.status === 'delivered') {
      const orderForNotify = {
        customerName: row.customer_name,
        orderNumber: row.order_number,
        customerEmail: row.customer_email,
        customerPhone: row.customer_phone,
        trackingNumber: row.tracking_number,
        fulfillmentType: row.fulfillment_type || 'collection',
      };
      notifyOrderDispatched(orderForNotify).catch((e) => console.warn('[status notify]', e.message));
    }

    res.json({ success: true, order: row });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/menu-items', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      select mi.*, i.quantity_available, i.low_stock_threshold
      from bakery_menu_items mi
      left join bakery_inventory i on i.menu_item_id = mi.id
      order by mi.category asc, mi.name asc
    `);
    res.json(result.rows.map(toMenuItem));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/menu-items', requireAuth, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const { name, description, price, imageUrl, category, initialInventory = 0, weightGrams, ingredients, allergens } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    await client.query('begin');
    const itemResult = await client.query(`
      insert into bakery_menu_items (name, description, price, image_url, category, is_available, weight_grams, ingredients, allergens)
      values ($1, $2, $3, $4, $5, true, $6, $7, $8)
      returning *
    `, [name, description || null, Number(price), imageUrl || null, category || null,
        weightGrams ? Number(weightGrams) : null, ingredients || null, allergens || null]);

    await client.query(`
      insert into bakery_inventory (menu_item_id, quantity_available, low_stock_threshold)
      values ($1, $2, 5)
    `, [itemResult.rows[0].id, Number(initialInventory) || 0]);

    await client.query('commit');
    res.status(201).json(itemResult.rows[0]);
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.put('/api/admin/menu-items/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, description, price, imageUrl, category, isAvailable, quantityAvailable, weightGrams, ingredients, allergens } = req.body;
    const id = Number(req.params.id);

    const result = await query(`
      update bakery_menu_items
      set name = $1,
          description = $2,
          price = $3,
          image_url = $4,
          category = $5,
          is_available = $6,
          weight_grams = $7,
          ingredients = $8,
          allergens = $9,
          updated_at = now()
      where id = $10
      returning *
    `, [name, description || null, Number(price), imageUrl || null, category || null, isAvailable !== false,
        weightGrams ? Number(weightGrams) : null, ingredients || null, allergens || null, id]);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (quantityAvailable !== undefined) {
      await query(`
        update bakery_inventory
        set quantity_available = $1, updated_at = now()
        where menu_item_id = $2
      `, [Number(quantityAvailable), id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/menu-items/:id', requireAuth, async (req, res, next) => {
  try {
    await query('delete from bakery_menu_items where id = $1', [Number(req.params.id)]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/dashboard', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`
      select
        (select count(*)::int from bakery_orders where created_at >= current_date) as todays_orders,
        (select coalesce(sum(total_amount), 0)::float from bakery_orders where created_at >= current_date) as todays_revenue,
        (select count(*)::int from bakery_orders where status in ('paid', 'preparing', 'ready')) as active_orders
    `);
    res.json({
      todaysOrders: result.rows[0].todays_orders,
      todaysRevenue: result.rows[0].todays_revenue,
      activeOrders: result.rows[0].active_orders
    });
  } catch (error) {
    next(error);
  }
});

async function createOneInvite(email, phone, createdBy) {
  const normEmail = email ? email.toLowerCase() : null;
  if (!normEmail && !phone) throw Object.assign(new Error('Email or phone required'), { status: 400 });

  if (normEmail) {
    const u = await query("select id from bakery_users where email = $1", [normEmail]);
    if (u.rows.length) throw Object.assign(new Error('Email already registered'), { status: 409 });
    const a = await query("select id from bakery_invite_tokens where email = $1 and used_at is null and expires_at > now()", [normEmail]);
    if (a.rows.length) throw Object.assign(new Error('Active invite already exists for this email'), { status: 409 });
  }
  if (phone) {
    const u = await query("select id from bakery_users where phone = $1", [phone]);
    if (u.rows.length) throw Object.assign(new Error('Phone number already registered'), { status: 409 });
    const a = await query("select id from bakery_invite_tokens where phone = $1 and email is null and used_at is null and expires_at > now()", [phone]);
    if (a.rows.length) throw Object.assign(new Error('Active invite already exists for this phone'), { status: 409 });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const result = await query(`
    insert into bakery_invite_tokens (token, email, phone, created_by, expires_at)
    values ($1, $2, $3, $4, $5)
    returning id, token, email, phone, expires_at, created_at
  `, [token, normEmail, phone || null, createdBy, expiresAt]);

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  return { ...result.rows[0], url: `${appUrl}/register/${result.rows[0].token}` };
}

app.post('/api/admin/invites', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const invite = await createOneInvite(email, phone, req.user.userId);
    res.status(201).json({ invite });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
});

app.post('/api/admin/invites/bulk', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts provided' });
    }
    if (contacts.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 contacts per import' });
    }

    const results = [];
    for (const { email, phone } of contacts) {
      const label = email || phone || 'unknown';
      try {
        const invite = await createOneInvite(email, phone, req.user.userId);
        results.push({ contact: label, status: 'created', url: invite.url });
      } catch (err) {
        results.push({ contact: label, status: 'skipped', reason: err.message });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    res.json({ created, skipped, results });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/invites', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const result = await query(`
      select it.id, it.email, it.phone, it.token, it.used_at, it.expires_at, it.created_at,
             u.username as used_by_username, u.buyer_id
      from bakery_invite_tokens it
      left join bakery_users u on u.email = it.email
      order by it.created_at desc
    `);
    const invites = result.rows.map((row) => ({
      ...row,
      url: !row.used_at && new Date(row.expires_at) > new Date()
        ? `${appUrl}/register/${row.token}`
        : null,
      token: undefined,
    }));
    res.json({ invites });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/invites/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      'delete from bakery_invite_tokens where id = $1 and used_at is null returning id',
      [Number(req.params.id)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Invite not found or already used' });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/invites/:token', async (req, res, next) => {
  try {
    const result = await query(
      'select * from bakery_invite_tokens where token = $1',
      [req.params.token]
    );
    const invite = result.rows[0];
    if (!invite) return res.status(404).json({ error: 'Invalid invite link' });

    if (invite.used_at) {
      await query(
        'update bakery_invite_tokens set reuse_attempts = reuse_attempts + 1 where id = $1',
        [invite.id]
      );
      console.warn(`[SECURITY] Reuse attempt on invite ${invite.id} for ${invite.email}`);
      return res.status(410).json({ error: 'This invite has already been used.', reused: true });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite has expired. Please contact the bakery.', expired: true });
    }

    res.json({ invite: { id: invite.id, email: invite.email, phone: invite.phone, expires_at: invite.expires_at } });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/send-invite-otp', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const result = await query(
      'select * from bakery_invite_tokens where token = $1 and used_at is null and expires_at > now()',
      [token]
    );
    const invite = result.rows[0];
    if (!invite) return res.status(400).json({ error: 'Invalid or expired invite link' });

    await query(
      'update bakery_otp_codes set used_at = now() where invite_id = $1 and used_at is null',
      [invite.id]
    );

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await query(`
      insert into bakery_otp_codes (invite_id, code, expires_at)
      values ($1, $2, now() + interval '10 minutes')
    `, [invite.id, otpCode]);

    console.log(`[OTP] Invite code for ${invite.email || invite.phone}: ${otpCode}`);
    res.json({ inviteId: invite.id, contact: maskContact(invite.email, invite.phone) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-register-otp', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { inviteId, code } = req.body;
    if (!inviteId || !code) return res.status(400).json({ error: 'Invite ID and code required' });

    await client.query('begin');

    const inviteResult = await client.query(
      'select * from bakery_invite_tokens where id = $1 and used_at is null and expires_at > now() for update',
      [Number(inviteId)]
    );
    const invite = inviteResult.rows[0];
    if (!invite) {
      await client.query('rollback');
      return res.status(400).json({ error: 'Invite is no longer valid' });
    }

    const otpResult = await client.query(`
      select * from bakery_otp_codes
      where invite_id = $1 and used_at is null and expires_at > now()
      order by created_at desc limit 1
    `, [Number(inviteId)]);
    const otp = otpResult.rows[0];
    if (!otp || otp.code !== String(code)) {
      await client.query('rollback');
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const buyerId = await generateBuyerId();
    const userResult = await client.query(`
      insert into bakery_users (email, phone, role, buyer_id, is_active, email_verified)
      values ($1, $2, 'buyer', $3, true, true)
      returning id, email, phone, role, buyer_id
    `, [invite.email, invite.phone, buyerId]);
    const user = userResult.rows[0];

    await client.query('update bakery_otp_codes set used_at = now() where id = $1', [otp.id]);
    await client.query('update bakery_invite_tokens set used_at = now() where id = $1', [invite.id]);
    await client.query('commit');

    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email, phone: user.phone, role: user.role, buyerId: user.buyer_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, phone: user.phone, role: user.role, buyerId: user.buyer_id } });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/auth/buyer-login', async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'Email or phone number required' });

    const result = email
      ? await query("select * from bakery_users where email = $1 and role = 'buyer'", [email.toLowerCase()])
      : await query("select * from bakery_users where phone = $1 and role = 'buyer'", [phone]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'No account found. Please check your details or contact the bakery.' });
    if (!user.is_active) return res.status(403).json({ error: 'Your account has been deactivated. Please contact the bakery.' });

    await query('update bakery_otp_codes set used_at = now() where user_id = $1 and used_at is null', [user.id]);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await query(`
      insert into bakery_otp_codes (user_id, code, expires_at)
      values ($1, $2, now() + interval '10 minutes')
    `, [user.id, otpCode]);

    console.log(`[OTP] Login code for ${user.email || user.phone}: ${otpCode}`);
    res.json({ userId: user.id, contact: maskContact(user.email, user.phone) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/verify-login-otp', async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'User ID and code required' });

    const otpResult = await query(`
      select * from bakery_otp_codes
      where user_id = $1 and used_at is null and expires_at > now()
      order by created_at desc limit 1
    `, [Number(userId)]);
    const otp = otpResult.rows[0];
    if (!otp || otp.code !== String(code)) return res.status(400).json({ error: 'Invalid or expired code' });

    await query('update bakery_otp_codes set used_at = now() where id = $1', [otp.id]);

    const userResult = await query('select * from bakery_users where id = $1', [Number(userId)]);
    const user = userResult.rows[0];

    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email, phone: user.phone, role: user.role, buyerId: user.buyer_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, phone: user.phone, role: user.role, buyerId: user.buyer_id } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/shipping/rates', async (req, res, next) => {
  try {
    const result = await query('select * from bakery_shipping_rates order by id asc');
    res.json({ rates: result.rows });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/shipping-rates/:tier', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { displayName, description, cutoffHour, estimatedDays, rates } = req.body;
    const result = await query(`
      update bakery_shipping_rates
      set display_name = coalesce($1, display_name),
          description = coalesce($2, description),
          cutoff_hour = coalesce($3, cutoff_hour),
          estimated_days = coalesce($4, estimated_days),
          rates = coalesce($5, rates),
          updated_at = now()
      where tier = $6
      returning *
    `, [displayName, description, cutoffHour, estimatedDays, rates ? JSON.stringify(rates) : null, req.params.tier]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Tier not found' });
    res.json({ rate: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      select id, username, email, phone, role, buyer_id, is_active, email_verified, created_at
      from bakery_users
      order by created_at desc
    `);
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/users/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be a boolean' });

    const result = await query(`
      update bakery_users set is_active = $1 where id = $2 and role != 'admin' returning id, username, is_active
    `, [isActive, Number(req.params.id)]);

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found' });
  }

  const indexPath = path.join(staticPath, 'index.html');
  if (existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  next();
});

function formatOrder(row) {
  const createdAt = row.created_at;
  const isOverdue = (() => {
    if (row.dispatched_at || row.status === 'delivered') return false;
    if ((row.shipping_type || 'standard') !== 'standard') return false;
    if (row.fulfillment_type !== 'delivery') return false;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const workingDayMs = 24 * 60 * 60 * 1000;
    return ageMs > 2 * workingDayMs;
  })();

  return {
    id: row.id,
    orderNumber: row.order_number,
    tableNumber: row.table_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email || null,
    customerPhone: row.customer_phone,
    specialInstructions: row.special_instructions,
    status: row.status,
    fulfillmentType: row.fulfillment_type || 'collection',
    shippingType: row.shipping_type || 'standard',
    totalAmount: Number(row.total_amount),
    trackingNumber: row.tracking_number || null,
    kitchenNotes: row.kitchen_notes || null,
    dispatchedAt: row.dispatched_at || null,
    alertTriggered: row.alert_triggered || false,
    isOverdue,
    deliveryAddress: row.delivery_address_line1 ? {
      name: row.customer_name,
      line1: row.delivery_address_line1,
      line2: row.delivery_address_line2 || null,
      city: row.delivery_city,
      postcode: row.delivery_postcode
    } : null,
    createdAt,
    updatedAt: row.updated_at,
    orderItems: row.order_items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      menuItem: {
        id: item.menuItem.id,
        name: item.menuItem.name,
        price: Number(item.menuItem.price)
      }
    }))
  };
}

function formatCompletedOrder(order, items = []) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    tableNumber: order.table_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    specialInstructions: order.special_instructions,
    status: order.status,
    totalAmount: Number(order.total_amount),
    serviceFee: Number(order.service_fee || 0),
    shippingCost: Number(order.shipping_cost || 0),
    fulfillmentType: order.fulfillment_type || 'collection',
    shippingTier: order.shipping_tier || null,
    deliveryName: order.delivery_name || null,
    deliveryPhone: order.delivery_phone || null,
    deliveryAddress: order.delivery_address_line1 ? {
      line1: order.delivery_address_line1,
      line2: order.delivery_address_line2 || null,
      city: order.delivery_city,
      postcode: order.delivery_postcode
    } : null,
    estimatedDelivery: order.estimated_delivery || null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    orderItems: items.map((item, index) => ({
      id: item.id || `${order.id}-${index}`,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice ?? item.unit_price),
      subtotal: Number(item.subtotal),
      menuItem: {
        id: item.menuItemId ?? item.menu_item_id,
        name: item.name || 'Menu item'
      }
    }))
  };
}

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: error.message || 'Server error' });
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

