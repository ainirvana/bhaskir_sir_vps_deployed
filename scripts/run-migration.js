// Script to run SQL migration on the Supabase PostgreSQL database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  console.log('Running database migration...');
  console.log(`Connection string: ${dbUrl.replace(/(:.*@)/g, ':***@')}`);
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase PostgreSQL connections
    }
  });

  try {
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrate-supabase-db.sql'), 'utf8');
    
    console.log('Executing SQL migration...');
    
    // Execute the migration SQL
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables
    console.log('\nVerifying database tables:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Tables in database:');
    tables.rows.forEach((table, i) => {
      console.log(`${i+1}. ${table.table_name}`);
    });
    
    // Verify slides table schema
    const slidesColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'slides'
      ORDER BY ordinal_position
    `);
    
    console.log('\nSlides table schema:');
    slidesColumns.rows.forEach((column) => {
      console.log(`- ${column.column_name}: ${column.data_type}`);
    });
    
    // Verify sample data
    const usersCount = await pool.query(`SELECT COUNT(*) FROM users`);
    console.log(`\nUsers count: ${usersCount.rows[0].count}`);
    
  } catch (err) {
    console.error('Migration error:', err.message);
    if (err.position) {
      // Get the line number and context
      const lines = migrationSQL.substring(0, err.position).split('\n');
      const lineNumber = lines.length;
      
      console.error(`Error near line ${lineNumber}:`);
      console.error(lines[lines.length - 1]);
    }
  } finally {
    await pool.end();
  }
}

runMigration()
  .then(() => console.log('Migration script completed'))
  .catch(err => console.error('Fatal error:', err))
  .finally(() => process.exit(0));
