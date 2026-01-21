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
  
  // إضافة بيانات تجريبية فقط إذا لم تكن موجودة
  db.get("SELECT COUNT(*) as count FROM employees", (err, row) => {
    if (err) {
      console.error('خطأ في فحص البيانات:', err);
      return;
    }
    
    // إضافة بيانات تجريبية فقط إذا كانت قاعدة البيانات فارغة
    if (row.count === 0) {
      db.run(
        `INSERT INTO employees (id, email, name, mobile, serial, storeName, storeCode, createdAt, updatedAt) 
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
    } else {
      console.log('📊 قاعدة البيانات تحتوي على بيانات موجودة، لن يتم إضافة بيانات تجريبية');
    }
  });

  // إضافة موديلات افتراضية فقط إذا لم تكن موجودة
  db.get("SELECT COUNT(*) as count FROM models", (err, row) => {
    if (err) {
      console.error('خطأ في فحص الموديلات:', err);
      return;
    }
    
    // لا نضيف موديلات افتراضية - يتم إضافتها من واجهة إدارة الموديلات
    console.log('📋 جدول الموديلات جاهز للاستخدام');
  });
});

export default db;