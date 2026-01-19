#!/bin/bash

# Complete Setup Script for FSMI TV & HA Invoice System
# This script handles both Git setup and server deployment

echo "🚀 الإعداد الكامل لنظام FSMI TV & HA Invoice"
echo "================================================"

# Check if we're on local machine or server
if [ -f "git-setup.sh" ]; then
    echo "📍 تم اكتشاف البيئة المحلية"
    
    # Step 1: Git setup
    echo ""
    echo "📋 الخطوة 1: رفع المشروع إلى GitHub"
    read -p "هل تريد رفع المشروع إلى GitHub؟ (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        chmod +x git-setup.sh
        ./git-setup.sh
    fi
    
    # Step 2: Server deployment instructions
    echo ""
    echo "📋 الخطوة 2: النشر على السيرفر"
    echo "لنشر المشروع على السيرفر، قم بتشغيل الأوامر التالية على السيرفر:"
    echo ""
    echo "ssh your-server"
    echo "wget https://raw.githubusercontent.com/AhmedTUD/invoice/main/server-deploy.sh"
    echo "chmod +x server-deploy.sh"
    echo "./server-deploy.sh"
    echo ""
    echo "أو استخدم:"
    echo "curl -sSL https://raw.githubusercontent.com/AhmedTUD/invoice/main/server-deploy.sh | bash"
    
else
    echo "📍 تم اكتشاف بيئة السيرفر"
    
    # Download and run server deployment
    echo "📥 تحميل وتشغيل سكريبت النشر..."
    
    if [ ! -f "server-deploy.sh" ]; then
        wget https://raw.githubusercontent.com/AhmedTUD/invoice/main/server-deploy.sh
        chmod +x server-deploy.sh
    fi
    
    ./server-deploy.sh
fi

echo ""
echo "✅ الإعداد مكتمل!"
echo "🌐 الرابط: http://invoice.smart-sense.site"
echo "👨‍💼 لوحة التحكم: http://invoice.smart-sense.site/#/admin"
echo "🔑 بيانات المشرف: admin / admin2025"