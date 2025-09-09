const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nukbivdxxzjwfoyjzblw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a2JpdmR4eHpqd2ZveWp6Ymx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE5OTY3MywiZXhwIjoyMDYzNzc1NjczfQ.fCvwOSvBXwkgB4D8Ie58Y0v4ZdV7nv8v4upR-kelKhs'
);

async function fixPublishingSchema() {
  try {
    console.log('Checking current schema...');
    
    // First, let's check what columns exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('gk_today_content')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('Error checking schema:', sampleError);
      return;
    }
    
    console.log('Current columns:', Object.keys(sampleData[0] || {}));
    
    // Check if is_published column exists
    const hasPublishedColumn = sampleData[0] && 'is_published' in sampleData[0];
    
    if (!hasPublishedColumn) {
      console.log('is_published column not found. Attempting to add it...');
      
      // Try to update a record to add the column (this will fail if column doesn't exist)
      const { error: updateError } = await supabase
        .from('gk_today_content')
        .update({ is_published: true })
        .eq('id', 'non-existent-id'); // This will fail but might give us info
      
      console.log('Update attempt result:', updateError?.message);
    } else {
      console.log('✅ is_published column already exists');
    }
    
    // Let's try to get all articles and see their structure
    const { data: articles, error: articlesError } = await supabase
      .from('gk_today_content')
      .select('id, title, is_published')
      .limit(5);
    
    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
    } else {
      console.log('Sample articles:');
      console.log(articles);
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

fixPublishingSchema();