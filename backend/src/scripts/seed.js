import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { closePool, pool, query } from '../db.js';

dotenv.config();

const menuItems = [
  {
    name: 'Classic Burger',
    description: 'Beef patty with lettuce, tomato, cheese, and house sauce',
    price: 14.99,
    category: 'Mains',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    inventory: 25
  },
  {
    name: 'Margherita Pizza',
    description: 'Mozzarella, tomato sauce, and basil on thin crust',
    price: 16.99,
    category: 'Mains',
    imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400',
    inventory: 15
  },
  {
    name: 'Caesar Salad',
    description: 'Romaine lettuce with parmesan, croutons, and caesar dressing',
    price: 11.99,
    category: 'Salads',
    imageUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400',
    inventory: 20
  }
];

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 10);
  await query(`
    insert into bakery_users (username, password_hash, role)
    values ('admin', $1, 'admin')
    on conflict (username)
    do update set password_hash = excluded.password_hash, role = excluded.role
  `, [passwordHash]);

  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from bakery_order_items');
    await client.query('delete from bakery_orders');
    await client.query('delete from bakery_inventory');
    await client.query('delete from bakery_menu_items');

    for (const item of menuItems) {
      const result = await client.query(`
        insert into bakery_menu_items (name, description, price, image_url, category, is_available)
        values ($1, $2, $3, $4, $5, true)
        returning id
      `, [item.name, item.description, item.price, item.imageUrl, item.category]);

      await client.query(`
        insert into bakery_inventory (menu_item_id, quantity_available, low_stock_threshold)
        values ($1, $2, 5)
      `, [result.rows[0].id, item.inventory]);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }

  console.log('Seed complete. Admin login: admin / admin123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(closePool);

