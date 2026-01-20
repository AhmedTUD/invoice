// إعدادات الخادم
export const config = {
  // منفذ الخادم
  PORT: process.env.PORT || 3001,
  
  // مسار قاعدة البيانات
  DB_PATH: './server/fsmi_database.sqlite',
  
  // مجلد الملفات المرفوعة
  UPLOADS_DIR: './server/uploads',
  
  // الحد الأقصى لحجم الملف (بالبايت)
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  
  // أنواع الملفات المسموحة
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/jpg',
    'application/pdf'
  ],
  
  // إعدادات CORS
  CORS_ORIGIN: process.env.NODE_ENV === 'production' ? false : '*',
  
  // رسائل النجاح
  MESSAGES: {
    SUCCESS_SAVE: 'تم حفظ البيانات بنجاح في قاعدة البيانات',
    SUCCESS_DELETE: 'تم مسح جميع البيانات بنجاح',
    SUCCESS_TEST_DATA: 'تم إضافة البيانات التجريبية بنجاح',
    ERROR_SAVE: 'خطأ في حفظ البيانات',
    ERROR_DELETE: 'خطأ في مسح البيانات',
    ERROR_FETCH: 'خطأ في جلب البيانات',
    ERROR_FILE_TYPE: 'نوع الملف غير مدعوم',
    ERROR_FILE_SIZE: 'حجم الملف كبير جداً'
  }
};