const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function addPublishingColumns() {
  console.log('Adding publishing columns to database...');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Step 1: Add columns to gk_today_content
    console.log('Adding publishing columns to gk_today_content...');
    await pool.query(`
      ALTER TABLE gk_today_content 
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS published_by UUID;
    `);
    
    // Step 2: Check if scraped_content table exists and add columns
    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scraped_content'
      );
    `);
    
    if (rows[0].exists) {
      console.log('Adding publishing columns to scraped_content...');
      await pool.query(`
        ALTER TABLE scraped_content 
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS published_by UUID;
      `);
    }
    
    // Step 3: Create indexes
    console.log('Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_gk_today_published ON gk_today_content(is_published, created_at);
    `);
    
    if (rows[0].exists) {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_scraped_content_published ON scraped_content(is_published, created_at);
      `);
    }
    
    // Step 4: Update existing articles to be published by default
    console.log('Setting existing articles as published...');
    await pool.query(`
      UPDATE gk_today_content 
      SET is_published = TRUE, published_at = COALESCE(published_at, created_at)
      WHERE is_published IS NULL OR published_at IS NULL;
    `);
    
    if (rows[0].exists) {
      await pool.query(`
        UPDATE scraped_content 
        SET is_published = TRUE, published_at = COALESCE(published_at, created_at)
        WHERE is_published IS NULL OR published_at IS NULL;
      `);
    }
    
    console.log('✅ Publishing columns added successfully!');
    
    // Verify the changes
    console.log('\n📊 Verifying changes...');
    const gkResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'gk_today_content' AND column_name IN ('is_published', 'published_at', 'published_by')
      ORDER BY column_name;
    `);
    
    console.log('gk_today_content publishing columns:');
    gkResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    if (rows[0].exists) {
      const scrapedResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'scraped_content' AND column_name IN ('is_published', 'published_at', 'published_by')
        ORDER BY column_name;
      `);
      
      console.log('scraped_content publishing columns:');
      scrapedResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error adding publishing columns:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addPublishingColumns();