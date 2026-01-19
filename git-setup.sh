#!/bin/bash

# Git Setup Script for FSMI TV & HA Invoice System
# Repository: https://github.com/AhmedTUD/invoice.git

echo "🚀 إعداد Git ورفع المشروع..."

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📁 تهيئة مستودع Git..."
    git init
fi

# Add remote origin
echo "🔗 إضافة المستودع البعيد..."
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/AhmedTUD/invoice.git

# Create .gitignore if not exists
if [ ! -f ".gitignore" ]; then
    echo "📝 إنشاء ملف .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Production builds
dist/
build/

# Environment variables
.env*

# Database files
*.sqlite
*.db
server/data/
server/uploads/

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Temporary files
tmp/
temp/
EOF
fi

# Add all files
echo "📦 إضافة الملفات..."
git add .

# Commit
echo "💾 إنشاء commit..."
git commit -m "Initial commit: FSMI TV & HA Invoice Tracking System

✨ Features:
- Progressive Web App (PWA) with offline support
- Employee data entry with auto-save
- Multi-invoice support with image uploads
- Admin dashboard with advanced filtering
- Excel export with embedded images
- ZIP export with organized folder structure
- Model management system
- Smart data deletion (filtered/bulk)
- Secure admin sessions
- Responsive design for all devices

🔧 Tech Stack:
- Frontend: React 19 + TypeScript + Tailwind CSS
- Backend: Node.js + Express + SQLite
- DevOps: Docker + Nginx + Let's Encrypt
- PWA: Service Worker + Web App Manifest

🌐 Live Demo: http://invoice.smart-sense.site
👨‍💼 Admin Panel: http://invoice.smart-sense.site/#/admin
🔑 Default Login: admin / admin2025"

# Push to GitHub
echo "🚀 رفع المشروع إلى GitHub..."
git branch -M main
git push -u origin main --force

echo "✅ تم رفع المشروع بنجاح إلى GitHub!"
echo "🔗 رابط المستودع: https://github.com/AhmedTUD/invoice"
echo ""
echo "📋 الخطوات التالية:"
echo "1. تحقق من المستودع على GitHub"
echo "2. قم بنشر المشروع على السيرفر باستخدام:"
echo "   ./server-deploy.sh"
echo ""