#!/bin/bash

# FSMI TV & HA Deployment Script
# Usage: ./deploy.sh [domain] [port]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=${1:-"fsmi.yourdomain.com"}
PORT=${2:-"80"}
PROJECT_NAME="fsmi-tv-ha"
BACKUP_DIR="/opt/backups/$PROJECT_NAME"

echo -e "${BLUE}🚀 بدء نشر FSMI TV & HA By SmartSense${NC}"
echo -e "${BLUE}📍 الدومين: $DOMAIN${NC}"
echo -e "${BLUE}🔌 المنفذ: $PORT${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker غير مثبت. يرجى تثبيت Docker أولاً${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose غير مثبت. يرجى تثبيت Docker Compose أولاً${NC}"
    exit 1
fi

# Create backup directory
echo -e "${YELLOW}📁 إنشاء مجلد النسخ الاحتياطية...${NC}"
sudo mkdir -p $BACKUP_DIR

# Backup existing data if exists
if [ -d "./server/data" ]; then
    echo -e "${YELLOW}💾 عمل نسخة احتياطية من البيانات...${NC}"
    sudo cp -r ./server/data $BACKUP_DIR/data-$(date +%Y%m%d-%H%M%S)
fi

if [ -d "./server/uploads" ]; then
    echo -e "${YELLOW}💾 عمل نسخة احتياطية من الملفات...${NC}"
    sudo cp -r ./server/uploads $BACKUP_DIR/uploads-$(date +%Y%m%d-%H%M%S)
fi

# Stop existing containers
echo -e "${YELLOW}🛑 إيقاف الحاويات الموجودة...${NC}"
docker-compose down --remove-orphans || true

# Remove old images
echo -e "${YELLOW}🗑️ إزالة الصور القديمة...${NC}"
docker image prune -f

# Build and start containers
echo -e "${YELLOW}🔨 بناء وتشغيل الحاويات...${NC}"
docker-compose up --build -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ انتظار تشغيل الخدمات...${NC}"
sleep 30

# Check if services are running
echo -e "${YELLOW}🔍 فحص حالة الخدمات...${NC}"

# Check backend health
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ الخادم الخلفي يعمل بنجاح${NC}"
else
    echo -e "${RED}❌ الخادم الخلفي لا يعمل${NC}"
    docker-compose logs backend
    exit 1
fi

# Check frontend health
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ الواجهة الأمامية تعمل بنجاح${NC}"
else
    echo -e "${RED}❌ الواجهة الأمامية لا تعمل${NC}"
    docker-compose logs frontend
    exit 1
fi

# Setup Nginx reverse proxy (if needed)
if [ "$PORT" != "80" ]; then
    echo -e "${YELLOW}🔧 إعداد Nginx Reverse Proxy...${NC}"
    
    # Create Nginx config for subdomain
    sudo tee /etc/nginx/sites-available/$PROJECT_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts for file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 50M;
    }

    # Logs
    access_log /var/log/nginx/$PROJECT_NAME.access.log;
    error_log /var/log/nginx/$PROJECT_NAME.error.log;
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$PROJECT_NAME /etc/nginx/sites-enabled/
    
    # Test Nginx config
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    echo -e "${GREEN}✅ تم إعداد Nginx Reverse Proxy${NC}"
fi

# Setup SSL with Let's Encrypt (optional)
read -p "هل تريد إعداد SSL مع Let's Encrypt؟ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔒 إعداد SSL مع Let's Encrypt...${NC}"
    
    # Install certbot if not installed
    if ! command -v certbot &> /dev/null; then
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # Get SSL certificate
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    echo -e "${GREEN}✅ تم إعداد SSL بنجاح${NC}"
fi

# Setup automatic backups
echo -e "${YELLOW}📅 إعداد النسخ الاحتياطية التلقائية...${NC}"

# Create backup script
sudo tee /opt/backup-fsmi.sh > /dev/null <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/opt/backups/$PROJECT_NAME"

# Create backup directory
mkdir -p \$BACKUP_DIR

# Backup database and uploads
docker exec fsmi-backend tar czf /tmp/backup-\$DATE.tar.gz /app/data /app/uploads
docker cp fsmi-backend:/tmp/backup-\$DATE.tar.gz \$BACKUP_DIR/

# Remove old backups (keep last 7 days)
find \$BACKUP_DIR -name "backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup-\$DATE.tar.gz"
EOF

sudo chmod +x /opt/backup-fsmi.sh

# Add to crontab (daily backup at 2 AM)
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-fsmi.sh") | sudo crontab -

echo -e "${GREEN}✅ تم إعداد النسخ الاحتياطية التلقائية${NC}"

# Setup log rotation
echo -e "${YELLOW}📋 إعداد تدوير السجلات...${NC}"

sudo tee /etc/logrotate.d/$PROJECT_NAME > /dev/null <<EOF
/var/log/nginx/$PROJECT_NAME.*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF

echo -e "${GREEN}✅ تم إعداد تدوير السجلات${NC}"

# Final status check
echo -e "${BLUE}📊 فحص الحالة النهائية...${NC}"
docker-compose ps

echo -e "${GREEN}🎉 تم نشر التطبيق بنجاح!${NC}"
echo -e "${GREEN}🌐 الرابط: http://$DOMAIN${NC}"
echo -e "${GREEN}📱 يمكن للموظفين الآن الوصول للتطبيق وتثبيته كـ PWA${NC}"

# Show useful commands
echo -e "${BLUE}📝 أوامر مفيدة:${NC}"
echo -e "  عرض السجلات: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  إعادة التشغيل: ${YELLOW}docker-compose restart${NC}"
echo -e "  إيقاف التطبيق: ${YELLOW}docker-compose down${NC}"
echo -e "  تحديث التطبيق: ${YELLOW}./deploy.sh $DOMAIN $PORT${NC}"
echo -e "  عمل نسخة احتياطية: ${YELLOW}/opt/backup-fsmi.sh${NC}"

echo -e "${GREEN}✨ النشر مكتمل بنجاح!${NC}"