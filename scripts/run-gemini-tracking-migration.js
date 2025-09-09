// Script to run the Gemini API tracking migration
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false // Required for Supabase PostgreSQL connections
  }
});

async function runMigration() {
  try {
    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'add-gemini-tracking.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL migration
    await pool.query(sqlContent);
    
    console.log('✅ Gemini API tracking migration completed successfully');
  } catch (error) {
    console.error('❌ Error running Gemini API tracking migration:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

runMigration();