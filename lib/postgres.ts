// Database connection configuration for direct PostgreSQL access
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false // Required for Supabase PostgreSQL connections
  }
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err);
  } else {
    console.log('PostgreSQL connected at:', res.rows[0].now);
  }
});

export default pool;
