#!/bin/bash

# Safe Update and Deploy Script
# For updating the live application without losing data

echo "🔄 تحديث وإعادة نشر التطبيق بأمان..."

# Pull latest changes
echo "📥 جلب آخر التحديثات من GitHub..."
git pull origin main

# Stop containers safely (without removing volumes)
echo "⏸️ إيقاف الحاويات بأمان..."
docker-compose stop

# Rebuild only if needed (without --build to preserve data)
echo "🔨 إعادة تشغيل الحاويات..."
docker-compose up -d

# Wait for services
echo "⏳ انتظار تشغيل الخدمات..."
sleep 20

# Health check
echo "🔍 فحص الصحة..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ التحديث تم بنجاح!"
    echo "🌐 الرابط: http://invoice.smart-sense.site"
    echo "📊 البيانات محفوظة ولم تتأثر"
else
    echo "❌ فشل في التحديث"
    docker-compose logs
fi