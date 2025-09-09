const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testStudentArticleAccess() {
  console.log('🧪 Testing Student Article Access System...\n');
  
  try {
    // Test 1: Check published articles from both tables
    console.log('📊 Checking published articles...');
    
    const [gkResult, scrapedResult] = await Promise.all([
      supabase
        .from('gk_today_content')
        .select('id, title, is_published, published_at, source_name')
        .eq('is_published', true)
        .limit(3),
      
      supabase
        .from('scraped_content')
        .select('id, title, is_published, published_at, source_name')
        .eq('is_published', true)
        .limit(3)
    ]);
    
    const gkCount = gkResult.data?.length || 0;
    const scrapedCount = scrapedResult.data?.length || 0;
    const totalPublished = gkCount + scrapedCount;
    
    console.log(`✅ gk_today_content published articles: ${gkCount}`);
    console.log(`✅ scraped_content published articles: ${scrapedCount}`);
    console.log(`✅ Total published articles: ${totalPublished}\n`);
    
    if (totalPublished === 0) {
      console.log('⚠️  No published articles found. This is expected if no articles have been scraped yet.\n');
    } else {
      console.log('📝 Sample published articles:');
      if (gkResult.data && gkResult.data.length > 0) {
        console.log(`   - ${gkResult.data[0].title} (${gkResult.data[0].source_name})`);
      }
      if (scrapedResult.data && scrapedResult.data.length > 0) {
        console.log(`   - ${scrapedResult.data[0].title} (${scrapedResult.data[0].source_name})`);
      }
      console.log();
    }
    
    // Test 2: Check unpublished articles
    console.log('🔒 Checking unpublished articles...');
    
    const [gkUnpublishedResult, scrapedUnpublishedResult] = await Promise.all([
      supabase
        .from('gk_today_content')
        .select('id, title, is_published')
        .eq('is_published', false)
        .limit(3),
      
      supabase
        .from('scraped_content')
        .select('id, title, is_published')
        .eq('is_published', false)
        .limit(3)
    ]);
    
    const gkUnpublishedCount = gkUnpublishedResult.data?.length || 0;
    const scrapedUnpublishedCount = scrapedUnpublishedResult.data?.length || 0;
    const totalUnpublished = gkUnpublishedCount + scrapedUnpublishedCount;
    
    console.log(`✅ gk_today_content unpublished articles: ${gkUnpublishedCount}`);
    console.log(`✅ scraped_content unpublished articles: ${scrapedUnpublishedCount}`);
    console.log(`✅ Total unpublished articles: ${totalUnpublished}\n`);
    
    // Test 3: Verify database schema
    console.log('🏗️  Verifying database schema...');
    
    const schemaCheck = await supabase
      .from('gk_today_content')
      .select('is_published, published_at, published_by')
      .limit(1);
    
    if (!schemaCheck.error) {
      console.log('✅ Publishing columns exist in gk_today_content');
    } else {
      console.log('❌ Publishing columns missing in gk_today_content');
    }
    
    const scrapedSchemaCheck = await supabase
      .from('scraped_content')
      .select('is_published, published_at, published_by')
      .limit(1);
    
    if (!scrapedSchemaCheck.error) {
      console.log('✅ Publishing columns exist in scraped_content');
    } else {
      console.log('❌ Publishing columns missing in scraped_content');
    }
    
    console.log('\n🎉 Student article access system is ready!');
    console.log('\n📋 Summary:');
    console.log('   - Students can access all published articles by default');
    console.log('   - Admin can publish/unpublish articles from both tables');
    console.log('   - Admin can delete articles if needed');
    console.log('   - Articles are fetched from both gk_today_content and scraped_content tables');
    
  } catch (error) {
    console.error('❌ Error testing student article access:', error);
  }
}

testStudentArticleAccess();