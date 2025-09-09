# 🚀 Educational Platform - AWS EC2 Deployment Guide

## 📋 **System Overview**

This educational platform consists of:
- **Next.js Web Application** (Frontend + API)
- **Production Scraper System** (Python-based)
- **PostgreSQL Database** (Supabase)
- **AI Integration** (Google Gemini API)
- **File Storage & Assets**

## 🎯 **Deployment Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS EC2 Instance                        │
│                   ubuntu@54.177.168.116                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Next.js App   │  │ Python Scrapers │  │   Nginx     │ │
│  │   (Port 3000)   │  │   (Port 8000)   │  │ (Port 80)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Node.js LTS   │  │   Python 3.11   │  │   PM2       │ │
│  │                 │  │   + pip deps    │  │ (Process    │ │
│  │                 │  │                 │  │  Manager)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────────┐
              │        External Services        │
              ├─────────────────────────────────┤
              │  • Supabase PostgreSQL DB      │
              │  • Google Gemini API           │
              │  • Firebase Authentication     │
              └─────────────────────────────────┘
```

## 🛠️ **Pre-Deployment Requirements**

### **AWS EC2 Instance Specs**
- **Instance Type**: t3.medium or larger (2 vCPU, 4GB RAM minimum)
- **Storage**: 20GB+ SSD
- **OS**: Ubuntu 22.04 LTS
- **Security Group**: Ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (Next.js dev)

### **External Dependencies**
- ✅ Supabase PostgreSQL database (already configured)
- ✅ Google Gemini API key
- ✅ Firebase project credentials
- ✅ Domain name (optional, for production SSL)

## 📝 **Step-by-Step Deployment Process**

### **Phase 1: Server Setup & Prerequisites**

#### **1.1 Connect to EC2 Instance**
```bash
# Connect via SSH
ssh -i "ppt-and-quizzes (1).pem" ubuntu@54.177.168.116

# Update system
sudo apt update && sudo apt upgrade -y
```

#### **1.2 Install System Dependencies**
```bash
# Install essential tools
sudo apt install -y curl wget git build-essential software-properties-common

# Install Node.js LTS (v20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11 and pip
sudo apt install -y python3.11 python3.11-venv python3-pip python3.11-dev

# Install Nginx
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install PostgreSQL client (for database connections)
sudo apt install -y postgresql-client

# Verify installations
node --version
npm --version
python3.11 --version
pm2 --version
nginx -v
```

#### **1.3 Configure Firewall**
```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # For development access
sudo ufw status
```

### **Phase 2: Application Deployment**

#### **2.1 Clone Repository**
```bash
# Create application directory
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www

# Clone the repository
cd /var/www
git clone https://github.com/ArkFelix7/Educational-site-v3.git educational-platform
cd educational-platform

# Set proper permissions
sudo chown -R ubuntu:ubuntu /var/www/educational-platform
```

#### **2.2 Setup Environment Variables**
```bash
# Create production environment file
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nukbivdxxzjwfoyjzblw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# External PostgreSQL Connection
DATABASE_URL=postgresql://postgres.nukbivdxxzjwfoyjzblw:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (if needed)
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}

# Production Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://54.177.168.116

# Scraper Configuration
SCRAPER_DELAY_SECONDS=2
SCRAPER_MAX_RETRIES=3
SCRAPER_LOG_LEVEL=INFO
EOF

# Secure the environment file
chmod 600 .env.local
```

#### **2.3 Install Node.js Dependencies**
```bash
# Install dependencies
npm install

# Build the Next.js application
npm run build

# Verify build success
ls -la .next/
```

#### **2.4 Setup Python Environment**
```bash
# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install Python dependencies for scrapers
pip install --upgrade pip
pip install requests beautifulsoup4 psycopg2-binary python-dotenv python-dateutil

# Test scraper functionality
cd production_scrapers
python cli.py --help

# Test database connection
python -c "
import os
import sys
sys.path.append('/var/www/educational-platform')
from production_scrapers.combined_scraper import CombinedScraper
print('Testing database connection...')
scraper = CombinedScraper()
print('Database connection successful!')
"
```

### **Phase 3: Process Management Setup**

#### **3.1 Configure PM2 for Next.js**
```bash
# Create PM2 ecosystem file
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
    },
    {
      name: 'scraper-service',
      script: '/var/www/educational-platform/venv/bin/python',
      args: '/var/www/educational-platform/production_scrapers/scraper_service.py',
      cwd: '/var/www/educational-platform',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        PYTHONPATH: '/var/www/educational-platform'
      },
      error_file: '/var/log/educational-platform/scraper-error.log',
      out_file: '/var/log/educational-platform/scraper-out.log',
      log_file: '/var/log/educational-platform/scraper-combined.log',
      time: true
    }
  ]
};
EOF

# Create log directory
sudo mkdir -p /var/log/educational-platform
sudo chown ubuntu:ubuntu /var/log/educational-platform

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown by the command above
```

#### **3.2 Configure Nginx Reverse Proxy**
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/educational-platform << 'EOF'
server {
    listen 80;
    server_name 54.177.168.116 _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

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

    # Static assets
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Handle large uploads for file operations
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
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### **Phase 4: Database Setup & Verification**

#### **4.1 Database Migration**
```bash
cd /var/www/educational-platform

# Run database migration
npm run db:migrate

# Verify database setup
npm run db:verify

# Import any existing scraped content
npm run db:import-content
```

#### **4.2 Test Scraper System**
```bash
# Activate Python environment
source venv/bin/activate

# Test scraper CLI
cd production_scrapers
python cli.py quick --max-articles 5 --pretty

# Test scraper service
python cli.py status --pretty
```

### **Phase 5: SSL Configuration (Optional but Recommended)**

#### **5.1 Install Certbot**
```bash
sudo apt install -y certbot python3-certbot-nginx

# If you have a domain name, run:
# sudo certbot --nginx -d yourdomain.com

# For now, we'll use HTTP. SSL can be added later with a proper domain.
```

### **Phase 6: Monitoring & Maintenance Setup**

#### **6.1 Setup Log Rotation**
```bash
# Create logrotate configuration
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
```

#### **6.2 Create Maintenance Scripts**
```bash
# Create maintenance script directory
mkdir -p /var/www/educational-platform/scripts/maintenance

# Health check script
cat > /var/www/educational-platform/scripts/maintenance/health-check.sh << 'EOF'
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
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" http://localhost:3000/

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

chmod +x /var/www/educational-platform/scripts/maintenance/health-check.sh

# Daily scraper cron job
cat > /var/www/educational-platform/scripts/maintenance/daily-scrape.sh << 'EOF'
#!/bin/bash
cd /var/www/educational-platform
source venv/bin/activate
cd production_scrapers

echo "$(date): Starting daily scrape"
python cli.py quick --max-pages 3 --max-articles 20 --pretty >> /var/log/educational-platform/scraper-cron.log 2>&1
echo "$(date): Daily scrape completed"
EOF

chmod +x /var/www/educational-platform/scripts/maintenance/daily-scrape.sh

# Add to crontab for daily scraping at 6 AM
(crontab -l 2>/dev/null; echo "0 6 * * * /var/www/educational-platform/scripts/maintenance/daily-scrape.sh") | crontab -
```

## 🔧 **Post-Deployment Configuration**

### **Environment Variable Updates**
After deployment, update your `.env.local` file with actual values:

```bash
# Edit environment file
nano /var/www/educational-platform/.env.local

# Add real API keys and database credentials
# Then restart the application
pm2 restart all
```

### **Security Hardening**
```bash
# Disable direct access to port 3000 from outside
sudo ufw delete allow 3000

# Only allow nginx to access the application
# (Application will still be accessible via port 80 through nginx)

# Setup fail2ban for SSH protection (optional)
sudo apt install -y fail2ban
```

## 📊 **Monitoring & Maintenance**

### **Check Application Status**
```bash
# PM2 status
pm2 status
pm2 logs

# Nginx status
sudo systemctl status nginx

# Run health check
/var/www/educational-platform/scripts/maintenance/health-check.sh

# View logs
tail -f /var/log/educational-platform/combined.log
tail -f /var/log/nginx/educational-platform.access.log
```

### **Update Application**
```bash
cd /var/www/educational-platform

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart services
pm2 restart all
```

### **Backup Strategy**
```bash
# Database backup (scheduled via cron)
# This should backup your Supabase database

# Application backup
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/educational-platform

# Store backups in separate location or S3
```

## 🚀 **Deployment Commands Summary**

Here's the complete deployment script you can run:

```bash
#!/bin/bash
# Educational Platform Deployment Script

# 1. System setup
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs python3.11 python3.11-venv python3-pip nginx postgresql-client
sudo npm install -g pm2

# 2. Clone repository
sudo mkdir -p /var/www && sudo chown ubuntu:ubuntu /var/www
cd /var/www
git clone https://github.com/ArkFelix7/Educational-site-v3.git educational-platform
cd educational-platform

# 3. Setup environment (you'll need to edit .env.local manually)
cp .env.example .env.local  # Edit this file with real values

# 4. Install dependencies
npm install
npm run build

# 5. Setup Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install requests beautifulsoup4 psycopg2-binary python-dotenv python-dateutil

# 6. Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 7. Configure nginx (use the nginx config provided above)

echo "🎉 Deployment complete! Access your application at http://54.177.168.116"
```

## 🔗 **Access Points After Deployment**

- **Main Application**: http://54.177.168.116
- **Admin Dashboard**: http://54.177.168.116/admin
- **API Endpoints**: http://54.177.168.116/api/*
- **Health Check**: Run the health check script

## ⚠️ **Important Notes**

1. **Security**: This setup uses HTTP. For production, configure SSL with a proper domain.
2. **Environment Variables**: Update all API keys and credentials in `.env.local`
3. **Database**: Ensure Supabase database is accessible from EC2 instance
4. **Monitoring**: Set up proper monitoring for production use
5. **Backups**: Implement regular backup strategy
6. **Updates**: Plan for regular application and system updates

## 🆘 **Troubleshooting**

### Common Issues:
- **Port 3000 not accessible**: Check PM2 status and firewall rules
- **Database connection failed**: Verify DATABASE_URL and network connectivity
- **Scraper errors**: Check Python environment and dependencies
- **Nginx 502 errors**: Ensure Next.js application is running on port 3000

### Debug Commands:
```bash
# Check application logs
pm2 logs educational-platform

# Check scraper logs
pm2 logs scraper-service

# Check nginx logs
sudo tail -f /var/log/nginx/educational-platform.error.log

# Test database connection
cd /var/www/educational-platform && npm run db:verify
```

This deployment guide provides a comprehensive, production-ready setup for your educational platform on AWS EC2! 🚀
