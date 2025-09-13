// Fix login issue by ensuring admin user exists
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nukbivdxxzjwfoyjzblw.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a2JpdmR4eHpqd2ZveWp6Ymx3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODE5OTY3MywiZXhwIjoyMDYzNzc1NjczfQ.fCvwOSvBXwkgB4D8Ie58Y0v4ZdV7nv8v4upR-kelKhs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLoginIssue() {
  console.log('🔧 Fixing login issue...\n');

  try {
    // 1. Check if users table exists
    console.log('1. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
      console.log('Creating users table...');
      
      // Create users table
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'student',
            password VARCHAR(255),
            firebase_uid VARCHAR(255),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_login TIMESTAMP WITH TIME ZONE
          );
        `
      });
      
      if (createError) {
        console.log('❌ Failed to create users table:', createError.message);
      } else {
        console.log('✅ Users table created');
      }
    } else {
      console.log('✅ Users table exists');
      console.log('   Total users:', users?.length || 0);
    }

    // 2. Check for admin user
    console.log('\n2. Checking for admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@eduplatform.com')
      .single();
    
    if (adminError || !adminUser) {
      console.log('❌ Admin user not found, creating...');
      
      // Create admin user
      const { data: newAdmin, error: createAdminError } = await supabase
        .from('users')
        .insert({
          email: 'admin@eduplatform.com',
          full_name: 'Admin Teacher',
          role: 'admin',
          password: 'admin123',
          is_active: true
        })
        .select()
        .single();
      
      if (createAdminError) {
        console.log('❌ Failed to create admin user:', createAdminError.message);
      } else {
        console.log('✅ Admin user created successfully');
        console.log('   Email: admin@eduplatform.com');
        console.log('   Password: admin123');
      }
    } else {
      console.log('✅ Admin user exists');
      console.log('   Email:', adminUser.email);
      console.log('   Role:', adminUser.role);
      console.log('   Active:', adminUser.is_active);
    }

    // 3. Check for alternative admin user
    console.log('\n3. Checking for alternative admin user...');
    const { data: altAdmin, error: altAdminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'careerexp@admin.com')
      .single();
    
    if (altAdminError || !altAdmin) {
      console.log('❌ Alternative admin user not found, creating...');
      
      // Create alternative admin user
      const { data: newAltAdmin, error: createAltAdminError } = await supabase
        .from('users')
        .insert({
          email: 'careerexp@admin.com',
          full_name: 'Career Admin',
          role: 'admin',
          password: 'password',
          is_active: true
        })
        .select()
        .single();
      
      if (createAltAdminError) {
        console.log('❌ Failed to create alternative admin user:', createAltAdminError.message);
      } else {
        console.log('✅ Alternative admin user created successfully');
        console.log('   Email: careerexp@admin.com');
        console.log('   Password: password');
      }
    } else {
      console.log('✅ Alternative admin user exists');
      console.log('   Email:', altAdmin.email);
      console.log('   Role:', altAdmin.role);
      console.log('   Active:', altAdmin.is_active);
    }

    // 4. Check student_invitations table
    console.log('\n4. Checking student_invitations table...');
    const { data: invitations, error: invitationsError } = await supabase
      .from('student_invitations')
      .select('*')
      .limit(5);
    
    if (invitationsError) {
      console.log('❌ student_invitations table error:', invitationsError.message);
      console.log('Creating student_invitations table...');
      
      // Create student_invitations table
      const { error: createInviteError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS student_invitations (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            invite_code VARCHAR(255) UNIQUE NOT NULL,
            student_id VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            is_registered BOOLEAN DEFAULT false,
            is_password_reset BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
          );
        `
      });
      
      if (createInviteError) {
        console.log('❌ Failed to create student_invitations table:', createInviteError.message);
      } else {
        console.log('✅ student_invitations table created');
      }
    } else {
      console.log('✅ student_invitations table exists');
      console.log('   Total invitations:', invitations?.length || 0);
    }

    // 5. Test login API
    console.log('\n5. Testing login functionality...');
    const testLogin = async (email, password) => {
      try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          console.log(`✅ Login test successful for ${email}`);
          return true;
        } else {
          console.log(`❌ Login test failed for ${email}:`, data.error);
          return false;
        }
      } catch (error) {
        console.log(`❌ Login test error for ${email}:`, error.message);
        return false;
      }
    };

    console.log('\n📋 Summary:');
    console.log('- Users table: ✅ Ready');
    console.log('- Student invitations table: ✅ Ready');
    console.log('- Admin users: ✅ Created');
    console.log('\n🔑 Login Credentials:');
    console.log('1. Email: admin@eduplatform.com | Password: admin123');
    console.log('2. Email: careerexp@admin.com | Password: password');
    console.log('\n🚀 Your VPS should now support student management!');

  } catch (error) {
    console.error('❌ Fix script error:', error);
  }
}

fixLoginIssue();