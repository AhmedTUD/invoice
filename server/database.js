import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// إنشاء قاعدة البيانات
const dbPath = join(__dirname, 'fsmi_database.sqlite');
const db = new sqlite3.Database(dbPath);

// إنشاء الجداول
db.serialize(() => {
  // جدول الموظفين (جديد)
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      serial TEXT NOT NULL,
      storeName TEXT NOT NULL,
      storeCode TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  // جدول الطلبات الأساسية
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      employeeId TEXT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      serial TEXT NOT NULL,
      storeName TEXT NOT NULL,
      storeCode TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (employeeId) REFERENCES employees (id)
    )
  `);

  // إضافة العمود الجديد إذا لم يكن موجوداً
  db.run(`
    ALTER TABLE submissions ADD COLUMN employeeId TEXT
  `, (err) => {
    // تجاهل الخطأ إذا كان العمود موجوداً بالفعل
    if (err && !err.message.includes('duplicate column name')) {
      console.error('خطأ في إضافة العمود:', err);
    }
  });

  // جدول الفواتير
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      submissionId TEXT NOT NULL,
      model TEXT NOT NULL,
      salesDate TEXT NOT NULL,
      fileName TEXT NOT NULL,
      filePath TEXT NOT NULL,
      FOREIGN KEY (submissionId) REFERENCES submissions (id)
    )
  `);

  // جدول إعدادات المدير (جديد)
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL DEFAULT 'admin',
      password TEXT NOT NULL DEFAULT 'admin2025',
      updatedAt TEXT NOT NULL
    )
  `);

  // جدول جلسات المدير (جديد)
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      sessionToken TEXT UNIQUE NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // جدول الموديلات (جديد)
  db.run(`
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);

  console.log('✅ تم إنشاء قاعدة البيانات والجداول بنجاح');
  
  // إضافة بيانات المدير الافتراضية
  db.run(
    `INSERT OR IGNORE INTO admin_settings (id, username, password, updatedAt) 
     VALUES (1, 'admin', 'admin2025', ?)`,
    [new Date().toISOString()],
    function(err) {
      if (err) {
        console.error('خطأ في إضافة إعدادات المدير:', err);
      } else {
        console.log('✅ تم إضافة إعدادات المدير الافتراضية');
      }
    }
  );
  
  // إضافة بيانات تجريبية عند بدء التشغيل
  db.run(
    `INSERT OR REPLACE INTO employees (id, email, name, mobile, serial, storeName, storeCode, createdAt, updatedAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'test-employee-id',
      'test@example.com',
      'موظف تجريبي',
      '01000000000',
      'EMP-123',
      'فرع القاهرة',
      'CAI-01',
      new Date().toISOString(),
      new Date().toISOString()
    ],
    function(err) {
      if (err) {
        console.error('خطأ في إضافة البيانات التجريبية:', err);
      } else {
        console.log('✅ تم إضافة البيانات التجريبية بنجاح');
      }
    }
  );

  // إضافة موديلات افتراضية
  const defaultModels = [
    { id: 'model-1', name: 'RS68AB820B1/MR', category: 'ثلاجات', description: 'ثلاجة سامسونج 820 لتر' },
    { id: 'model-2', name: 'WW11B944DGB/AS', category: 'غسالات', description: 'غسالة سامسونج 11 كيلو' },
    { id: 'model-3', name: 'AR12TXHQASINMG', category: 'تكييفات', description: 'تكييف سامسونج 12 وحدة' },
    { id: 'model-4', name: 'UE55AU7000UXEG', category: 'تلفزيونات', description: 'تلفزيون سامسونج 55 بوصة' },
    { id: 'model-5', name: 'MS23K3513AS/EG', category: 'ميكروويف', description: 'ميكروويف سامسونج 23 لتر' }
  ];

  defaultModels.forEach(model => {
    db.run(
      `INSERT OR IGNORE INTO models (id, name, category, description, isActive, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [
        model.id,
        model.name,
        model.category,
        model.description,
        new Date().toISOString(),
        new Date().toISOString()
      ],
      function(err) {
        if (err) {
          console.error('خطأ في إضافة الموديل:', model.name, err);
        }
      }
    );
  });

  console.log('✅ تم إضافة الموديلات الافتراضية');
});

export default db;