#!/bin/bash

echo "🚀 Deploying Login and Student Management Fix..."

# Stop the current application
echo "Stopping current application..."
pm2 stop nextjs-app || true

# Install dependencies
echo "Installing dependencies..."
npm install

# Run the database fix
echo "Running database fixes..."
node fix-login-issue.js

# Build the application
echo "Building application..."
npm run build

# Start the application
echo "Starting application..."
pm2 start ecosystem.config.js

# Show status
echo "Application status:"
pm2 status

echo "✅ Deployment complete!"
echo ""
echo "🔑 Login Credentials:"
echo "Email: admin@eduplatform.com"
echo "Password: admin123"
echo ""
echo "Alternative:"
echo "Email: careerexp@admin.com" 
echo "Password: password"
echo ""
echo "🌐 Your application should now be accessible with working login and student management!"