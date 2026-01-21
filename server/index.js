import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// إعداد CORS
app.use(cors());
app.use(express.json());

// إنشاء مجلد الملفات إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعداد multer لرفع الملفات
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'));
    }
  }
});

// تقديم الملفات المرفوعة
app.use('/uploads', express.static(uploadsDir));

// API لحفظ طلب جديد
app.post('/api/submissions', upload.array('invoiceFiles'), (req, res) => {
  try {
    const { basicData, invoicesData } = req.body;
    const files = req.files;
    
    const submissionId = uuidv4();
    const now = new Date().toISOString();
    
    // تحليل البيانات الأساسية
    const parsedBasicData = JSON.parse(basicData);
    const parsedInvoicesData = JSON.parse(invoicesData);
    
    // أولاً: حفظ أو تحديث بيانات الموظف
    const employeeId = uuidv4();
    
    db.run(
      `INSERT OR REPLACE INTO employees (id, email, name, mobile, serial, storeName, storeCode, createdAt, updatedAt) 
       VALUES (
         COALESCE((SELECT id FROM employees WHERE email = ?), ?),
         ?, ?, ?, ?, ?, ?, 
         COALESCE((SELECT createdAt FROM employees WHERE email = ?), ?),
         ?
       )`,
      [
        parsedBasicData.email, employeeId,
        parsedBasicData.email,
        parsedBasicData.name,
        parsedBasicData.mobile,
        parsedBasicData.serial,
        parsedBasicData.storeName,
        parsedBasicData.storeCode,
        parsedBasicData.email, now,
        now
      ],
      function(err) {
        if (err) {
          console.error('خطأ في حفظ بيانات الموظف:', err);
          return res.status(500).json({ success: false, message: 'خطأ في حفظ بيانات الموظف' });
        }
        
        // الحصول على ID الموظف
        db.get(
          'SELECT id FROM employees WHERE email = ?',
          [parsedBasicData.email],
          (err, employee) => {
            if (err) {
              console.error('خطأ في جلب بيانات الموظف:', err);
              return res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الموظف' });
            }
            
            // حفظ الطلب الأساسي
            db.run(
              `INSERT INTO submissions (id, employeeId, email, name, mobile, serial, storeName, storeCode, createdAt) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                submissionId,
                employee.id,
                parsedBasicData.email,
                parsedBasicData.name,
                parsedBasicData.mobile,
                parsedBasicData.serial,
                parsedBasicData.storeName,
                parsedBasicData.storeCode,
                now
              ],
              function(err) {
                if (err) {
                  console.error('خطأ في حفظ الطلب:', err);
                  return res.status(500).json({ success: false, message: 'خطأ في حفظ البيانات' });
                }
                
                // حفظ الفواتير
                let savedInvoices = 0;
                const totalInvoices = parsedInvoicesData.length;
                
                if (totalInvoices === 0) {
                  return res.json({ 
                    success: true, 
                    message: 'تم حفظ البيانات بنجاح في قاعدة البيانات' 
                  });
                }
                
                parsedInvoicesData.forEach((invoice, index) => {
                  const invoiceId = uuidv4();
                  const file = files[index];
                  const filePath = file ? `/uploads/${file.filename}` : '';
                  
                  db.run(
                    `INSERT INTO invoices (id, submissionId, model, salesDate, fileName, filePath) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                      invoiceId,
                      submissionId,
                      invoice.model,
                      invoice.salesDate,
                      file ? file.originalname : '',
                      filePath
                    ],
                    function(err) {
                      if (err) {
                        console.error('خطأ في حفظ الفاتورة:', err);
                      }
                      
                      savedInvoices++;
                      if (savedInvoices === totalInvoices) {
                        res.json({ 
                          success: true, 
                          message: 'تم حفظ البيانات بنجاح في قاعدة البيانات' 
                        });
                      }
                    }
                  );
                });
              }
            );
          }
        );
      }
    );
    
  } catch (error) {
    console.error('خطأ في معالجة الطلب:', error);
    res.status(500).json({ success: false, message: 'خطأ في معالجة الطلب' });
  }
});

// API لجلب صورة كـ Base64 (جديد)
app.get('/api/image/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
    
    // تحقق من وجود الملف
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }
    
    // قراءة الملف وتحويله إلى Base64
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
    const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    
    res.json({ success: true, data: base64Data });
    
  } catch (error) {
    console.error('خطأ في جلب الصورة:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الصورة' });
  }
});

// API لجلب جميع الطلبات (للمشرفين)
app.get('/api/submissions', async (req, res) => {
  const query = `
    SELECT 
      s.id as submissionId,
      s.email,
      s.name,
      s.mobile,
      s.serial,
      s.storeName,
      s.storeCode,
      s.createdAt as submissionDate,
      i.id as invoiceId,
      i.model,
      i.salesDate,
      i.fileName,
      i.filePath
    FROM submissions s
    LEFT JOIN invoices i ON s.id = i.submissionId
    ORDER BY s.createdAt DESC
  `;
  
  db.all(query, [], async (err, rows) => {
    if (err) {
      console.error('خطأ في جلب البيانات:', err);
      return res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
    }
    
    // تحويل البيانات وإضافة Base64 للصور
    const joinedRecords = await Promise.all(rows.map(async (row) => {
      let fileDataUrl = '';
      
      if (row.filePath) {
        try {
          // إنشاء مسار كامل للملف - إصلاح المسار
          const fullPath = path.join(__dirname, 'uploads', path.basename(row.filePath));
          
          console.log(`🔍 محاولة قراءة الملف: ${fullPath}`);
          console.log(`📁 الملف موجود: ${fs.existsSync(fullPath)}`);
          
          if (fs.existsSync(fullPath)) {
            const fileBuffer = fs.readFileSync(fullPath);
            
            // تحديد نوع الملف بدقة أكبر
            let mimeType = 'image/jpeg'; // افتراضي
            if (row.fileName) {
              const ext = row.fileName.toLowerCase();
              if (ext.endsWith('.png')) {
                mimeType = 'image/png';
              } else if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
                mimeType = 'image/jpeg';
              } else if (ext.endsWith('.pdf')) {
                mimeType = 'application/pdf';
              }
            }
            
            fileDataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
            console.log(`✅ تم تحويل الملف إلى Base64: ${row.fileName} - النوع: ${mimeType} - الحجم: ${fileBuffer.length} بايت`);
          } else {
            console.log(`❌ الملف غير موجود: ${fullPath}`);
            // محاولة البحث في مجلد uploads مباشرة
            const alternativePath = path.join(__dirname, 'uploads');
            const files = fs.readdirSync(alternativePath);
            console.log(`📂 الملفات الموجودة في uploads:`, files);
          }
        } catch (error) {
          console.error('❌ خطأ في قراءة الملف:', error);
          console.log(`🔍 المسار المحاول: ${row.filePath}`);
        }
      }
      
      return {
        email: row.email,
        name: row.name,
        mobile: row.mobile,
        serial: row.serial,
        storeName: row.storeName,
        storeCode: row.storeCode,
        submissionId: row.submissionId,
        submissionDate: row.submissionDate,
        invoiceId: row.invoiceId,
        model: row.model,
        salesDate: row.salesDate,
        fileName: row.fileName,
        fileDataUrl: fileDataUrl
      };
    }));
    
    console.log(`📊 إجمالي السجلات: ${joinedRecords.length}`);
    console.log(`🖼️ السجلات مع صور: ${joinedRecords.filter(r => r.fileDataUrl && r.fileDataUrl.startsWith('data:')).length}`);
    
    res.json({ success: true, data: joinedRecords });
  });
});

// API للبحث عن الموظفين بالإيميل (جديد)
app.get('/api/employees/search', (req, res) => {
  const { email } = req.query;
  
  // البحث فقط إذا كان الإيميل يحتوي على @ وطوله أكبر من 5 أحرف
  if (!email || !email.includes('@') || email.length < 5) {
    return res.json({ success: true, data: [] });
  }
  
  db.all(
    'SELECT email, name, mobile, serial, storeName, storeCode FROM employees WHERE email LIKE ? ORDER BY updatedAt DESC LIMIT 10',
    [`%${email}%`],
    (err, rows) => {
      if (err) {
        console.error('خطأ في البحث عن الموظفين:', err);
        return res.status(500).json({ success: false, message: 'خطأ في البحث' });
      }
      
      res.json({ success: true, data: rows });
    }
  );
});

// API لجلب بيانات موظف محدد (جديد)
app.get('/api/employees/:email', (req, res) => {
  const { email } = req.params;
  
  db.get(
    'SELECT email, name, mobile, serial, storeName, storeCode FROM employees WHERE email = ?',
    [email],
    (err, row) => {
      if (err) {
        console.error('خطأ في جلب بيانات الموظف:', err);
        return res.status(500).json({ success: false, message: 'خطأ في جلب البيانات' });
      }
      
      if (!row) {
        return res.status(404).json({ success: false, message: 'الموظف غير موجود' });
      }
      
      res.json({ success: true, data: row });
    }
  );
});

// API لمسح جميع البيانات
app.delete('/api/submissions', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM invoices', (err) => {
      if (err) {
        console.error('خطأ في مسح الفواتير:', err);
        return res.status(500).json({ success: false, message: 'خطأ في مسح البيانات' });
      }
      
      db.run('DELETE FROM submissions', (err) => {
        if (err) {
          console.error('خطأ في مسح الطلبات:', err);
          return res.status(500).json({ success: false, message: 'خطأ في مسح البيانات' });
        }
        
        db.run('DELETE FROM employees', (err) => {
          if (err) {
            console.error('خطأ في مسح الموظفين:', err);
            return res.status(500).json({ success: false, message: 'خطأ في مسح البيانات' });
          }
          
          // مسح ملفات الصور
          try {
            const files = fs.readdirSync(uploadsDir);
            files.forEach(file => {
              if (file !== '.gitkeep') {
                fs.unlinkSync(path.join(uploadsDir, file));
              }
            });
          } catch (error) {
            console.error('خطأ في مسح الملفات:', error);
          }
          
          res.json({ success: true, message: 'تم مسح جميع البيانات بنجاح' });
        });
      });
    });
  });
});

// API لمسح البيانات المفلترة
app.delete('/api/submissions/filtered', (req, res) => {
  const { sessionToken, filters } = req.body;
  
  // التحقق من الجلسة
  db.get(
    'SELECT * FROM admin_sessions WHERE sessionToken = ? AND expiresAt > ?',
    [sessionToken, new Date().toISOString()],
    (err, session) => {
      if (err || !session) {
        return res.status(401).json({ success: false, message: 'جلسة غير صالحة' });
      }
      
      // بناء استعلام البحث بناءً على الفلاتر
      let whereConditions = [];
      let queryParams = [];
      
      if (filters.name) {
        whereConditions.push('s.name LIKE ?');
        queryParams.push(`%${filters.name}%`);
      }
      
      if (filters.serial) {
        whereConditions.push('s.serial LIKE ?');
        queryParams.push(`%${filters.serial}%`);
      }
      
      if (filters.store) {
        whereConditions.push('(s.storeName LIKE ? OR s.storeCode LIKE ?)');
        queryParams.push(`%${filters.store}%`, `%${filters.store}%`);
      }
      
      if (filters.model) {
        whereConditions.push('i.model LIKE ?');
        queryParams.push(`%${filters.model}%`);
      }
      
      // فلاتر التاريخ
      if (filters.dateFrom) {
        whereConditions.push('i.salesDate >= ?');
        queryParams.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        whereConditions.push('i.salesDate <= ?');
        queryParams.push(filters.dateTo);
      }
      
      // إذا لم تكن هناك فلاتر، احذف جميع البيانات
      if (whereConditions.length === 0) {
        // استخدام نفس منطق حذف جميع البيانات
        db.serialize(() => {
          db.run('DELETE FROM invoices', (err) => {
            if (err) {
              console.error('خطأ في مسح الفواتير:', err);
              return res.status(500).json({ success: false, message: 'خطأ في مسح البيانات' });
            }
            
            db.run('DELETE FROM submissions', (err) => {
              if (err) {
                console.error('خطأ في مسح الطلبات:', err);
                return res.status(500).json({ success: false, message: 'خطأ في مسح البيانات' });
              }
              
              db.run('DELETE FROM employees', (err) => {
                if (err) {
                  console.error('خطأ في مسح الموظفين:', err);
                  return res.status(500).json({ success: false, message: 'خطأ في مسح البيانات' });
                }
                
                // مسح ملفات الصور
                try {
                  const files = fs.readdirSync(uploadsDir);
                  files.forEach(file => {
                    if (file !== '.gitkeep') {
                      fs.unlinkSync(path.join(uploadsDir, file));
                    }
                  });
                } catch (error) {
                  console.error('خطأ في مسح الملفات:', error);
                }
                
                res.json({ success: true, message: 'تم مسح جميع البيانات بنجاح' });
              });
            });
          });
        });
        return;
      }
      
      // بناء الاستعلام للحصول على الفواتير المفلترة
      const whereClause = whereConditions.join(' AND ');
      const selectQuery = `
        SELECT DISTINCT i.id as invoiceId, i.filePath, s.id as submissionId
        FROM submissions s
        LEFT JOIN invoices i ON s.id = i.submissionId
        WHERE ${whereClause}
      `;
      
      console.log('🔍 استعلام البحث:', selectQuery);
      console.log('📋 معاملات البحث:', queryParams);
      
      // الحصول على قائمة الفواتير والطلبات المفلترة
      db.all(selectQuery, queryParams, (err, filteredRows) => {
        if (err) {
          console.error('خطأ في البحث عن البيانات المفلترة:', err);
          return res.status(500).json({ success: false, message: 'خطأ في البحث عن البيانات' });
        }
        
        console.log(`📊 عدد السجلات المفلترة: ${filteredRows.length}`);
        
        if (filteredRows.length === 0) {
          return res.json({ success: true, message: 'لا توجد بيانات تطابق الفلاتر المحددة' });
        }
        
        // جمع معرفات الفواتير والطلبات
        const invoiceIds = filteredRows.filter(row => row.invoiceId).map(row => row.invoiceId);
        const submissionIds = [...new Set(filteredRows.map(row => row.submissionId))];
        const filePaths = filteredRows.filter(row => row.filePath).map(row => row.filePath);
        
        console.log(`🗂️ فواتير للحذف: ${invoiceIds.length}`);
        console.log(`📝 طلبات للحذف: ${submissionIds.length}`);
        console.log(`📁 ملفات للحذف: ${filePaths.length}`);
        
        // حذف الفواتير المفلترة
        if (invoiceIds.length > 0) {
          const placeholders = invoiceIds.map(() => '?').join(',');
          db.run(
            `DELETE FROM invoices WHERE id IN (${placeholders})`,
            invoiceIds,
            function(err) {
              if (err) {
                console.error('خطأ في حذف الفواتير المفلترة:', err);
                return res.status(500).json({ success: false, message: 'خطأ في حذف الفواتير' });
              }
              
              console.log(`✅ تم حذف ${this.changes} فاتورة`);
              
              // حذف الطلبات المفلترة
              if (submissionIds.length > 0) {
                const submissionPlaceholders = submissionIds.map(() => '?').join(',');
                db.run(
                  `DELETE FROM submissions WHERE id IN (${submissionPlaceholders})`,
                  submissionIds,
                  function(err) {
                    if (err) {
                      console.error('خطأ في حذف الطلبات المفلترة:', err);
                      return res.status(500).json({ success: false, message: 'خطأ في حذف الطلبات' });
                    }
                    
                    console.log(`✅ تم حذف ${this.changes} طلب`);
                    
                    // حذف الملفات المرتبطة
                    let deletedFiles = 0;
                    filePaths.forEach(filePath => {
                      try {
                        const fullPath = path.join(__dirname, 'uploads', path.basename(filePath));
                        if (fs.existsSync(fullPath)) {
                          fs.unlinkSync(fullPath);
                          deletedFiles++;
                        }
                      } catch (error) {
                        console.error('خطأ في حذف الملف:', filePath, error);
                      }
                    });
                    
                    console.log(`🗑️ تم حذف ${deletedFiles} ملف`);
                    
                    res.json({ 
                      success: true, 
                      message: `تم حذف البيانات المفلترة بنجاح (${invoiceIds.length} فاتورة، ${submissionIds.length} طلب، ${deletedFiles} ملف)` 
                    });
                  }
                );
              } else {
                res.json({ 
                  success: true, 
                  message: `تم حذف ${invoiceIds.length} فاتورة بنجاح` 
                });
              }
            }
          );
        } else {
          res.json({ success: true, message: 'لا توجد فواتير للحذف' });
        }
      });
    }
  );
});

// API لإضافة بيانات تجريبية
app.post('/api/test-data', (req, res) => {
  const employeeId = uuidv4();
  const now = new Date().toISOString();
  
  // إضافة موظف تجريبي مباشرة
  db.run(
    `INSERT OR REPLACE INTO employees (id, email, name, mobile, serial, storeName, storeCode, createdAt, updatedAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employeeId,
      'test@example.com',
      'موظف تجريبي',
      '01000000000',
      'EMP-123',
      'فرع القاهرة',
      'CAI-01',
      now,
      now
    ],
    function(err) {
      if (err) {
        console.error('خطأ في إضافة الموظف التجريبي:', err);
        return res.status(500).json({ success: false, message: 'خطأ في إضافة الموظف التجريبي' });
      }
      
      res.json({ success: true, message: 'تم إضافة البيانات التجريبية بنجاح (يمكنك تجربة البحث بـ test@example.com)' });
    }
  );
});

// API لتسجيل دخول المدير
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  // التحقق من بيانات المدير
  db.get(
    'SELECT * FROM admin_settings WHERE username = ? AND password = ?',
    [username, password],
    (err, admin) => {
      if (err) {
        console.error('خطأ في التحقق من بيانات المدير:', err);
        return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
      }
      
      if (!admin) {
        return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
      }
      
      // إنشاء جلسة جديدة
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 ساعة
      const sessionId = uuidv4();
      
      // حفظ الجلسة في قاعدة البيانات
      db.run(
        'INSERT INTO admin_sessions (id, sessionToken, expiresAt, createdAt) VALUES (?, ?, ?, ?)',
        [sessionId, sessionToken, expiresAt, new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('خطأ في حفظ الجلسة:', err);
            return res.status(500).json({ success: false, message: 'خطأ في إنشاء الجلسة' });
          }
          
          console.log('✅ تم إنشاء جلسة جديدة للمدير');
          res.json({ 
            success: true, 
            sessionToken: sessionToken,
            expiresAt: expiresAt,
            message: 'تم تسجيل الدخول بنجاح' 
          });
        }
      );
    }
  );
});

// API للتحقق من صحة الجلسة
app.post('/api/admin/verify-session', (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken) {
    return res.status(401).json({ success: false, message: 'لا توجد جلسة' });
  }
  
  // التحقق من الجلسة وانتهاء صلاحيتها
  db.get(
    'SELECT * FROM admin_sessions WHERE sessionToken = ? AND expiresAt > ?',
    [sessionToken, new Date().toISOString()],
    (err, session) => {
      if (err) {
        console.error('خطأ في التحقق من الجلسة:', err);
        return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
      }
      
      if (!session) {
        return res.status(401).json({ success: false, message: 'جلسة غير صالحة أو منتهية الصلاحية' });
      }
      
      res.json({ success: true, message: 'الجلسة صالحة' });
    }
  );
});

// API لتسجيل خروج المدير
app.post('/api/admin/logout', (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken) {
    return res.json({ success: true, message: 'تم تسجيل الخروج' });
  }
  
  // حذف الجلسة من قاعدة البيانات
  db.run(
    'DELETE FROM admin_sessions WHERE sessionToken = ?',
    [sessionToken],
    function(err) {
      if (err) {
        console.error('خطأ في حذف الجلسة:', err);
        return res.status(500).json({ success: false, message: 'خطأ في تسجيل الخروج' });
      }
      
      console.log('✅ تم حذف جلسة المدير');
      res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
    }
  );
});

// API لتغيير كلمة مرور المدير
app.post('/api/admin/change-password', (req, res) => {
  const { sessionToken, currentPassword, newPassword } = req.body;
  
  // التحقق من الجلسة أولاً
  db.get(
    'SELECT * FROM admin_sessions WHERE sessionToken = ? AND expiresAt > ?',
    [sessionToken, new Date().toISOString()],
    (err, session) => {
      if (err || !session) {
        return res.status(401).json({ success: false, message: 'جلسة غير صالحة' });
      }
      
      // التحقق من كلمة المرور الحالية
      db.get(
        'SELECT * FROM admin_settings WHERE password = ?',
        [currentPassword],
        (err, admin) => {
          if (err) {
            console.error('خطأ في التحقق من كلمة المرور:', err);
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
          }
          
          if (!admin) {
            return res.status(400).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
          }
          
          // تحديث كلمة المرور
          db.run(
            'UPDATE admin_settings SET password = ?, updatedAt = ? WHERE id = 1',
            [newPassword, new Date().toISOString()],
            function(err) {
              if (err) {
                console.error('خطأ في تحديث كلمة المرور:', err);
                return res.status(500).json({ success: false, message: 'خطأ في تحديث كلمة المرور' });
              }
              
              console.log('✅ تم تغيير كلمة مرور المدير');
              res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
            }
          );
        }
      );
    }
  );
});

// API لتنظيف الجلسات المنتهية الصلاحية (يتم تشغيلها دورياً)
const cleanExpiredSessions = () => {
  db.run(
    'DELETE FROM admin_sessions WHERE expiresAt < ?',
    [new Date().toISOString()],
    function(err) {
      if (err) {
        console.error('خطأ في تنظيف الجلسات المنتهية:', err);
      } else if (this.changes > 0) {
        console.log(`🧹 تم حذف ${this.changes} جلسة منتهية الصلاحية`);
      }
    }
  );
};

// تشغيل تنظيف الجلسات كل ساعة
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// ===== APIs إدارة الموديلات =====

// API لجلب جميع الموديلات
app.get('/api/models', (req, res) => {
  db.all(
    'SELECT * FROM models ORDER BY category, name',
    [],
    (err, rows) => {
      if (err) {
        console.error('خطأ في جلب الموديلات:', err);
        return res.status(500).json({ success: false, message: 'خطأ في جلب الموديلات' });
      }
      
      res.json({ success: true, data: rows });
    }
  );
});

// API لإضافة موديل جديد
app.post('/api/models', (req, res) => {
  const { sessionToken, name, category, description } = req.body;
  
  // التحقق من الجلسة
  db.get(
    'SELECT * FROM admin_sessions WHERE sessionToken = ? AND expiresAt > ?',
    [sessionToken, new Date().toISOString()],
    (err, session) => {
      if (err || !session) {
        return res.status(401).json({ success: false, message: 'جلسة غير صالحة' });
      }
      
      // التحقق من عدم وجود موديل بنفس الاسم
      db.get(
        'SELECT * FROM models WHERE name = ?',
        [name],
        (err, existingModel) => {
          if (err) {
            console.error('خطأ في التحقق من الموديل:', err);
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
          }
          
          if (existingModel) {
            return res.status(400).json({ success: false, message: 'يوجد موديل بهذا الاسم بالفعل' });
          }
          
          // إضافة الموديل الجديد
          const modelId = uuidv4();
          const now = new Date().toISOString();
          
          db.run(
            'INSERT INTO models (id, name, category, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)',
            [modelId, name, category, description || '', now, now],
            function(err) {
              if (err) {
                console.error('خطأ في إضافة الموديل:', err);
                return res.status(500).json({ success: false, message: 'خطأ في إضافة الموديل' });
              }
              
              console.log('✅ تم إضافة موديل جديد:', name);
              res.json({ success: true, message: 'تم إضافة الموديل بنجاح', id: modelId });
            }
          );
        }
      );
    }
  );
});

// API لتحديث موديل
app.put('/api/models/:id', (req, res) => {
  const { id } = req.params;
  const { sessionToken, name, category, description, isActive } = req.body;
  
  // التحقق من الجلسة
  db.get(
    'SELECT * FROM admin_sessions WHERE sessionToken = ? AND expiresAt > ?',
    [sessionToken, new Date().toISOString()],
    (err, session) => {
      if (err || !session) {
        return res.status(401).json({ success: false, message: 'جلسة غير صالحة' });
      }
      
      // التحقق من وجود الموديل
      db.get(
        'SELECT * FROM models WHERE id = ?',
        [id],
        (err, model) => {
          if (err) {
            console.error('خطأ في البحث عن الموديل:', err);
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
          }
          
          if (!model) {
            return res.status(404).json({ success: false, message: 'الموديل غير موجود' });
          }
          
          // التحقق من عدم وجود موديل آخر بنفس الاسم
          db.get(
            'SELECT * FROM models WHERE name = ? AND id != ?',
            [name, id],
            (err, existingModel) => {
              if (err) {
                console.error('خطأ في التحقق من الموديل:', err);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
              }
              
              if (existingModel) {
                return res.status(400).json({ success: false, message: 'يوجد موديل آخر بهذا الاسم' });
              }
              
              // تحديث الموديل
              const now = new Date().toISOString();
              
              db.run(
                'UPDATE models SET name = ?, category = ?, description = ?, isActive = ?, updatedAt = ? WHERE id = ?',
                [name, category, description || '', isActive ? 1 : 0, now, id],
                function(err) {
                  if (err) {
                    console.error('خطأ في تحديث الموديل:', err);
                    return res.status(500).json({ success: false, message: 'خطأ في تحديث الموديل' });
                  }
                  
                  console.log('✅ تم تحديث الموديل:', name);
                  res.json({ success: true, message: 'تم تحديث الموديل بنجاح' });
                }
              );
            }
          );
        }
      );
    }
  );
});

// API لحذف فاتورة واحدة فقط (بدون حذف بيانات الموظف)
app.delete('/api/invoices/:id', (req, res) => {
  const { id } = req.params;
  const { sessionToken } = req.body;
  
  // التحقق من الجلسة
  db.get(
    'SELECT * FROM admin_sessions WHERE sessionToken = ? AND expiresAt > ?',
    [sessionToken, new Date().toISOString()],
    (err, session) => {
      if (err || !session) {
        return res.status(401).json({ success: false, message: 'جلسة غير صالحة' });
      }
      
      // الحصول على معلومات الفاتورة قبل الحذف
      db.get(
        'SELECT * FROM invoices WHERE id = ?',
        [id],
        (err, invoice) => {
          if (err) {
            console.error('خطأ في البحث عن الفاتورة:', err);
            return res.status(500).json({ success: false, message: 'خطأ في البحث عن الفاتورة' });
          }
          
          if (!invoice) {
            return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });
          }
          
          // حذف الفاتورة من قاعدة البيانات
          db.run(
            'DELETE FROM invoices WHERE id = ?',
            [id],
            function(err) {
              if (err) {
                console.error('خطأ في حذف الفاتورة:', err);
                return res.status(500).json({ success: false, message: 'خطأ في حذف الفاتورة' });
              }
              
              // حذف ملف الصورة
              if (invoice.filePath) {
                try {
                  const fullPath = path.join(uploadsDir, path.basename(invoice.filePath));
                  if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`🗑️ تم حذف الملف: ${fullPath}`);
                  }
                } catch (error) {
                  console.error('خطأ في حذف الملف:', error);
                  // لا نوقف العملية إذا فشل حذف الملف
                }
              }
              
              console.log(`✅ تم حذف الفاتورة: ${invoice.model} - ID: ${id}`);
              res.json({ 
                success: true, 
                message: `تم حذف فاتورة ${invoice.model} بنجاح` 
              });
            }
          );
        }
      );
    }
  );
});

// API لحذف موديل
app.delete('/api/models/:id', (req, res) => {
  const { id } = req.params;
  const { sessionToken } = req.body;
  
  // التحقق من الجلسة
  db.get(
    'SELECT * FROM admin_sessions WHERE sessionToken = ? AND expiresAt > ?',
    [sessionToken, new Date().toISOString()],
    (err, session) => {
      if (err || !session) {
        return res.status(401).json({ success: false, message: 'جلسة غير صالحة' });
      }
      
      // التحقق من وجود الموديل
      db.get(
        'SELECT * FROM models WHERE id = ?',
        [id],
        (err, model) => {
          if (err) {
            console.error('خطأ في البحث عن الموديل:', err);
            return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
          }
          
          if (!model) {
            return res.status(404).json({ success: false, message: 'الموديل غير موجود' });
          }
          
          // التحقق من وجود فواتير تستخدم هذا الموديل
          db.get(
            'SELECT COUNT(*) as count FROM invoices WHERE model = ?',
            [model.name],
            (err, result) => {
              if (err) {
                console.error('خطأ في التحقق من استخدام الموديل:', err);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
              }
              
              if (result.count > 0) {
                return res.status(400).json({ 
                  success: false, 
                  message: `لا يمكن حذف هذا الموديل لأنه مستخدم في ${result.count} فاتورة` 
                });
              }
              
              // حذف الموديل
              db.run(
                'DELETE FROM models WHERE id = ?',
                [id],
                function(err) {
                  if (err) {
                    console.error('خطأ في حذف الموديل:', err);
                    return res.status(500).json({ success: false, message: 'خطأ في حذف الموديل' });
                  }
                  
                  console.log('✅ تم حذف الموديل:', model.name);
                  res.json({ success: true, message: 'تم حذف الموديل بنجاح' });
                }
              );
            }
          );
        }
      );
    }
  );
});

// API لجلب الموديلات النشطة فقط (للاستخدام في النماذج)
app.get('/api/models/active', (req, res) => {
  db.all(
    'SELECT * FROM models WHERE isActive = 1 ORDER BY category, name',
    [],
    (err, rows) => {
      if (err) {
        console.error('خطأ في جلب الموديلات النشطة:', err);
        return res.status(500).json({ success: false, message: 'خطأ في جلب الموديلات' });
      }
      
      res.json({ success: true, data: rows });
    }
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📊 قاعدة البيانات: ${path.join(__dirname, 'fsmi_database.sqlite')}`);
  console.log(`📁 مجلد الملفات: ${uploadsDir}`);
});