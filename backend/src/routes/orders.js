import express from 'express';
import { prisma } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get orders (admin only)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group orders by table
    const ordersByTable = orders.reduce((acc, order) => {
      const tableNumber = order.tableNumber;
      if (!acc[tableNumber]) {
        acc[tableNumber] = [];
      }
      acc[tableNumber].push(order);
      return acc;
    }, {});

    res.json({
      orders,
      ordersByTable
    });
  } catch (error) {
    next(error);
  }
});

// Kitchen dashboard route (no auth required)
router.get('/kitchen', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['paid', 'preparing', 'ready']
        }
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Group orders by table
    const ordersByTable = orders.reduce((acc, order) => {
      const tableNumber = order.tableNumber;
      if (!acc[tableNumber]) {
        acc[tableNumber] = [];
      }
      acc[tableNumber].push(order);
      return acc;
    }, {});

    res.json({
      orders,
      ordersByTable
    });
  } catch (error) {
    next(error);
  }
});

// Update order status - Kitchen dashboard (no auth required for kitchen staff)
router.patch('/:orderId/status', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['paid', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Validate orderId is a number
    const orderIdNum = parseInt(orderId);
    if (isNaN(orderIdNum)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Update the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: { 
        status,
        updatedAt: new Date()
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    });

    // Emit Socket.IO event to all connected kitchen dashboards
    req.io.to('kitchen').emit('order-status-updated', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      order: updatedOrder
    });

    console.log(`✅ Order #${orderId} status updated to: ${status}`);

    res.json({
      success: true,
      order: updatedOrder
    });

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Order not found' });
    }
    console.error('Error updating order status:', error);
    next(error);
  }
});

export default router;