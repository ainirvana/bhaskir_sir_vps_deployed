// Script to import scraped content into the database
const { createServerClient } = require('../lib/supabase');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Imports scraped content from JSON files into the database
 */
async function importScrapedContent() {
  const supabase = createServerClient();
  const adminUserId = process.env.ADMIN_USER_ID; // Set this in .env.local
  
  if (!adminUserId) {
    console.warn('⚠️ ADMIN_USER_ID not set in .env.local, using default admin user.');
    
    // Try to get the admin user ID from the database
    const { data: adminUser, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();
      
    if (error || !adminUser) {
      console.error('❌ No admin user found in the database. Content will not be linked to a user.');
    } else {
      console.log(`✅ Using admin user: ${adminUser.id}`);
      adminUserId = adminUser.id;
    }
  }
  
  try {
    const contentDir = path.join(__dirname, '../data/scraped');
    
    // Check if directory exists
    if (!fs.existsSync(contentDir)) {
      console.log('Creating data directory...');
      fs.mkdirSync(contentDir, { recursive: true });
      
      // Create a sample JSON file
      const sampleData = [
        {
          url: 'https://example.com/sample-article',
          title: 'Sample Scraped Content',
          content: 'This is sample content that would normally be scraped from a website.'
        }
      ];
      
      fs.writeFileSync(
        path.join(contentDir, 'sample-content.json'), 
        JSON.stringify(sampleData, null, 2)
      );
      
      console.log('Created sample data file at data/scraped/sample-content.json');
      console.log('Please add your scraped content as JSON files in this directory.');
      return;
    }
    
    // Get all JSON files in directory
    const files = fs.readdirSync(contentDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('No JSON files found in data/scraped directory.');
      return;
    }
    
    console.log(`Found ${files.length} JSON files to import.`);
    
    // Process each file
    for (const file of files) {
      const filePath = path.join(contentDir, file);
      console.log(`Processing ${file}...`);
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let jsonContent;
      
      try {
        jsonContent = JSON.parse(fileContent);
      } catch (e) {
        console.error(`Failed to parse ${file} as JSON:`, e);
        continue;
      }
      
      // Handle both array and single object formats
      const contentItems = Array.isArray(jsonContent) ? jsonContent : [jsonContent];
      
      for (const item of contentItems) {
        // Validate required fields
        if (!item.url || !item.content) {
          console.warn(`Skipping item in ${file}: missing required fields (url and content)`);
          continue;
        }
        
        // Check if this URL already exists
        const { data: existing, error: checkError } = await supabase
          .from('scraped_content')
          .select('id')
          .eq('url', item.url)
          .limit(1);
          
        if (checkError) {
          console.error(`Error checking for existing content:`, checkError);
          continue;
        }
        
        // If it exists, update it
        if (existing && existing.length > 0) {
          const { error: updateError } = await supabase
            .from('scraped_content')
            .update({
              title: item.title || 'Untitled Content',
              content: item.content,
              updated_at: new Date().toISOString()
            })
            .eq('url', item.url);
            
          if (updateError) {
            console.error(`Error updating content:`, updateError);
          } else {
            console.log(`✅ Updated content from ${item.url}`);
          }
        } 
        // Otherwise insert it
        else {
          const { error: insertError } = await supabase
            .from('scraped_content')
            .insert({
              url: item.url,
              title: item.title || 'Untitled Content',
              content: item.content,
              created_by: adminUserId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`Error inserting content:`, insertError);
          } else {
            console.log(`✅ Imported content from ${item.url}`);
          }
        }
      }
      
      console.log(`Completed processing ${file}`);
    }
    
    console.log('Import completed.');
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

importScrapedContent().then(() => process.exit(0));
