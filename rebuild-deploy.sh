#!/bin/bash

# Full Rebuild Deploy Script (Use only when necessary)
# WARNING: This may affect data if not used carefully

echo "⚠️ تحديث مع إعادة بناء كاملة - استخدم بحذر!"
echo "📋 هذا السكريبت يعيد بناء الحاويات بالكامل"

# Confirm with user
read -p "هل أنت متأكد من المتابعة؟ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ تم إلغاء العملية"
    exit 1
fi

# Create backup first
echo "💾 عمل نسخة احتياطية..."
tar -czf backup-before-rebuild-$(date +%Y%m%d-%H%M%S).tar.gz server/data server/uploads

# Pull latest changes
echo "📥 جلب آخر التحديثات من GitHub..."
git pull origin main

# Full rebuild (use with caution)
echo "🔨 إعادة بناء كاملة للحاويات..."
docker-compose down
docker-compose up --build -d

# Wait for services
echo "⏳ انتظار تشغيل الخدمات..."
sleep 30

# Health check
echo "🔍 فحص الصحة..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ إعادة البناء تمت بنجاح!"
    echo "🌐 الرابط: http://invoice.smart-sense.site"
    echo "⚠️ تحقق من البيانات للتأكد من سلامتها"
else
    echo "❌ فشل في إعادة البناء"
    docker-compose logs
fi