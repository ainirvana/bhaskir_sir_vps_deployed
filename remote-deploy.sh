#!/bin/bash

# Quick deployment script to run on the EC2 instance
# This script should be run from your local machine to deploy to EC2

set -e

# Configuration
EC2_HOST="54.177.168.116"
EC2_USER="ubuntu"
KEY_FILE="ppt-and-quizzes (1).pem"
REPO_URL="https://github.com/ArkFelix7/Educational-site-v3.git"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

echo "🚀 Educational Platform - Remote Deployment"
echo "============================================"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    print_error "Key file '$KEY_FILE' not found!"
    print_error "Please place the key file in the current directory"
    exit 1
fi

# Set correct permissions for key file
chmod 400 "$KEY_FILE"

print_status "Connecting to EC2 instance..."

# Test connection
if ! ssh -i "$KEY_FILE" -o ConnectTimeout=10 "$EC2_USER@$EC2_HOST" "echo 'Connection successful'" 2>/dev/null; then
    print_error "Cannot connect to EC2 instance"
    print_error "Please check:"
    print_error "  1. Key file path: $KEY_FILE"
    print_error "  2. EC2 instance IP: $EC2_HOST"
    print_error "  3. Security group allows SSH (port 22)"
    exit 1
fi

print_success "Connected to EC2 instance successfully!"

# Upload deployment script
print_status "Uploading deployment script..."
scp -i "$KEY_FILE" deploy.sh "$EC2_USER@$EC2_HOST:~/deploy.sh"

# Make deployment script executable and run it
print_status "Running deployment on EC2 instance..."
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_HOST" << 'REMOTE_COMMANDS'
    chmod +x ~/deploy.sh
    ~/deploy.sh
REMOTE_COMMANDS

print_success "Deployment completed!"

echo ""
echo "🎉 Educational Platform deployed successfully!"
echo "============================================="
echo ""
echo "📱 Access your application:"
echo "   • Main App: http://$EC2_HOST"
echo "   • Admin Panel: http://$EC2_HOST/admin"
echo ""
echo "🔧 Post-deployment steps:"
echo "   1. SSH into your server: ssh -i '$KEY_FILE' $EC2_USER@$EC2_HOST"
echo "   2. Edit environment variables: nano /var/www/educational-platform/.env.local"
echo "   3. Restart the application: pm2 restart all"
echo "   4. Check status: pm2 status"
echo ""
echo "📊 Monitor your application:"
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_HOST" "cd /var/www/educational-platform && ./scripts/maintenance/health-check.sh" | head -20

echo ""
print_warning "⚠️  Don't forget to update your environment variables!"
print_success "Happy coding! 🚀"
