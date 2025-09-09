#!/bin/bash

# Health monitoring script for the Educational Platform
# Run this script to check the overall health of the system

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo ""
print_header "Educational Platform Health Check"
echo "Date: $(date)"
echo "Host: $(hostname)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    cd /var/www/educational-platform 2>/dev/null || {
        print_error "Cannot find application directory"
        exit 1
    }
fi

print_header "System Resources"

# Memory usage
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100}')
if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
    print_warning "High memory usage: ${MEM_USAGE}%"
else
    print_success "Memory usage: ${MEM_USAGE}%"
fi

# Disk usage
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    print_warning "High disk usage: ${DISK_USAGE}%"
else
    print_success "Disk usage: ${DISK_USAGE}%"
fi

# CPU load
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
print_info "Load average: $LOAD_AVG"

echo ""
print_header "Service Status"

# Check PM2 processes
if command -v pm2 >/dev/null 2>&1; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || echo "PM2 status unavailable")
    if echo "$PM2_STATUS" | grep -q "online"; then
        print_success "PM2 processes running"
        echo "$PM2_STATUS" | while read line; do
            if echo "$line" | grep -q "online"; then
                print_success "  $line"
            else
                print_warning "  $line"
            fi
        done
    else
        print_error "PM2 processes not running properly"
        pm2 status 2>/dev/null || print_error "PM2 not available"
    fi
else
    print_error "PM2 not installed"
fi

echo ""

# Check Nginx status
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running"
fi

echo ""
print_header "Application Health"

# Check if application responds
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Application responding (HTTP $HTTP_STATUS)"
else
    print_error "Application not responding (HTTP $HTTP_STATUS)"
fi

# Test API endpoint
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/articles?limit=1 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    print_success "API endpoints responding (HTTP $API_STATUS)"
else
    print_warning "API endpoints may have issues (HTTP $API_STATUS)"
fi

echo ""
print_header "Database Connectivity"

# Test database connection (using Node.js script)
if [ -f "scripts/verify-setup.js" ]; then
    DB_TEST=$(timeout 10 node scripts/verify-setup.js 2>&1 | grep -E "(Database connection|verification)" | tail -1)
    if echo "$DB_TEST" | grep -q "successful"; then
        print_success "Database connection working"
    else
        print_warning "Database connection may have issues"
        print_info "Run: npm run db:verify for detailed check"
    fi
else
    print_info "Database test script not found, skipping"
fi

echo ""
print_header "Scraper System"

# Check Python environment
if [ -d "venv" ]; then
    source venv/bin/activate
    if python production_scrapers/cli.py --help >/dev/null 2>&1; then
        print_success "Scraper system operational"
    else
        print_warning "Scraper system may have issues"
    fi
    deactivate
else
    print_warning "Python virtual environment not found"
fi

echo ""
print_header "Log Analysis"

# Check for recent errors
ERROR_COUNT=$(tail -n 100 /var/log/educational-platform/error.log 2>/dev/null | grep -c "ERROR" || echo "0")
WARNING_COUNT=$(tail -n 100 /var/log/educational-platform/combined.log 2>/dev/null | grep -c "WARN" || echo "0")

if [ "$ERROR_COUNT" -gt 5 ]; then
    print_warning "High error count in logs: $ERROR_COUNT recent errors"
elif [ "$ERROR_COUNT" -gt 0 ]; then
    print_info "Some errors in logs: $ERROR_COUNT recent errors"
else
    print_success "No recent errors in logs"
fi

if [ "$WARNING_COUNT" -gt 10 ]; then
    print_warning "High warning count: $WARNING_COUNT recent warnings"
else
    print_info "Warning count: $WARNING_COUNT recent warnings"
fi

echo ""
print_header "Network & Security"

# Check open ports
OPEN_PORTS=$(ss -tuln | awk 'NR>1 {print $5}' | cut -d':' -f2 | sort -u | grep -E '^(80|443|3000|22)$' | wc -l)
print_info "Expected service ports open: $OPEN_PORTS/4"

# Check firewall status
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(sudo ufw status | head -1)
    if echo "$UFW_STATUS" | grep -q "active"; then
        print_success "Firewall is active"
    else
        print_warning "Firewall is not active"
    fi
fi

echo ""
print_header "Maintenance Information"

# Last update time
if [ -f ".git/FETCH_HEAD" ]; then
    LAST_UPDATE=$(stat -c %y .git/FETCH_HEAD 2>/dev/null | cut -d' ' -f1)
    print_info "Last git update: $LAST_UPDATE"
fi

# Uptime
UPTIME=$(uptime -p 2>/dev/null || uptime)
print_info "System uptime: $UPTIME"

# Available updates
UPDATE_COUNT=$(apt list --upgradable 2>/dev/null | grep -c upgradable || echo "unknown")
if [ "$UPDATE_COUNT" != "unknown" ] && [ "$UPDATE_COUNT" -gt 0 ]; then
    print_info "Available package updates: $UPDATE_COUNT"
fi

echo ""
print_header "Quick Actions"
echo "📊 View logs:           pm2 logs"
echo "🔄 Restart app:         pm2 restart all"
echo "🔧 Update app:          git pull && npm run build && pm2 restart all"
echo "📈 Monitor resources:   htop"
echo "🔍 Check nginx:         sudo systemctl status nginx"
echo "📝 Edit config:         nano .env.local"

echo ""
print_header "Summary"

# Overall health score
HEALTH_SCORE=0
[ "$HTTP_STATUS" = "200" ] && ((HEALTH_SCORE++))
[ "$API_STATUS" = "200" ] && ((HEALTH_SCORE++))
systemctl is-active --quiet nginx && ((HEALTH_SCORE++))
[ -d "venv" ] && ((HEALTH_SCORE++))
[ "$ERROR_COUNT" -lt 5 ] && ((HEALTH_SCORE++))

if [ "$HEALTH_SCORE" -ge 4 ]; then
    print_success "System health: GOOD ($HEALTH_SCORE/5)"
elif [ "$HEALTH_SCORE" -ge 2 ]; then
    print_warning "System health: FAIR ($HEALTH_SCORE/5)"
else
    print_error "System health: POOR ($HEALTH_SCORE/5)"
fi

echo ""
echo "Health check completed at $(date)"
echo ""
