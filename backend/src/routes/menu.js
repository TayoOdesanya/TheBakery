import express from 'express';
import { prisma } from '../server.js';

const router = express.Router();

// Get all available menu items with optional category filter
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;

    const whereClause = {
      isAvailable: true
    };

    // Add category filter if provided
    if (category) {
      whereClause.category = category;
    }

    const menuItems = await prisma.menuItem.findMany({
      where: whereClause,
      include: {
        inventory: {
          select: {
            quantityAvailable: true,
            lowStockThreshold: true
          }
        }
      },
      orderBy: {
        category: 'asc'
      }
    });

    // Filter out items with zero inventory
    const availableItems = menuItems.filter(item => {
      return !item.inventory || item.inventory.quantityAvailable > 0;
    });

    res.json(availableItems);
  } catch (error) {
    next(error);
  }
});

// Get all available categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        category: {
          not: null
        }
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    // Extract unique category names, filter nulls, trim whitespace, and remove duplicates
    const categorySet = new Set(
      categories
        .map(item => item.category)
        .filter(cat => cat !== null)
        .map(cat => cat.trim()) // Remove whitespace
    );

    // Convert Set back to array and sort
    const categoryList = Array.from(categorySet).sort();

    res.json(categoryList);
  } catch (error) {
    next(error);
  }
});

export default router;