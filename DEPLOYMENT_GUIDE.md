# دليل النشر - FSMI TV & HA By SmartSense على Docker

## متطلبات السيرفر

### 1. **المتطلبات الأساسية**
- Ubuntu 20.04+ أو CentOS 8+
- RAM: 2GB كحد أدنى (4GB مُوصى به)
- Storage: 20GB كحد أدنى
- Docker 20.10+
- Docker Compose 2.0+
- Nginx (للـ reverse proxy)

### 2. **تثبيت Docker**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## خطوات النشر

### 1. **رفع الملفات للسيرفر**
```bash
# على جهازك المحلي
scp -r fsmi-incentives-tracker/ user@your-server:/opt/

# أو استخدام Git
ssh user@your-server
cd /opt
git clone https://github.com/your-repo/fsmi-incentives-tracker.git
cd fsmi-incentives-tracker
```

### 2. **تشغيل سكريبت النشر**
```bash
# جعل السكريبت قابل للتنفيذ
chmod +x deploy.sh

# تشغيل النشر
./deploy.sh fsmi.yourdomain.com 80

# أو مع منفذ مخصص
./deploy.sh fsmi.yourdomain.com 8080
```

### 3. **النشر اليدوي (إذا لم تستخدم السكريبت)**
```bash
# بناء وتشغيل الحاويات
docker-compose up --build -d

# فحص الحالة
docker-compose ps
docker-compose logs -f
```

## إعداد الدومين الفرعي

### 1. **إعداد DNS**
```
# في إعدادات DNS الخاص بك
A Record: fsmi.yourdomain.com -> IP_ADDRESS
```

### 2. **إعداد Nginx Reverse Proxy**
```nginx
# /etc/nginx/sites-available/fsmi
server {
    listen 80;
    server_name fsmi.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        client_max_body_size 50M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/fsmi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. **إعداد SSL مع Let's Encrypt**
```bash
# تثبيت Certbot
sudo apt install certbot python3-certbot-nginx

# الحصول على شهادة SSL
sudo certbot --nginx -d fsmi.yourdomain.com

# تجديد تلقائي
sudo crontab -e
# إضافة: 0 12 * * * /usr/bin/certbot renew --quiet
```

## إدارة التطبيق

### 1. **أوامر Docker Compose المفيدة**
```bash
# عرض الحاويات
docker-compose ps

# عرض السجلات
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend

# إعادة تشغيل خدمة معينة
docker-compose restart backend
docker-compose restart frontend

# إيقاف التطبيق
docker-compose down

# إيقاف وحذف البيانات
docker-compose down -v

# تحديث التطبيق
git pull
docker-compose up --build -d
```

### 2. **مراقبة الأداء**
```bash
# استخدام الموارد
docker stats

# مساحة القرص
docker system df

# تنظيف الملفات غير المستخدمة
docker system prune -f
```

### 3. **النسخ الاحتياطية**
```bash
# نسخة احتياطية يدوية
docker exec fsmi-backend tar czf /tmp/backup.tar.gz /app/data /app/uploads
docker cp fsmi-backend:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz

# استعادة النسخة الاحتياطية
docker cp backup-20260119.tar.gz fsmi-backend:/tmp/
docker exec fsmi-backend tar xzf /tmp/backup-20260119.tar.gz -C /
```

## استكشاف الأخطاء

### 1. **مشاكل شائعة**

#### التطبيق لا يعمل
```bash
# فحص حالة الحاويات
docker-compose ps

# فحص السجلات
docker-compose logs

# فحص الشبكة
docker network ls
docker network inspect fsmi-tv-ha_fsmi-network
```

#### مشاكل قاعدة البيانات
```bash
# الدخول لحاوية الخادم
docker exec -it fsmi-backend sh

# فحص قاعدة البيانات
ls -la /app/data/
sqlite3 /app/data/fsmi_database.sqlite ".tables"
```

#### مشاكل الملفات المرفوعة
```bash
# فحص مجلد الملفات
docker exec -it fsmi-backend ls -la /app/uploads/

# فحص الصلاحيات
docker exec -it fsmi-backend ls -la /app/
```

### 2. **مشاكل الشبكة**
```bash
# فحص الاتصال بين الحاويات
docker exec -it fsmi-frontend ping backend
docker exec -it fsmi-backend ping frontend

# فحص المنافذ
netstat -tlnp | grep :80
netstat -tlnp | grep :3001
```

### 3. **مشاكل الأداء**
```bash
# مراقبة استخدام الموارد
docker stats --no-stream

# فحص مساحة القرص
df -h
docker system df

# تنظيف الملفات المؤقتة
docker system prune -f
docker volume prune -f
```

## الأمان

### 1. **إعدادات الجدار الناري**
```bash
# Ubuntu UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS Firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. **تحديثات الأمان**
```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تحديث Docker
sudo apt update && sudo apt install docker-ce docker-ce-cli containerd.io

# تحديث التطبيق
git pull
docker-compose up --build -d
```

### 3. **مراقبة السجلات**
```bash
# مراقبة محاولات الدخول
sudo tail -f /var/log/auth.log

# مراقبة سجلات Nginx
sudo tail -f /var/log/nginx/fsmi.access.log
sudo tail -f /var/log/nginx/fsmi.error.log

# مراقبة سجلات التطبيق
docker-compose logs -f --tail=100
```

## التحسينات

### 1. **تحسين الأداء**
```yaml
# في docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 2. **تحسين التخزين المؤقت**
```nginx
# في nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. **ضغط البيانات**
```nginx
# تفعيل ضغط Gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
```

## الصيانة الدورية

### 1. **مهام يومية**
- فحص حالة الخدمات
- مراجعة السجلات
- مراقبة استخدام الموارد

### 2. **مهام أسبوعية**
- تنظيف الملفات المؤقتة
- فحص النسخ الاحتياطية
- تحديث النظام

### 3. **مهام شهرية**
- تحديث Docker والتطبيق
- مراجعة الأمان
- تحسين الأداء

## معلومات الاتصال

### URLs مهمة:
- **التطبيق الرئيسي**: https://fsmi.yourdomain.com
- **لوحة التحكم**: https://fsmi.yourdomain.com/#/admin
- **Health Check**: https://fsmi.yourdomain.com/health
- **API Health**: https://fsmi.yourdomain.com/api/health

### بيانات الدخول الافتراضية:
- **المشرف**: admin / admin2025

### مجلدات مهمة:
- **قاعدة البيانات**: `/opt/fsmi-incentives-tracker/server/data/`
- **الملفات المرفوعة**: `/opt/fsmi-incentives-tracker/server/uploads/`
- **النسخ الاحتياطية**: `/opt/backups/fsmi-tv-ha/`
- **سجلات Nginx**: `/var/log/nginx/`

---

**تاريخ الإنشاء**: 19 يناير 2026  
**الإصدار**: 1.0  
**المطور**: Kiro AI Assistant