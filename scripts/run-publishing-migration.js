const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  console.log('Adding publishing schema to database...');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-publishing-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Publishing schema added successfully!');
    
    // Verify the changes
    console.log('\n📊 Verifying tables...');
    
    const tables = ['gk_today_content', 'quizzes', 'presentations', 'admin_activity_log'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`\n✅ Table "${table}" structure:`);
        result.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
      } else {
        console.log(`\n❌ Table "${table}" not found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
