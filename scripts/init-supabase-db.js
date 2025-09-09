// Script to initialize Supabase database with necessary tables and data
const { createServerClient } = require('../lib/supabase');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function initializeDatabase() {
  const supabase = createServerClient();

  try {
    console.log('Checking database connection...');
    
    // Check core tables
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
      
    if (usersError) {
      console.log('Core tables missing. Initializing core tables...');
      
      // Run the core tables initialization SQL
      const initSql = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');
      const { error: initError } = await supabase.rpc('exec_sql', { sql: initSql });
      
      if (initError) {
        console.error('Error initializing core tables:', initError);
      } else {
        console.log('Core tables initialized successfully.');
      }
    } else {
      console.log('Core tables exist. Users count:', usersData[0]?.count);
    }
    
    // Check slide tables
    const { data: slidesData, error: slidesError } = await supabase
      .from('slides')
      .select('count(*)')
      .limit(1);
      
    if (slidesError) {
      console.log('Slide tables missing. Initializing slide tables...');
      
      // Run the slide tables initialization SQL
      const slidesSql = fs.readFileSync(path.join(__dirname, 'init-slides-db.sql'), 'utf8');
      const { error: slidesInitError } = await supabase.rpc('exec_sql', { sql: slidesSql });
      
      if (slidesInitError) {
        console.error('Error initializing slide tables:', slidesInitError);
      } else {
        console.log('Slide tables initialized successfully.');
      }
    } else {
      console.log('Slide tables exist. Slides count:', slidesData[0]?.count);
    }
    
    console.log('Database initialization completed.');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    process.exit(0);
  }
}

initializeDatabase();
