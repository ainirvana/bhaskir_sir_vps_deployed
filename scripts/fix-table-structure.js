// Script to validate and update table columns in database
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

async function validateAndFixTables() {
  console.log('Validating database table structure...');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase PostgreSQL connections
    }
  });

  try {
    // Check if slides table exists
    const slidesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'slides'
      );
    `);

    if (!slidesExists.rows[0].exists) {
      console.log('Creating slides table...');
      await pool.query(`
        CREATE TABLE slides (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          content TEXT,
          body_content TEXT,
          image_url TEXT,
          type TEXT DEFAULT 'standard',
          slide_order INTEGER NOT NULL DEFAULT 0,
          is_published BOOLEAN NOT NULL DEFAULT false,
          directory_id UUID,
          created_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      console.log('Slides table created successfully.');
    } else {
      console.log('Slides table exists, checking structure...');
      
      // Check if body_content column exists in slides table
      const bodyContentExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'slides'
          AND column_name = 'body_content'
        );
      `);
      
      if (!bodyContentExists.rows[0].exists) {
        console.log('Adding body_content column to slides table...');
        await pool.query(`ALTER TABLE slides ADD COLUMN body_content TEXT;`);
        console.log('Column added successfully.');
      }
    }
    
    // Check if slide_directories table exists
    const directoriesExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'slide_directories'
      );
    `);
    
    if (!directoriesExists.rows[0].exists) {
      console.log('Creating slide_directories table...');
      await pool.query(`
        CREATE TABLE slide_directories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          directory_order INTEGER NOT NULL DEFAULT 0,
          is_published BOOLEAN NOT NULL DEFAULT false,
          created_by UUID,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      console.log('Slide_directories table created successfully.');
      
      // Add foreign key constraint if both tables exist
      await pool.query(`
        ALTER TABLE slides 
        ADD CONSTRAINT fk_directory_id 
        FOREIGN KEY (directory_id) 
        REFERENCES slide_directories(id)
        ON DELETE CASCADE;
      `);
      console.log('Foreign key constraint added.');
    }
    
    console.log('Database structure validation complete.');
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

validateAndFixTables();
