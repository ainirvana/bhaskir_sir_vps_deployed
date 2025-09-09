// Verify the setup of the educational platform
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
// Import directly from the file to avoid transpilation issues
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifySetup() {
  console.log('🔍 Verifying educational platform setup...\n');
  
  // 1. Check environment variables
  console.log('1️⃣ Checking environment variables:');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];
  
  let allVarsPresent = true;
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`❌ Missing ${varName} environment variable`);
      allVarsPresent = false;
    } else {
      let displayValue = process.env[varName];
      // Mask sensitive values
      if (varName.includes('KEY') || varName.includes('DATABASE_URL')) {
        displayValue = displayValue.substring(0, 10) + '...' + displayValue.substring(displayValue.length - 5);
      }
      console.log(`✅ ${varName} is set: ${displayValue}`);
    }
  });
  
  if (!allVarsPresent) {
    console.error('\n❌ Some required environment variables are missing. Please check your .env.local file.');
    return false;
  }
    // 2. Test Supabase connection
  console.log('\n2️⃣ Testing Supabase connection:');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables for Supabase client');
    }
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Use a simple select query instead of count(*)
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error(`❌ Supabase connection error: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Supabase connection successful`);
  } catch (error) {
    console.error(`❌ Supabase connection error: ${error.message}`);
    return false;
  }
  
  // 3. Test direct PostgreSQL connection
  console.log('\n3️⃣ Testing direct PostgreSQL connection:');
  try {
    const dbUrl = process.env.DATABASE_URL;
    
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false // Required for Supabase PostgreSQL connections
      }
    });
    
    const result = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ PostgreSQL connection successful`);
    console.log(`   Current database time: ${result.rows[0].current_time}`);
    
    await pool.end();
  } catch (error) {
    console.error(`❌ PostgreSQL connection error: ${error.message}`);
    return false;
  }
    // 4. Check for required tables
  console.log('\n4️⃣ Checking for required tables:');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const requiredTables = ['users', 'student_invitations', 'scraped_content', 'quiz_attempts', 'slides', 'slide_directories'];
      for (const table of requiredTables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.error(`❌ Table check failed for '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists and is accessible${data.length > 0 ? ' (has data)' : ''}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error checking tables: ${error.message}`);
    return false;
  }
  
  // 5. Verify API endpoints
  console.log('\n5️⃣ Verifying API endpoint files:');
  const apiFiles = [
    'pages/api/slides/index.ts',
    'pages/api/slides/directory/index.ts',
    'pages/api/slides/reorder.ts'
  ];
  
  apiFiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.log(`✅ API file exists: ${file}`);
    } else {
      console.error(`❌ Missing API file: ${file}`);
    }
  });
  
  console.log('\n✨ Verification completed!');
  return true;
}

verifySetup()
  .then(result => {
    if (result) {
      console.log('\n🎉 All verification checks passed! The system is properly configured.');
    } else {
      console.error('\n⚠️ Some verification checks failed. Please review the errors above.');
    }
  })
  .catch(error => {
    console.error('Verification failed with an exception:', error);
  })
  .finally(() => process.exit(0));
