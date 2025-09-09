// Get base64 encoded SQL for running in Supabase
const fs = require('fs');
const path = require('path');

const cleanupSQL = fs.readFileSync(path.join(__dirname, 'cleanup-db.sql'), 'utf8');
const initSQL = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');

console.log('\nCleanup SQL in base64:');
console.log(Buffer.from(cleanupSQL).toString('base64'));

console.log('\nInit SQL in base64:');
console.log(Buffer.from(initSQL).toString('base64'));
