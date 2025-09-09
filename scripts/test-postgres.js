// Test the direct PostgreSQL connection to Supabase
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function testConnection() {
  console.log('Testing connection to PostgreSQL database...');
  console.log(`Connection string: ${dbUrl.replace(/(:.*@)/g, ':***@')}`);
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase PostgreSQL connections
    }
  });

  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Connection successful!');
    console.log('Current database time:', result.rows[0].current_time);

    // Check for tables
    console.log('\nChecking for tables in database:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('No tables found in public schema.');
    } else {
      console.log('Tables found in database:');
      tables.rows.forEach((table, i) => {
        console.log(`${i+1}. ${table.table_name}`);
      });
    }

    // Test for existence of specific tables
    const usersTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const slidesTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'slides'
      );
    `);
    
    console.log('\nTable status:');
    console.log(`- users table: ${usersTable.rows[0].exists ? 'exists' : 'missing'}`);
    console.log(`- slides table: ${slidesTable.rows[0].exists ? 'exists' : 'missing'}`);
    
  } catch (err) {
    console.error('Connection error:', err.message);
  } finally {
    await pool.end();
    console.log('\nConnection test completed.');
  }
}

testConnection();
