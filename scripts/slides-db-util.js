// Utility for managing slides in the database
const dotenv = require('dotenv');
const path = require('path');
const { createServerClient } = require('../lib/supabase');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Available commands
const commands = {
  list: listSlides,
  listDirs: listDirectories,
  createDir: createDirectory,
  createSlide: createSlide,
  delete: deleteItem,
  help: showHelp
};

async function main() {
  const command = process.argv[2]?.toLowerCase();
  
  if (!command || !commands[command]) {
    showHelp();
    return;
  }
  
  try {
    await commands[command](...process.argv.slice(3));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function listSlides(directoryId) {
  const supabase = createServerClient();
  let query = supabase.from('slides').select('*');
  
  if (directoryId) {
    query = query.eq('directory_id', directoryId);
  }
  
  query = query.order('slide_order', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to list slides: ${error.message}`);
  }
  
  if (data.length === 0) {
    console.log(directoryId 
      ? `No slides found in directory ${directoryId}`
      : 'No slides found in database');
    return;
  }
  
  console.log(`Found ${data.length} slides:`);
  data.forEach((slide, index) => {
    console.log(`${index+1}. [${slide.id.slice(0,8)}...] ${slide.title} (Order: ${slide.slide_order}, Published: ${slide.is_published})`);
  });
}

async function listDirectories() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('slide_directories')
    .select(`
      *,
      slides:slides(count)
    `)
    .order('directory_order', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to list directories: ${error.message}`);
  }
  
  if (data.length === 0) {
    console.log('No directories found in database');
    return;
  }
  
  console.log(`Found ${data.length} directories:`);
  data.forEach((dir, index) => {
    console.log(`${index+1}. [${dir.id.slice(0,8)}...] ${dir.name} (${dir.slides?.[0]?.count || 0} slides, Published: ${dir.is_published})`);
  });
}

async function createDirectory(name, description = '') {
  if (!name) {
    throw new Error('Directory name is required');
  }
  
  const supabase = createServerClient();
  
  // Get the next directory order
  const { data: lastDirectory } = await supabase
    .from('slide_directories')
    .select('directory_order')
    .order('directory_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastDirectory?.directory_order || 0) + 1;
  
  const { data, error } = await supabase
    .from('slide_directories')
    .insert([
      {
        name: name.trim(),
        description: description.trim(),
        directory_order: nextOrder,
        is_published: false,
      },
    ])
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create directory: ${error.message}`);
  }
  
  console.log(`Directory created successfully:`);
  console.log(`- ID: ${data.id}`);
  console.log(`- Name: ${data.name}`);
}

async function createSlide(directoryId, title, bodyContent = '') {
  if (!directoryId || !title) {
    throw new Error('Directory ID and title are required');
  }
  
  const supabase = createServerClient();
  
  // Get the next slide order
  const { data: lastSlide } = await supabase
    .from('slides')
    .select('slide_order')
    .eq('directory_id', directoryId)
    .order('slide_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (lastSlide?.slide_order || 0) + 1;
  
  const { data, error } = await supabase
    .from('slides')
    .insert([
      {
        title: title.trim(),
        body_content: bodyContent,
        directory_id: directoryId,
        slide_order: nextOrder,
        is_published: false,
      },
    ])
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create slide: ${error.message}`);
  }
  
  console.log(`Slide created successfully:`);
  console.log(`- ID: ${data.id}`);
  console.log(`- Title: ${data.title}`);
}

async function deleteItem(type, id) {
  if (!type || !id || !['slide', 'directory'].includes(type)) {
    throw new Error('Type (slide or directory) and ID are required');
  }
  
  const supabase = createServerClient();
  
  if (type === 'slide') {
    const { error } = await supabase
      .from('slides')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new Error(`Failed to delete slide: ${error.message}`);
    }
    
    console.log(`Slide ${id} deleted successfully`);
  } else {
    // First delete all slides in the directory
    const { error: slidesDeletionError } = await supabase
      .from('slides')
      .delete()
      .eq('directory_id', id);

    if (slidesDeletionError) {
      throw new Error(`Failed to delete slides in directory: ${slidesDeletionError.message}`);
    }

    // Then delete the directory
    const { error: directoryDeletionError } = await supabase
      .from('slide_directories')
      .delete()
      .eq('id', id);

    if (directoryDeletionError) {
      throw new Error(`Failed to delete directory: ${directoryDeletionError.message}`);
    }
    
    console.log(`Directory ${id} and all its slides deleted successfully`);
  }
}

function showHelp() {
  console.log(`
Slides Database Management Utility

Usage:
  node slides-db-util.js [command] [options]

Commands:
  list [directoryId]    List all slides, optionally filtered by directory ID
  listDirs              List all slide directories
  createDir <name> [description]  Create a new slide directory
  createSlide <directoryId> <title> [bodyContent]  Create a new slide
  delete <type> <id>    Delete a slide or directory (type: 'slide' or 'directory')
  help                  Show this help message
  
Examples:
  node slides-db-util.js listDirs
  node slides-db-util.js list 12345678-1234-1234-1234-123456789012
  node slides-db-util.js createDir "Introduction to JavaScript"
  node slides-db-util.js createSlide 12345678-1234-1234-1234-123456789012 "Variables and Data Types"
  node slides-db-util.js delete slide 12345678-1234-1234-1234-123456789012
  `);
}

main().catch(console.error);
