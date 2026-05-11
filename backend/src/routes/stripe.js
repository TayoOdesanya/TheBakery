import express from 'express';
import Stripe from 'stripe';
import { prisma } from '../server.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, tableNumber, customerName, customerPhone, specialInstructions } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    // Calculate total and create line items
    const lineItems = await Promise.all(
      items.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId }
        });

        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} not found`);
        }

        return {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: menuItem.name,
              description: menuItem.description || '',
            },
            unit_amount: Math.round(parseFloat(menuItem.price) * 100), // Convert to pence
          },
          quantity: item.quantity,
        };
      })
    );

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/menu`,
      metadata: {
        tableNumber: tableNumber?.toString() || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        specialInstructions: specialInstructions || '',
        items: JSON.stringify(items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))),
        totalAmount: totalAmount.toString()
      }
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  console.log('===== WEBHOOK DEBUG =====');
  console.log('Body type:', typeof req.body);
  console.log('Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('Signature present:', !!sig);
  console.log('Webhook secret (first 20 chars):', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 20));
  console.log('========================');
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const { tableNumber, customerName, customerPhone, specialInstructions, items, totalAmount } = session.metadata;
      const parsedItems = JSON.parse(items);

      const order = await prisma.order.create({
        data: {
          tableNumber: tableNumber ? parseInt(tableNumber) : 0,
          customerName: customerName || 'Guest',
          customerPhone: customerPhone || '',
          specialInstructions: specialInstructions || null,
          totalAmount: parseFloat(totalAmount),
          status: 'paid',
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          orderItems: {
            create: parsedItems.map(item => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.unitPrice * item.quantity
            }))
          }
        },
        include: {
          orderItems: {
            include: {
              menuItem: true
            }
          }
        }
      });

      console.log('Order created:', order.id);
      if (specialInstructions) {
        console.log('Special instructions:', specialInstructions);
      }

      if (req.app.locals.io) {
        req.app.locals.io.to('kitchen').emit('new-order', order);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({ error: 'Failed to create order' });
    }
  }

  res.json({ received: true });
});

// Verify payment session
router.get('/verify-session/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    
    if (session.payment_status === 'paid') {
      // Find the order
      const order = await prisma.order.findFirst({
        where: {
          stripeSessionId: session.id
        },
        include: {
          orderItems: {
            include: {
              menuItem: true
            }
          }
        }
      });

      res.json({
        paid: true,
        order: order
      });
    } else {
      res.json({
        paid: false
      });
    }
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
