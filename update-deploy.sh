#!/bin/bash

# Quick Update and Deploy Script
# For updating the live application

echo "🔄 تحديث وإعادة نشر التطبيق..."

# Pull latest changes
echo "📥 جلب آخر التحديثات من GitHub..."
git pull origin main

# Rebuild and restart containers
echo "🔨 إعادة بناء وتشغيل الحاويات..."
docker-compose down
docker-compose up --build -d

# Wait for services
echo "⏳ انتظار تشغيل الخدمات..."
sleep 20

# Health check
echo "🔍 فحص الصحة..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ التحديث تم بنجاح!"
    echo "🌐 الرابط: http://invoice.smart-sense.site"
else
    echo "❌ فشل في التحديث"
    docker-compose logs
fi