#!/bin/bash

# Quick Deploy Script for FSMI TV & HA
# Usage: ./quick-deploy.sh

echo "🚀 بدء النشر السريع لـ FSMI TV & HA..."

# Stop existing containers
echo "🛑 إيقاف الحاويات الموجودة..."
docker-compose down

# Build and start
echo "🔨 بناء وتشغيل الحاويات..."
docker-compose up --build -d

# Wait for services
echo "⏳ انتظار تشغيل الخدمات..."
sleep 20

# Check health
echo "🔍 فحص حالة الخدمات..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ التطبيق يعمل بنجاح!"
    echo "🌐 الرابط: http://localhost"
    echo "👨‍💼 لوحة التحكم: http://localhost/#/admin"
    echo "🔑 بيانات المشرف: admin / admin2025"
else
    echo "❌ فشل في تشغيل التطبيق"
    echo "📋 عرض السجلات:"
    docker-compose logs
fi