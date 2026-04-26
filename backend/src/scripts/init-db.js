import dotenv from 'dotenv';
import { closePool, query } from '../db.js';

dotenv.config();

async function main() {
  console.log('Initialising PostgreSQL database...');

  await query(`
    create table if not exists bakery_users (
      id serial primary key,
      username text not null unique,
      password_hash text not null,
      role text not null default 'admin',
      created_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists bakery_menu_items (
      id serial primary key,
      name text not null,
      description text,
      price numeric(10, 2) not null,
      image_url text,
      category text,
      is_available boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists bakery_inventory (
      id serial primary key,
      menu_item_id integer not null unique references bakery_menu_items(id) on delete cascade,
      quantity_available integer not null default 0,
      low_stock_threshold integer not null default 5,
      updated_at timestamptz not null default now()
    )
  `);

  await query(`
    create table if not exists bakery_orders (
      id serial primary key,
      table_number integer not null,
      customer_name text,
      customer_phone text,
      special_instructions text,
      status text not null default 'pending',
      order_number text,
      total_amount numeric(10, 2) not null,
      service_fee numeric(10, 2) not null default 0,
      stripe_payment_intent_id text,
      payment_method text,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);

  await query('alter table bakery_orders add column if not exists order_number text');
  await query('alter table bakery_orders add column if not exists service_fee numeric(10, 2) not null default 0');
  await query('alter table bakery_orders add column if not exists stripe_payment_intent_id text');
  await query('alter table bakery_orders add column if not exists payment_method text');
  await query('alter table bakery_orders add column if not exists completed_at timestamptz');

  await query(`
    create table if not exists bakery_order_items (
      id serial primary key,
      order_id integer not null references bakery_orders(id) on delete cascade,
      menu_item_id integer not null references bakery_menu_items(id) on delete restrict,
      quantity integer not null,
      unit_price numeric(10, 2) not null,
      subtotal numeric(10, 2) not null
    )
  `);

  await query('create index if not exists bakery_menu_items_available_idx on bakery_menu_items(is_available)');
  await query('create index if not exists bakery_orders_status_idx on bakery_orders(status)');
  await query('create index if not exists bakery_orders_created_at_idx on bakery_orders(created_at)');
  await query('create unique index if not exists bakery_orders_order_number_idx on bakery_orders(order_number) where order_number is not null');

  console.log('PostgreSQL database is ready.');
}

main()
  .catch((error) => {
    console.error('Database initialisation failed:', error);
    process.exitCode = 1;
  })
  .finally(closePool);

