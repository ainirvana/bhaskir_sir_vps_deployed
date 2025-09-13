// Test VPS login functionality
const fetch = require('node-fetch');

async function testVPSLogin() {
  console.log('🧪 Testing VPS Login Functionality...\n');

  const testCredentials = [
    { email: 'admin@eduplatform.com', password: 'admin123' },
    { email: 'careerexp@admin.com', password: 'password' }
  ];

  for (const creds of testCredentials) {
    console.log(`Testing login for: ${creds.email}`);
    
    try {
      // Replace with your VPS URL
      const vpsUrl = 'http://your-vps-ip:3000'; // Update this with your actual VPS URL
      const localUrl = 'http://localhost:3000';
      
      const response = await fetch(`${localUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(creds)
      });

      const data = await response.json();
      
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, data);
      
      if (response.ok && data.success) {
        console.log('✅ Login successful!');
        console.log(`   User: ${data.user.full_name} (${data.user.role})`);
      } else {
        console.log('❌ Login failed:', data.error);
      }
      
    } catch (error) {
      console.log('❌ Network error:', error.message);
    }
    
    console.log('---\n');
  }
}

testVPSLogin();