#!/bin/bash

# Educational Platform - Complete Deployment Script for AWS EC2
# Instance: ubuntu@54.177.168.116
# Key: ppt-and-quizzes (1).pem

set -e  # Exit on any error

echo "🚀 Starting Educational Platform Deployment..."
echo "========================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "This script should be run as the ubuntu user"
    exit 1
fi

print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

print_status "Installing system dependencies..."
# Install essential tools
sudo apt install -y curl wget git build-essential software-properties-common unzip

# Install Node.js LTS (v20.x)
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11 and pip
print_status "Installing Python..."
sudo apt install -y python3.11 python3.11-venv python3-pip python3.11-dev libpq-dev

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install PM2 (Process Manager)
print_status "Installing PM2..."
sudo npm install -g pm2

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Verify installations
print_status "Verifying installations..."
node --version
npm --version
python3.11 --version
pm2 --version
nginx -v

print_success "System dependencies installed successfully!"

# Configure Firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # For development access
print_success "Firewall configured!"

# Create application directory structure
print_status "Setting up application directories..."
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www
sudo mkdir -p /var/log/educational-platform
sudo chown ubuntu:ubuntu /var/log/educational-platform

# Clone repository
print_status "Cloning repository..."
cd /var/www
if [ -d "educational-platform" ]; then
    print_warning "Directory exists, pulling latest changes..."
    cd educational-platform
    git pull origin main
else
    git clone https://github.com/ArkFelix7/Educational-site-v3.git educational-platform
    cd educational-platform
fi

# Set proper permissions
sudo chown -R ubuntu:ubuntu /var/www/educational-platform

print_success "Repository cloned successfully!"

# Check if environment file exists
if [ ! -f ".env.local" ]; then
    print_warning "Creating template .env.local file..."
    cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nukbivdxxzjwfoyjzblw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# External PostgreSQL Connection
DATABASE_URL=postgresql://postgres.nukbivdxxzjwfoyjzblw:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://54.177.168.116

# Scraper Configuration
SCRAPER_DELAY_SECONDS=2
SCRAPER_MAX_RETRIES=3
SCRAPER_LOG_LEVEL=INFO
EOF
    chmod 600 .env.local
    print_warning "⚠️  IMPORTANT: Edit .env.local with your actual API keys and credentials!"
    print_warning "⚠️  DATABASE_URL needs the real password!"
    print_warning "⚠️  Add your GEMINI_API_KEY and SUPABASE keys!"
fi

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build the Next.js application
print_status "Building Next.js application..."
npm run build

print_success "Next.js application built successfully!"

# Setup Python environment
print_status "Setting up Python environment..."
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies for scrapers
pip install --upgrade pip
pip install requests beautifulsoup4 psycopg2-binary python-dotenv python-dateutil

print_success "Python environment setup complete!"

# Test scraper functionality
print_status "Testing scraper system..."
cd production_scrapers
if python cli.py --help > /dev/null 2>&1; then
    print_success "Scraper CLI is working!"
else
    print_warning "Scraper CLI test failed - may need environment variable updates"
fi
cd ..

# Configure PM2
print_status "Configuring PM2..."
if [ ! -f "ecosystem.config.js" ]; then
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'educational-platform',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/educational-platform',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/educational-platform/error.log',
      out_file: '/var/log/educational-platform/out.log',
      log_file: '/var/log/educational-platform/combined.log',
      time: true
    }
  ]
};
EOF
fi

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/educational-platform << 'EOF'
server {
    listen 80;
    server_name 54.177.168.116 _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' *.supabase.co *.googleapis.com" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # API routes with increased timeout
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 600;
        proxy_connect_timeout 300;
        proxy_send_timeout 600;
    }

    # Static assets caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Handle large uploads
    client_max_body_size 10M;
    
    # Log files
    access_log /var/log/nginx/educational-platform.access.log;
    error_log /var/log/nginx/educational-platform.error.log;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/educational-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    print_success "Nginx configuration is valid!"
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    print_error "Nginx configuration failed!"
    exit 1
fi

# Create maintenance scripts
print_status "Creating maintenance scripts..."
mkdir -p scripts/maintenance

# Health check script
cat > scripts/maintenance/health-check.sh << 'EOF'
#!/bin/bash
echo "=== Educational Platform Health Check ==="
echo "Date: $(date)"
echo ""

# Check PM2 processes
echo "PM2 Status:"
pm2 status

echo ""

# Check Nginx status
echo "Nginx Status:"
sudo systemctl status nginx --no-pager -l

echo ""

# Check application response
echo "Application Health:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" http://localhost:3000/ || echo "Application not responding"

echo ""

# Check disk space
echo "Disk Usage:"
df -h

echo ""

# Check memory usage
echo "Memory Usage:"
free -h

echo ""

# Check recent errors
echo "Recent Application Errors:"
tail -n 10 /var/log/educational-platform/error.log 2>/dev/null || echo "No recent errors"

echo ""
echo "=== Health Check Complete ==="
EOF

chmod +x scripts/maintenance/health-check.sh

# Daily scraper cron job
cat > scripts/maintenance/daily-scrape.sh << 'EOF'
#!/bin/bash
cd /var/www/educational-platform
source venv/bin/activate
cd production_scrapers

echo "$(date): Starting daily scrape"
python cli.py quick --max-pages 3 --max-articles 20 --pretty >> /var/log/educational-platform/scraper-cron.log 2>&1
echo "$(date): Daily scrape completed"
EOF

chmod +x scripts/maintenance/daily-scrape.sh

# Setup log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/educational-platform << 'EOF'
/var/log/educational-platform/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    copytruncate
    su ubuntu ubuntu
}
EOF

print_success "Maintenance scripts created!"

# Start the application
print_status "Starting the application..."
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
print_status "Configuring PM2 startup..."
pm2_startup_cmd=$(pm2 startup | tail -n 1)
if [[ $pm2_startup_cmd == sudo* ]]; then
    print_status "Running PM2 startup command..."
    eval $pm2_startup_cmd
fi

print_success "Application started successfully!"

# Final checks
print_status "Running final health checks..."
sleep 5

# Check if application is responding
if curl -s http://localhost:3000/ > /dev/null; then
    print_success "✅ Application is responding on port 3000"
else
    print_warning "⚠️  Application may not be fully started yet"
fi

# Check PM2 status
pm2 status

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📝 Next Steps:"
echo "1. Edit /var/www/educational-platform/.env.local with your actual API keys"
echo "2. Restart the application: pm2 restart all"
echo "3. Access your application at: http://54.177.168.116"
echo "4. Check logs: pm2 logs educational-platform"
echo "5. Run health check: /var/www/educational-platform/scripts/maintenance/health-check.sh"
echo ""
echo "📊 Management Commands:"
echo "• pm2 status              - Check application status"
echo "• pm2 logs                - View application logs"
echo "• pm2 restart all         - Restart all services"
echo "• sudo systemctl status nginx  - Check web server"
echo ""
echo "🔧 Configuration Files:"
echo "• Application: /var/www/educational-platform"
echo "• Environment: /var/www/educational-platform/.env.local"
echo "• Logs: /var/log/educational-platform/"
echo "• Nginx: /etc/nginx/sites-available/educational-platform"
echo ""
print_warning "⚠️  IMPORTANT: Update your environment variables before the app will work properly!"
echo ""
print_success "Educational platform deployment completed successfully! 🚀"
