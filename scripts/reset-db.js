require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function deleteAllData() {
  console.log('Deleting existing data...');
  
  // Delete in reverse order of dependencies
  const tables = ['quiz_attempts', 'student_invitations', 'scraped_content', 'users'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error && error.code !== 'PGRST116' && error.code !== '42P01') { 
        // PGRST116 and 42P01 mean table doesn't exist, which is fine
        console.error(`Error deleting from ${table}:`, error);
        throw error;
      }
      console.log(`Cleared table: ${table}`);
    } catch (error) {
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        console.error(`Error deleting from ${table}:`, error);
        throw error;
      }
    }
  }
}

async function createTables() {
  console.log('Creating tables...');

  try {
    // Create an admin user first
    console.log('Creating admin user...');
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .upsert([{
        firebase_uid: 'admin-test',
        email: 'admin@test.com',
        full_name: 'Test Administrator',
        role: 'admin'
      }])
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin user:', adminError);
      throw adminError;
    }

    const adminId = adminData.id;
    console.log('Created admin user with ID:', adminId);

    // Create a student user
    console.log('Creating student user...');
    const { data: studentData, error: studentError } = await supabase
      .from('users')
      .upsert([{
        firebase_uid: 'student-test',
        email: 'student@test.com',
        full_name: 'Test Student',
        role: 'student'
      }])
      .select()
      .single();

    if (studentError) {
      console.error('Error creating student user:', studentError);
      throw studentError;
    }

    const studentId = studentData.id;
    console.log('Created student user with ID:', studentId);

    // Create student invitation
    console.log('Creating student invitation...');
    const { error: inviteError } = await supabase
      .from('student_invitations')
      .upsert([{
        email: 'newstudent@test.com',
        invite_code: '123456',
        student_id: 'STU123',
        full_name: 'New Test Student',
        is_registered: false,
        invited_by: adminId
      }]);

    if (inviteError) {
      console.error('Error creating student invitation:', inviteError);
      throw inviteError;
    }    // Create sample content
    console.log('Creating sample content...');
    const { error: contentError } = await supabase
      .from('scraped_content')
      .upsert([{
        url: 'https://example.com/sample',
        title: 'Sample Educational Content',
        content: 'This is a sample educational content for testing purposes.',
        created_at: new Date().toISOString()
      }]);    if (contentError) {
      console.error('Error creating sample content:', JSON.stringify(contentError, null, 2));
      console.error('Specific error message:', contentError.message);
      throw contentError;
    }

    // Create quiz attempt
    console.log('Creating quiz attempt...');
    const { error: quizError } = await supabase
      .from('quiz_attempts')
      .upsert([{
        user_id: studentId,
        quiz_id: 'QUIZ-001',
        score: 85
      }]);

    if (quizError) {
      console.error('Error creating quiz attempt:', quizError);
      throw quizError;
    }

    console.log('All tables created successfully with sample data!');
  } catch (error) {
    console.error('Error in createTables:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting database initialization...');
    await deleteAllData();
    await createTables();
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();
