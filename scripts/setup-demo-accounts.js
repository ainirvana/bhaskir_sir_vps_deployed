const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require('firebase/auth');
const { createClient } = require('@supabase/supabase-js');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCcAdZGtJ1D6oyCI3ryA8TGZ5jUsn3nJyk",
  authDomain: "gk-platform-3f57b.firebaseapp.com",
  projectId: "gk-platform-3f57b",
  storageBucket: "gk-platform-3f57b.firebasestorage.app",
  messagingSenderId: "530490849065",
  appId: "1:530490849065:web:2d225fbbb021f705822938",
  measurementId: "G-8WXGQ3V0KR"
};

// Supabase config
const supabaseUrl = 'https://nukbivdxxzjwfoyjzblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a2JpdmR4eHpqd2ZveWp6Ymx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTk2NzMsImV4cCI6MjA2Mzc3NTY3M30.pPmZTX8WRXaj6ek64Mh6AkgocdVPpVLqXZsvXHZlK4c';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDemoAccounts() {
  const demoAccounts = [
    {
      email: 'admin@eduplatform.com',
      password: 'admin123',
      fullName: 'Admin Teacher',
      role: 'admin'
    },
    {
      email: 'student@eduplatform.com',
      password: 'student123',
      fullName: 'Demo Student',
      role: 'student'
    }
  ];

  for (const account of demoAccounts) {
    try {
      console.log(`Setting up ${account.role}: ${account.email}`);
      
      // Try to create the Firebase account
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, account.email, account.password);
        console.log(`Created Firebase account for ${account.email}`);
      } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
          console.log(`Firebase account already exists for ${account.email}`);
          // Sign in to get the user credential
          userCredential = await signInWithEmailAndPassword(auth, account.email, account.password);
        } else {
          console.error(`Error creating Firebase account for ${account.email}:`, error);
          continue;
        }
      }

      // Check if user profile exists in Supabase
      const { data: existingProfile, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('email', account.email)
        .single();

      if (existingProfile) {
        console.log(`Supabase profile already exists for ${account.email}`);
        // Update the firebase_uid if it's missing
        if (!existingProfile.firebase_uid) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ firebase_uid: userCredential.user.uid })
            .eq('email', account.email);
          
          if (updateError) {
            console.error(`Error updating firebase_uid for ${account.email}:`, updateError);
          } else {
            console.log(`Updated firebase_uid for ${account.email}`);
          }
        }
      } else {
        // Create user profile in Supabase
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            email: account.email,
            firebase_uid: userCredential.user.uid,
            full_name: account.fullName,
            role: account.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating Supabase profile for ${account.email}:`, createError);
        } else {
          console.log(`Created Supabase profile for ${account.email}`);
        }
      }

    } catch (error) {
      console.error(`Error setting up account ${account.email}:`, error);
    }
  }

  console.log('Demo account setup complete!');
  process.exit(0);
}

setupDemoAccounts().catch(console.error);
