# Educational Platform Deployment Checklist

## ✅ Pre-Deployment Checklist

### AWS EC2 Setup
- [ ] EC2 instance is running (ubuntu@54.177.168.116)
- [ ] SSH key file `ppt-and-quizzes (1).pem` is available
- [ ] Security group allows ports 22, 80, 443, 3000
- [ ] Instance has adequate resources (t3.medium or larger recommended)

### Environment Setup
- [ ] Supabase database is accessible
- [ ] Google Gemini API key is available
- [ ] Firebase credentials are ready (if using authentication)
- [ ] Domain name configured (optional, for SSL)

## 🚀 Deployment Steps

### 1. Initial Server Setup
```bash
# From your local machine
chmod +x remote-deploy.sh
./remote-deploy.sh
```

### 2. Configure Environment Variables
```bash
# SSH into server
ssh -i "ppt-and-quizzes (1).pem" ubuntu@54.177.168.116

# Edit environment file
nano /var/www/educational-platform/.env.local

# Update the following values:
# - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
# - SUPABASE_SERVICE_ROLE_KEY=your_actual_service_key
# - DATABASE_URL=postgresql://postgres.nukbivdxxzjwfoyjzblw:REAL_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
# - GEMINI_API_KEY=your_actual_gemini_key
```

### 3. Initialize Database
```bash
cd /var/www/educational-platform

# Run database migration
npm run db:migrate

# Verify database setup
npm run db:verify

# Test scraper system
source venv/bin/activate
cd production_scrapers
python cli.py quick --max-articles 3 --pretty
```

### 4. Start Services
```bash
# Restart all services with new environment
pm2 restart all

# Check status
pm2 status
pm2 logs
```

### 5. Verify Deployment
```bash
# Run health check
./scripts/health-check.sh

# Test application
curl http://localhost:3000/
curl http://54.177.168.116/

# Test API
curl http://54.177.168.116/api/articles?limit=1
```

## 📊 Post-Deployment Configuration

### Admin User Setup
1. Access admin panel: http://54.177.168.116/admin
2. Create admin user account
3. Configure system settings
4. Test scraper functionality

### Content Population
```bash
# Run initial content scraping
cd /var/www/educational-platform
source venv/bin/activate
cd production_scrapers
python cli.py quick --max-pages 5 --max-articles 50 --pretty
```

### SSL Setup (Optional)
```bash
# If you have a domain name
sudo certbot --nginx -d yourdomain.com

# Update Nginx config to redirect HTTP to HTTPS
sudo systemctl reload nginx
```

## 🔧 Ongoing Maintenance

### Daily Tasks
- [ ] Check application health: `./scripts/health-check.sh`
- [ ] Monitor logs: `pm2 logs`
- [ ] Verify scraper functionality

### Weekly Tasks
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Check disk space and clean logs if needed
- [ ] Review application performance metrics

### Monthly Tasks
- [ ] Update application code: `git pull && npm run build && pm2 restart all`
- [ ] Review and optimize database performance
- [ ] Check security updates

## 🆘 Troubleshooting

### Common Issues

**Application not accessible:**
```bash
# Check PM2 status
pm2 status
pm2 logs educational-platform

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check firewall
sudo ufw status
```

**Database connection errors:**
```bash
# Test database connection
npm run db:verify

# Check environment variables
cat .env.local | grep DATABASE_URL

# Test from psql
psql $DATABASE_URL -c "SELECT 1;"
```

**Scraper issues:**
```bash
# Test scraper
source venv/bin/activate
cd production_scrapers
python cli.py --help
python cli.py status --pretty

# Check Python dependencies
pip list | grep -E "(requests|beautifulsoup4|psycopg2)"
```

**High memory/CPU usage:**
```bash
# Check resource usage
htop
df -h
free -h

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

### Log Locations
- Application logs: `/var/log/educational-platform/`
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `pm2 logs`
- System logs: `/var/log/syslog`

### Useful Commands
```bash
# Application management
pm2 status                    # Check service status
pm2 restart all              # Restart all services
pm2 logs educational-platform # View app logs
pm2 monit                    # Monitor resources

# System management
sudo systemctl status nginx  # Check web server
sudo systemctl reload nginx  # Reload nginx config
sudo ufw status              # Check firewall
htop                         # Monitor system resources

# Application updates
git pull origin main         # Update code
npm install                  # Update dependencies
npm run build               # Rebuild application
pm2 restart all             # Restart services

# Database management
npm run db:migrate          # Run migrations
npm run db:verify          # Verify setup
psql $DATABASE_URL         # Direct database access
```

## 📈 Performance Optimization

### Database Optimization
- [ ] Monitor query performance
- [ ] Set up connection pooling
- [ ] Regular vacuum and analyze operations

### Application Optimization
- [ ] Enable Next.js production optimizations
- [ ] Configure proper caching headers
- [ ] Monitor memory usage and optimize

### Server Optimization
- [ ] Configure swap file if needed
- [ ] Optimize Nginx buffer sizes
- [ ] Set up log rotation

## 🔒 Security Hardening

### Essential Security Steps
- [ ] Keep system packages updated
- [ ] Configure fail2ban for SSH protection
- [ ] Set up automated security updates
- [ ] Regular security audits

### Application Security
- [ ] Secure environment variables
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Configure proper CORS settings
- [ ] Regular dependency updates

## 📊 Monitoring Setup

### Basic Monitoring
- [ ] Set up log aggregation
- [ ] Configure application health checks
- [ ] Monitor disk space and memory usage

### Advanced Monitoring (Optional)
- [ ] Set up APM tools (New Relic, DataDog)
- [ ] Configure alerting for critical issues
- [ ] Set up uptime monitoring

## ✅ Final Verification

### Application Features
- [ ] Homepage loads correctly
- [ ] Admin panel is accessible
- [ ] Article browsing works
- [ ] Quiz generation functions
- [ ] Scraper system operational
- [ ] Database queries execute properly

### Performance Check
- [ ] Page load times under 3 seconds
- [ ] API responses under 1 second
- [ ] Scraper completes without errors
- [ ] Memory usage stable under 80%

### Security Check
- [ ] No sensitive data in logs
- [ ] Environment variables properly secured
- [ ] Firewall configured correctly
- [ ] SSL certificate valid (if configured)

---

**Deployment Status:** ⏳ In Progress / ✅ Complete / ❌ Failed

**Last Updated:** [Date]
**Deployed By:** [Name]
**Version:** [Git commit hash]
