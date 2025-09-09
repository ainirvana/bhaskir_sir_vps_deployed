// Test script to verify demo accounts work
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { createClient } = require('@supabase/supabase-js');

const firebaseConfig = {
  apiKey: "AIzaSyCcAdZGtJ1D6oyCI3ryA8TGZ5jUsn3nJyk",
  authDomain: "gk-platform-3f57b.firebaseapp.com", 
  projectId: "gk-platform-3f57b",
  storageBucket: "gk-platform-3f57b.firebasestorage.app",
  messagingSenderId: "530490849065",
  appId: "1:530490849065:web:2d225fbbb021f705822938",
  measurementId: "G-8WXGQ3V0KR"
};

const supabaseUrl = 'https://nukbivdxxzjwfoyjzblw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51a2JpdmR4eHpqd2ZveWp6Ymx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTk2NzMsImV4cCI6MjA2Mzc3NTY3M30.pPmZTX8WRXaj6ek64Mh6AkgocdVPpVLqXZsvXHZlK4c';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  try {
    console.log('Testing admin login...');
    
    // Test Firebase login
    const userCredential = await signInWithEmailAndPassword(auth, 'admin@eduplatform.com', 'admin123');
    console.log('✅ Firebase login successful');
    console.log('User ID:', userCredential.user.uid);
    
    // Test Supabase profile lookup
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('firebase_uid', userCredential.user.uid)
      .single();
      
    if (error) {
      console.log('❌ Supabase profile lookup error:', error);
      
      // Try by email
      const { data: profileByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'admin@eduplatform.com')
        .single();
        
      if (emailError) {
        console.log('❌ Supabase profile lookup by email error:', emailError);
      } else {
        console.log('✅ Supabase profile found by email:', profileByEmail);
      }
    } else {
      console.log('✅ Supabase profile found by firebase_uid:', profile);
    }
    
    await auth.signOut();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testLogin();
