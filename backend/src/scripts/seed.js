import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      role: 'admin'
    }
  });

  console.log('✅ Created admin user:', admin.username);

  // Delete existing menu items to start fresh
  await prisma.orderItem.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.menuItem.deleteMany();

  // Sample menu items with inventory
  const menuItems = [
    {
      name: 'Classic Burger',
      description: 'Juicy beef patty with lettuce, tomato, cheese, and our special sauce',
      price: 14.99,
      category: 'Mains',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
      inventory: { quantity: 25, threshold: 5 }
    },
    {
      name: 'Margherita Pizza',
      description: 'Fresh mozzarella, tomato sauce, and basil on crispy thin crust',
      price: 16.99,
      category: 'Mains',
      imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
      inventory: { quantity: 15, threshold: 3 }
    },
    {
      name: 'Caesar Salad',
      description: 'Crisp romaine lettuce with parmesan cheese, croutons, and caesar dressing',
      price: 11.99,
      category: 'Salads',
      imageUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400',
      inventory: { quantity: 20, threshold: 5 }
    }
  ];

  // Create menu items with inventory
  for (const item of menuItems) {
    const menuItem = await prisma.menuItem.create({
      data: {
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        isAvailable: true
      }
    });

    // Create inventory for this menu item
    await prisma.inventory.create({
      data: {
        menuItemId: menuItem.id,
        quantityAvailable: item.inventory.quantity,
        lowStockThreshold: item.inventory.threshold
      }
    });

    console.log(`✅ Created menu item: ${item.name} (Stock: ${item.inventory.quantity})`);
  }

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
