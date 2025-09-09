const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nukbivdxxzjwfoyjzblw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a2JpdmR4eHpqd2ZveWp6Ymx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE5OTY3MywiZXhwIjoyMDYzNzc1NjczfQ.fCvwOSvBXwkgB4D8Ie58Y0v4ZdV7nv8v4upR-kelKhs'
);

async function addPublishingColumn() {
  try {
    console.log('Adding is_published column to gk_today_content table...');
    
    // Add is_published column with default value true
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE gk_today_content 
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
        
        -- Update existing records to be published by default
        UPDATE gk_today_content 
        SET is_published = true 
        WHERE is_published IS NULL;
      `
    });

    if (alterError) {
      console.error('Error adding column:', alterError);
      return;
    }

    console.log('✅ Successfully added is_published column');
    
    // Verify the column was added
    const { data, error } = await supabase
      .from('gk_today_content')
      .select('id, title, is_published')
      .limit(3);
    
    if (error) {
      console.error('Error verifying column:', error);
    } else {
      console.log('✅ Column verification successful. Sample data:');
      console.log(data);
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

addPublishingColumn();