const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nukbivdxxzjwfoyjzblw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a2JpdmR4eHpqd2ZveWp6Ymx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE5OTY3MywiZXhwIjoyMDYzNzc1NjczfQ.fCvwOSvBXwkgB4D8Ie58Y0v4ZdV7nv8v4upR-kelKhs'
);

async function testPublishing() {
  try {
    console.log('Testing article publishing functionality...');
    
    // Get a sample article
    const { data: articles, error: fetchError } = await supabase
      .from('gk_today_content')
      .select('id, title, is_published')
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      return;
    }
    
    if (!articles || articles.length === 0) {
      console.log('No articles found to test with');
      return;
    }
    
    const testArticle = articles[0];
    console.log('Testing with article:', testArticle.title);
    console.log('Current published status:', testArticle.is_published);
    
    // Toggle the published status
    const newStatus = !testArticle.is_published;
    console.log('Changing published status to:', newStatus);
    
    const { data: updatedArticle, error: updateError } = await supabase
      .from('gk_today_content')
      .update({
        is_published: newStatus,
        published_at: newStatus ? new Date().toISOString() : null
      })
      .eq('id', testArticle.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating article:', updateError);
      return;
    }
    
    console.log('✅ Article updated successfully!');
    console.log('New status:', updatedArticle.is_published);
    console.log('Published at:', updatedArticle.published_at);
    
    // Test fetching published articles
    console.log('\nTesting published articles fetch...');
    const { data: publishedArticles, error: publishedError } = await supabase
      .from('gk_today_content')
      .select('id, title, is_published, published_at')
      .eq('is_published', true)
      .limit(5);
    
    if (publishedError) {
      console.error('Error fetching published articles:', publishedError);
      return;
    }
    
    console.log(`✅ Found ${publishedArticles.length} published articles:`);
    publishedArticles.forEach(article => {
      console.log(`- ${article.title} (Published: ${article.published_at})`);
    });
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testPublishing();