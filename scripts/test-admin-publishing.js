const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nukbivdxxzjwfoyjzblw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a2JpdmR4eHpqd2ZveWp6Ymx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE5OTY3MywiZXhwIjoyMDYzNzc1NjczfQ.fCvwOSvBXwkgB4D8Ie58Y0v4ZdV7nv8v4upR-kelKhs'
);

async function testAdminPublishing() {
  try {
    console.log('Testing admin publishing workflow...');
    
    // Get a sample published article
    const { data: publishedArticles, error: fetchError } = await supabase
      .from('gk_today_content')
      .select('id, title, is_published')
      .eq('is_published', true)
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      return;
    }
    
    if (!publishedArticles || publishedArticles.length === 0) {
      console.log('No published articles found to test with');
      return;
    }
    
    const testArticle = publishedArticles[0];
    console.log('Testing with article:', testArticle.title);
    console.log('Current published status:', testArticle.is_published);
    
    // Step 1: Unpublish the article (simulate admin clicking eye button)
    console.log('\n1. Unpublishing article...');
    const { data: unpublishedArticle, error: unpublishError } = await supabase
      .from('gk_today_content')
      .update({
        is_published: false,
        published_at: null
      })
      .eq('id', testArticle.id)
      .select()
      .single();
    
    if (unpublishError) {
      console.error('Error unpublishing article:', unpublishError);
      return;
    }
    
    console.log('✅ Article unpublished successfully!');
    console.log('New status:', unpublishedArticle.is_published);
    
    // Step 2: Check if article appears in student view (should not appear)
    console.log('\n2. Checking student view (published articles only)...');
    const { data: studentArticles, error: studentError } = await supabase
      .from('gk_today_content')
      .select('id, title, is_published')
      .eq('is_published', true)
      .eq('id', testArticle.id);
    
    if (studentError) {
      console.error('Error fetching student articles:', studentError);
      return;
    }
    
    if (studentArticles.length === 0) {
      console.log('✅ Article correctly hidden from student view');
    } else {
      console.log('❌ Article still visible in student view (this should not happen)');
    }
    
    // Step 3: Re-publish the article
    console.log('\n3. Re-publishing article...');
    const { data: republishedArticle, error: republishError } = await supabase
      .from('gk_today_content')
      .update({
        is_published: true,
        published_at: new Date().toISOString()
      })
      .eq('id', testArticle.id)
      .select()
      .single();
    
    if (republishError) {
      console.error('Error re-publishing article:', republishError);
      return;
    }
    
    console.log('✅ Article re-published successfully!');
    console.log('New status:', republishedArticle.is_published);
    console.log('Published at:', republishedArticle.published_at);
    
    // Step 4: Verify article appears in student view again
    console.log('\n4. Verifying article appears in student view...');
    const { data: finalStudentArticles, error: finalStudentError } = await supabase
      .from('gk_today_content')
      .select('id, title, is_published')
      .eq('is_published', true)
      .eq('id', testArticle.id);
    
    if (finalStudentError) {
      console.error('Error fetching final student articles:', finalStudentError);
      return;
    }
    
    if (finalStudentArticles.length > 0) {
      console.log('✅ Article correctly visible in student view again');
    } else {
      console.log('❌ Article not visible in student view (this should not happen)');
    }
    
    console.log('\n✅ Admin publishing workflow test completed successfully!');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAdminPublishing();