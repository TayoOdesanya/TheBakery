import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export async function closePool() {
  await pool.end();
}
