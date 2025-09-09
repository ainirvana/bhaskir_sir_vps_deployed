const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkInvitationsTable() {
  try {
    console.log('Checking student_invitations table...\n');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'student_invitations'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ student_invitations table does not exist');
      console.log('Creating table...');
      
      await pool.query(`
        CREATE TABLE student_invitations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email TEXT NOT NULL,
          invitation_code TEXT NOT NULL,
          student_id TEXT NOT NULL,
          full_name TEXT NOT NULL,
          invited_by TEXT,
          is_used BOOLEAN DEFAULT false,
          is_password_reset BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      console.log('✅ Created student_invitations table');
    } else {
      console.log('✅ student_invitations table exists');
      
      // Show structure
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'student_invitations' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      console.log('Table structure:');
      columns.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkInvitationsTable();