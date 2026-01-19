# دليل النشر - FSMI TV & HA By SmartSense

## 🚀 نشر النظام على خادم

### الطريقة 1: نشر كامل (Frontend + Backend)

#### 1. بناء Frontend
```bash
npm run build
```

#### 2. نسخ الملفات
```bash
# نسخ ملفات Frontend المبنية
cp -r dist/ /path/to/server/public/

# نسخ ملفات Backend
cp -r server/ /path/to/server/
```

#### 3. تثبيت تبعيات الخادم
```bash
cd /path/to/server
npm install
```

#### 4. تشغيل الخادم
```bash
npm start
```

---

### الطريقة 2: نشر منفصل

#### Frontend (Nginx/Apache)
1. بناء المشروع: `npm run build`
2. رفع مجلد `dist/` إلى خادم الويب
3. تكوين البروكسي للـ API:
```nginx
location /api {
    proxy_pass http://localhost:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

#### Backend (Node.js Server)
1. نسخ مجلد `server/` إلى الخادم
2. تثبيت التبعيات: `npm install`
3. تشغيل الخادم: `npm start`

---

## 🐳 نشر باستخدام Docker

### إنشاء Dockerfile للخادم
```dockerfile
FROM node:18-alpine

WORKDIR /app

# نسخ ملفات package.json
COPY server/package*.json ./
RUN npm install

# نسخ ملفات الخادم
COPY server/ ./

# إنشاء مجلد الملفات
RUN mkdir -p uploads

EXPOSE 3001

CMD ["npm", "start"]
```

### تشغيل Docker
```bash
# بناء الصورة
docker build -t fsmi-server .

# تشغيل الحاوية
docker run -d -p 3001:3001 -v $(pwd)/data:/app/uploads fsmi-server
```

---

## ⚙️ متغيرات البيئة

إنشاء ملف `.env` في مجلد `server/`:

```env
# منفذ الخادم
PORT=3001

# مسار قاعدة البيانات
DB_PATH=./fsmi_database.sqlite

# مجلد الملفات
UPLOADS_DIR=./uploads

# بيئة التشغيل
NODE_ENV=production
```

---

## 🔧 إعدادات الإنتاج

### 1. تأمين الخادم
```javascript
// في server/index.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// إضافة الحماية
app.use(helmet());

// تحديد معدل الطلبات
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100 // حد أقصى 100 طلب لكل IP
});
app.use(limiter);
```

### 2. تسجيل الأخطاء
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 3. إدارة العمليات
```bash
# استخدام PM2 لإدارة العمليات
npm install -g pm2

# تشغيل الخادم
pm2 start server/index.js --name fsmi-server

# حفظ التكوين
pm2 save
pm2 startup
```

---

## 📊 مراقبة النظام

### 1. فحص حالة الخادم
```bash
curl http://localhost:3001/api/submissions
```

### 2. فحص قاعدة البيانات
```bash
sqlite3 server/fsmi_database.sqlite ".tables"
sqlite3 server/fsmi_database.sqlite "SELECT COUNT(*) FROM submissions;"
```

### 3. فحص مساحة القرص
```bash
du -sh server/uploads/
```

---

## 🔄 النسخ الاحتياطي

### نسخ احتياطي يومي
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"

# نسخ قاعدة البيانات
cp server/fsmi_database.sqlite "$BACKUP_DIR/db_$DATE.sqlite"

# نسخ الملفات
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" server/uploads/

# حذف النسخ القديمة (أكثر من 30 يوم)
find "$BACKUP_DIR" -name "*.sqlite" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

### إعداد Cron Job
```bash
# تشغيل النسخ الاحتياطي يومياً في الساعة 2:00 صباحاً
0 2 * * * /path/to/backup.sh
```

---

## 🚨 استكشاف أخطاء الإنتاج

### 1. فحص السجلات
```bash
# سجلات PM2
pm2 logs fsmi-server

# سجلات النظام
tail -f /var/log/syslog | grep fsmi
```

### 2. فحص الأداء
```bash
# استخدام الذاكرة
pm2 monit

# استخدام القرص
df -h
```

### 3. إعادة تشغيل الخدمة
```bash
pm2 restart fsmi-server
```