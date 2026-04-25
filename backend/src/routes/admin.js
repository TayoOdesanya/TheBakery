import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

// Get all menu items (including unavailable ones for admin)
router.get('/menu-items', async (req, res, next) => {
  try {
    const menuItems = await prisma.menuItem.findMany({
      include: {
        inventory: {
          select: {
            quantityAvailable: true,
            lowStockThreshold: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json(menuItems);
  } catch (error) {
    next(error);
  }
});

// Create new menu item
router.post('/menu-items', async (req, res, next) => {
  try {
    const { name, description, price, imageUrl, category, initialInventory = 0 } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const menuItem = await prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.create({
        data: {
          name,
          description: description || null,
          price: parseFloat(price),
          imageUrl: imageUrl || null,
          category: category || null,
          isAvailable: true
        }
      });

      await tx.inventory.create({
        data: {
          menuItemId: item.id,
          quantityAvailable: parseInt(initialInventory),
          lowStockThreshold: 5
        }
      });

      return await tx.menuItem.findUnique({
        where: { id: item.id },
        include: { inventory: true }
      });
    });

    res.status(201).json(menuItem);
  } catch (error) {
    next(error);
  }
});

// Update menu item
router.put('/menu-items/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, imageUrl, category } = req.body;

    const menuItem = await prisma.menuItem.update({
      where: {
        id: parseInt(id)
      },
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        imageUrl: imageUrl || null,
        category: category || null
      },
      include: {
        inventory: true
      }
    });

    res.json(menuItem);
  } catch (error) {
    next(error);
  }
});

// Delete menu item
router.delete('/menu-items/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.menuItem.delete({
      where: {
        id: parseInt(id)
      }
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get dashboard statistics
router.get('/dashboard', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todaysOrders,
      todaysRevenue,
      activeOrders,
      recentOrders
    ] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'paid'
        }
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: { in: ['paid', 'preparing', 'ready', 'delivered'] }
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.count({
        where: { status: { in: ['paid', 'preparing', 'ready'] } }
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    res.json({
      todaysOrders,
      todaysRevenue: todaysRevenue._sum.totalAmount || 0,
      activeOrders,
      lowStockItems: [],
      recentOrders
    });
  } catch (error) {
    next(error);
  }
});

export default router;
