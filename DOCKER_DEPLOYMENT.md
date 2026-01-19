# نشر FSMI TV & HA على Docker - دليل سريع

## 🚀 النشر السريع

### 1. رفع الملفات للسيرفر
```bash
# رفع المشروع للسيرفر
scp -r . user@your-server:/opt/fsmi-tv-ha/
# أو
rsync -av --exclude node_modules . user@your-server:/opt/fsmi-tv-ha/
```

### 2. تشغيل النشر
```bash
# الدخول للسيرفر
ssh user@your-server
cd /opt/fsmi-tv-ha

# جعل السكريبتات قابلة للتنفيذ
chmod +x *.sh

# النشر السريع (للاختبار)
./quick-deploy.sh

# أو النشر الكامل مع الدومين
./deploy.sh fsmi.yourdomain.com
```

## 📋 متطلبات السيرفر

- **OS**: Ubuntu 20.04+ / CentOS 8+
- **RAM**: 2GB+ (4GB مُوصى به)
- **Storage**: 20GB+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

## 🔧 إعداد السيرفر

### تثبيت Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# تثبيت Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.15.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# إعادة تسجيل الدخول
logout
```

### إعداد Nginx (للدومين الفرعي)
```bash
sudo apt install nginx

# إنشاء إعداد الموقع
sudo nano /etc/nginx/sites-available/fsmi

# إضافة المحتوى:
server {
    listen 80;
    server_name fsmi.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}

# تفعيل الموقع
sudo ln -s /etc/nginx/sites-available/fsmi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🌐 الوصول للتطبيق

بعد النشر الناجح:

- **الرابط الرئيسي**: http://your-server-ip أو http://fsmi.yourdomain.com
- **لوحة التحكم**: http://your-server-ip/#/admin
- **بيانات المشرف**: admin / admin2025

## 📱 للموظفين

### تثبيت التطبيق على الموبايل:

#### Android (Chrome):
1. افتح الرابط في Chrome
2. انقر "تثبيت التطبيق" عند ظهور الرسالة
3. أو من قائمة Chrome → "إضافة إلى الشاشة الرئيسية"

#### iPhone (Safari):
1. افتح الرابط في Safari
2. انقر زر المشاركة (المربع مع السهم)
3. اختر "إضافة إلى الشاشة الرئيسية"

## 🔧 إدارة التطبيق

### أوامر مفيدة:
```bash
# عرض حالة الحاويات
docker-compose ps

# عرض السجلات
docker-compose logs -f

# إعادة تشغيل
docker-compose restart

# إيقاف التطبيق
docker-compose down

# تحديث التطبيق
git pull  # إذا كنت تستخدم Git
docker-compose up --build -d
```

### النسخ الاحتياطية:
```bash
# نسخة احتياطية يدوية
docker exec fsmi-backend tar czf /tmp/backup.tar.gz /app/data /app/uploads
docker cp fsmi-backend:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz
```

## 🆘 استكشاف الأخطاء

### التطبيق لا يعمل:
```bash
# فحص الحاويات
docker-compose ps

# فحص السجلات
docker-compose logs

# إعادة البناء
docker-compose down
docker-compose up --build -d
```

### مشاكل الاتصال:
```bash
# فحص المنافذ
netstat -tlnp | grep :80
netstat -tlnp | grep :3001

# فحص الجدار الناري
sudo ufw status
```

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من السجلات: `docker-compose logs`
2. تأكد من تشغيل Docker: `docker --version`
3. فحص المساحة المتاحة: `df -h`
4. إعادة تشغيل الخدمات: `docker-compose restart`

---

**ملاحظة**: تأكد من تغيير كلمة مرور المشرف الافتراضية بعد أول تسجيل دخول!