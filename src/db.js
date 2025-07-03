import pkg from 'pg';
import dotenv from "dotenv";
const { Pool } = pkg;

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'snapreserve',
    password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5433,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}); 


pool.query('SELECT NOW()')
  .then(() => console.log('✅ PostgreSQL connected successfully!'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

export default pool;
