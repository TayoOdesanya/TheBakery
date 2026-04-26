import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { closePool, pool, query } from './db.js';

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

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function toMenuItem(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.image_url,
    category: row.category,
    isAvailable: row.is_available,
    inventory: {
      quantityAvailable: row.quantity_available ?? 0,
      lowStockThreshold: row.low_stock_threshold ?? 5
    }
  };
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
  const { tableNumber, customerName, customerPhone, specialInstructions, items } = payload;
  if (!tableNumber || !Array.isArray(items) || items.length === 0) {
    throw new Error('Table number and cart items are required');
  }

  const { serviceFee, totalAmount } = await calculateOrderItems(client, items);
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
      special_instructions,
      order_number,
      total_amount,
      service_fee,
      stripe_payment_intent_id
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8)
    returning *
  `, [
    Number(tableNumber),
    customerName || 'Guest',
    customerPhone || '',
    specialInstructions || null,
    orderNumber,
    totalAmount,
    serviceFee,
    paymentIntent?.id || null
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
    return { order: updatedResult.rows[0], items: orderItems };
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

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
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
        and coalesce(i.quantity_available, 1) > 0
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

app.get('/api/orders/kitchen', async (req, res, next) => {
  try {
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
      where o.status in ('paid', 'preparing', 'ready')
      group by o.id
      order by o.created_at desc
    `);

    res.json({ orders: result.rows.map(formatOrder) });
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

    res.json({ success: true, order: result.rows[0] });
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
    const { name, description, price, imageUrl, category, initialInventory = 0 } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    await client.query('begin');
    const itemResult = await client.query(`
      insert into bakery_menu_items (name, description, price, image_url, category, is_available)
      values ($1, $2, $3, $4, $5, true)
      returning *
    `, [name, description || null, Number(price), imageUrl || null, category || null]);

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
    const { name, description, price, imageUrl, category, isAvailable, quantityAvailable } = req.body;
    const id = Number(req.params.id);

    const result = await query(`
      update bakery_menu_items
      set name = $1,
          description = $2,
          price = $3,
          image_url = $4,
          category = $5,
          is_available = $6,
          updated_at = now()
      where id = $7
      returning *
    `, [name, description || null, Number(price), imageUrl || null, category || null, isAvailable !== false, id]);

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
  return {
    id: row.id,
    tableNumber: row.table_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    specialInstructions: row.special_instructions,
    status: row.status,
    totalAmount: Number(row.total_amount),
    createdAt: row.created_at,
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

