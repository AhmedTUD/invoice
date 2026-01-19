#!/bin/bash

# Server Deployment Script for FSMI TV & HA Invoice System
# Domain: invoice.smart-sense.site
# Repository: https://github.com/AhmedTUD/invoice.git

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="invoice.smart-sense.site"
PROJECT_NAME="invoice"
PROJECT_DIR="/opt/invoice"
REPO_URL="https://github.com/AhmedTUD/invoice.git"
NGINX_SITE_NAME="invoice-smart-sense"

echo -e "${BLUE}🚀 بدء نشر FSMI TV & HA Invoice System${NC}"
echo -e "${BLUE}📍 الدومين: $DOMAIN${NC}"
echo -e "${BLUE}📁 مجلد المشروع: $PROJECT_DIR${NC}"

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ لا تشغل هذا السكريبت كـ root. استخدم sudo عند الحاجة.${NC}"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}📦 تثبيت Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}✅ تم تثبيت Docker${NC}"
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}📦 تثبيت Docker Compose...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ تم تثبيت Docker Compose${NC}"
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 تثبيت Nginx...${NC}"
    sudo apt update
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
    echo -e "${GREEN}✅ تم تثبيت Nginx${NC}"
fi

# Create project directory
echo -e "${YELLOW}📁 إنشاء مجلد المشروع...${NC}"
sudo mkdir -p $PROJECT_DIR
sudo chown $USER:$USER $PROJECT_DIR

# Clone or update repository
if [ -d "$PROJECT_DIR/.git" ]; then
    echo -e "${YELLOW}🔄 تحديث المشروع من GitHub...${NC}"
    cd $PROJECT_DIR
    git fetch origin
    git reset --hard origin/main
    git clean -fd
else
    echo -e "${YELLOW}📥 استنساخ المشروع من GitHub...${NC}"
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

# Create necessary directories
echo -e "${YELLOW}📁 إنشاء المجلدات المطلوبة...${NC}"
mkdir -p server/data server/uploads
chmod 755 server/data server/uploads

# Stop existing containers
echo -e "${YELLOW}🛑 إيقاف الحاويات الموجودة...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start containers
echo -e "${YELLOW}🔨 بناء وتشغيل الحاويات...${NC}"
docker-compose up --build -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ انتظار تشغيل الخدمات...${NC}"
sleep 30

# Check if services are running
echo -e "${YELLOW}🔍 فحص حالة الخدمات...${NC}"

# Check backend health
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ الخادم الخلفي يعمل بنجاح${NC}"
else
    echo -e "${RED}❌ الخادم الخلفي لا يعمل (HTTP: $BACKEND_HEALTH)${NC}"
    echo -e "${YELLOW}📋 سجلات الخادم الخلفي:${NC}"
    docker-compose logs backend
fi

# Check frontend health
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ الواجهة الأمامية تعمل بنجاح${NC}"
else
    echo -e "${RED}❌ الواجهة الأمامية لا تعمل (HTTP: $FRONTEND_HEALTH)${NC}"
    echo -e "${YELLOW}📋 سجلات الواجهة الأمامية:${NC}"
    docker-compose logs frontend
fi

# Setup Nginx reverse proxy
echo -e "${YELLOW}🔧 إعداد Nginx Reverse Proxy...${NC}"

# Create Nginx config
sudo tee /etc/nginx/sites-available/$NGINX_SITE_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # File upload settings
        client_max_body_size 50M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Logs
    access_log /var/log/nginx/$NGINX_SITE_NAME.access.log;
    error_log /var/log/nginx/$NGINX_SITE_NAME.error.log;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/$NGINX_SITE_NAME /etc/nginx/sites-enabled/

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if sudo nginx -t; then
    echo -e "${GREEN}✅ إعداد Nginx صحيح${NC}"
    sudo systemctl reload nginx
else
    echo -e "${RED}❌ خطأ في إعداد Nginx${NC}"
    exit 1
fi

# Setup SSL with Let's Encrypt
echo -e "${YELLOW}🔒 إعداد SSL مع Let's Encrypt...${NC}"

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Get SSL certificate
if sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@smart-sense.site --redirect; then
    echo -e "${GREEN}✅ تم إعداد SSL بنجاح${NC}"
else
    echo -e "${YELLOW}⚠️ فشل في إعداد SSL، سيعمل التطبيق على HTTP${NC}"
fi

# Setup firewall
echo -e "${YELLOW}🔥 إعداد الجدار الناري...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Setup automatic backups
echo -e "${YELLOW}📅 إعداد النسخ الاحتياطية التلقائية...${NC}"

# Create backup directory
sudo mkdir -p /opt/backups/$PROJECT_NAME

# Create backup script
sudo tee /opt/backup-invoice.sh > /dev/null <<EOF
#!/bin/bash
DATE=\$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/opt/backups/$PROJECT_NAME"
PROJECT_DIR="$PROJECT_DIR"

# Create backup directory
mkdir -p \$BACKUP_DIR

# Backup database and uploads
cd \$PROJECT_DIR
docker exec invoice-backend tar czf /tmp/backup-\$DATE.tar.gz /app/data /app/uploads 2>/dev/null || true
docker cp invoice-backend:/tmp/backup-\$DATE.tar.gz \$BACKUP_DIR/ 2>/dev/null || true

# Remove old backups (keep last 7 days)
find \$BACKUP_DIR -name "backup-*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "Backup completed: backup-\$DATE.tar.gz"
EOF

sudo chmod +x /opt/backup-invoice.sh

# Add to crontab (daily backup at 2 AM)
(sudo crontab -l 2>/dev/null | grep -v backup-invoice; echo "0 2 * * * /opt/backup-invoice.sh") | sudo crontab -

echo -e "${GREEN}✅ تم إعداد النسخ الاحتياطية التلقائية${NC}"

# Setup log rotation
echo -e "${YELLOW}📋 إعداد تدوير السجلات...${NC}"

sudo tee /etc/logrotate.d/$PROJECT_NAME > /dev/null <<EOF
/var/log/nginx/$NGINX_SITE_NAME.*.log {
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

# Final health check
echo -e "${BLUE}🏥 فحص الصحة النهائي...${NC}"

# Test domain
DOMAIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN/health || echo "000")
if [ "$DOMAIN_TEST" = "200" ]; then
    echo -e "${GREEN}✅ الدومين يعمل بنجاح: http://$DOMAIN${NC}"
else
    echo -e "${YELLOW}⚠️ الدومين قد لا يعمل بعد (HTTP: $DOMAIN_TEST)${NC}"
    echo -e "${YELLOW}   تأكد من إعداد DNS للدومين $DOMAIN${NC}"
fi

# Show container status
echo -e "${BLUE}📊 حالة الحاويات:${NC}"
docker-compose ps

echo -e "${GREEN}🎉 تم نشر التطبيق بنجاح!${NC}"
echo -e "${GREEN}🌐 الرابط: http://$DOMAIN${NC}"
echo -e "${GREEN}🔒 الرابط الآمن: https://$DOMAIN${NC}"
echo -e "${GREEN}👨‍💼 لوحة التحكم: https://$DOMAIN/#/admin${NC}"
echo -e "${GREEN}🔑 بيانات المشرف: admin / admin2025${NC}"
echo -e "${GREEN}📱 يمكن للموظفين الآن تثبيت التطبيق كـ PWA${NC}"

# Show useful commands
echo -e "${BLUE}📝 أوامر مفيدة:${NC}"
echo -e "  عرض السجلات: ${YELLOW}cd $PROJECT_DIR && docker-compose logs -f${NC}"
echo -e "  إعادة التشغيل: ${YELLOW}cd $PROJECT_DIR && docker-compose restart${NC}"
echo -e "  إيقاف التطبيق: ${YELLOW}cd $PROJECT_DIR && docker-compose down${NC}"
echo -e "  تحديث التطبيق: ${YELLOW}cd $PROJECT_DIR && git pull && docker-compose up --build -d${NC}"
echo -e "  عمل نسخة احتياطية: ${YELLOW}/opt/backup-invoice.sh${NC}"

echo -e "${GREEN}✨ النشر مكتمل بنجاح!${NC}"
echo -e "${BLUE}🔗 شارك الرابط مع الموظفين: http://$DOMAIN${NC}"