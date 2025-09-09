// Script to create demo accounts for testing
// Run this with: node scripts/create-demo-accounts.js

const { createClient } = require('@supabase/supabase-js');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');

// You'll need to set these environment variables or update with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Firebase Admin (you'll need to set up service account)
if (!getApps().length) {
  // You'll need to provide your Firebase service account key
  // initializeApp({
  //   credential: admin.credential.cert({
  //     // Your Firebase service account credentials
  //   })
  // });
}

async function createDemoAccounts() {
  try {
    console.log('Creating demo accounts...');

    // Demo accounts to create
    const demoAccounts = [
      {
        email: 'admin@eduplatform.com',
        password: 'admin123',
        role: 'admin',
        full_name: 'Demo Administrator',
        display_name: 'Admin Demo'
      },
      {
        email: 'student@eduplatform.com',
        password: 'student123',
        role: 'student',
        full_name: 'Demo Student',
        display_name: 'Student Demo'
      }
    ];

    for (const account of demoAccounts) {
      console.log(`Creating ${account.role} account: ${account.email}`);
      
      // Check if user already exists in Supabase
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', account.email)
        .single();

      if (existingUser) {
        console.log(`User ${account.email} already exists, skipping...`);
        continue;
      }

      // For now, just create the user profile in Supabase
      // In a real setup, you'd also create the Firebase user
      const { data, error } = await supabase
        .from('users')
        .insert([{
          email: account.email,
          role: account.role,
          full_name: account.full_name,
          display_name: account.display_name,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${account.email}:`, error);
      } else {
        console.log(`✓ Created ${account.role} profile for ${account.email}`);
      }
    }

    console.log('\nDemo account setup complete!');
    console.log('\nNote: You still need to create these accounts in Firebase Auth manually or set up Firebase Admin SDK properly.');
    console.log('\nDemo Credentials:');
    console.log('Admin: admin@eduplatform.com / admin123');
    console.log('Student: student@eduplatform.com / student123');

  } catch (error) {
    console.error('Error creating demo accounts:', error);
  }
}

createDemoAccounts();
