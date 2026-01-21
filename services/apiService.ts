import { BasicData, InvoiceDraft, JoinedRecord } from '../types';

const API_BASE_URL = '/api';

export class ApiService {
  // حفظ طلب جديد
  static async saveSubmission(basicData: BasicData, invoicesDraft: InvoiceDraft[]): Promise<{success: boolean, message?: string}> {
    try {
      const formData = new FormData();
      
      // إضافة البيانات الأساسية
      formData.append('basicData', JSON.stringify(basicData));
      
      // إضافة بيانات الفواتير (بدون الملفات)
      const invoicesData = invoicesDraft.map(draft => ({
        model: draft.model,
        salesDate: draft.salesDate
      }));
      formData.append('invoicesData', JSON.stringify(invoicesData));
      
      // إضافة ملفات الفواتير
      invoicesDraft.forEach((draft) => {
        if (draft.file) {
          formData.append('invoiceFiles', draft.file);
        }
      });
      
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في إرسال البيانات:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم. تأكد من تشغيل الخادم على المنفذ 3001' 
      };
    }
  }
  
  // جلب جميع السجلات المدمجة
  static async getAllJoinedRecords(): Promise<JoinedRecord[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('خطأ في جلب البيانات:', result.message);
        return [];
      }
      
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
      return [];
    }
  }
  
  // البحث عن الموظفين بالإيميل (جديد)
  static async searchEmployees(email: string): Promise<BasicData[]> {
    try {
      console.log('API: البحث عن الموظفين بالإيميل:', email);
      // البحث فقط إذا كان الإيميل يحتوي على @ وطوله أكبر من 5 أحرف
      if (!email || !email.includes('@') || email.length < 5) {
        return [];
      }
      
      const response = await fetch(`${API_BASE_URL}/employees/search?email=${encodeURIComponent(email)}`);
      const result = await response.json();
      
      console.log('API: نتيجة البحث:', result);
      
      if (result.success) {
        return result.data;
      } else {
        console.error('خطأ في البحث عن الموظفين:', result.message);
        return [];
      }
      
    } catch (error) {
      console.error('خطأ في البحث عن الموظفين:', error);
      return [];
    }
  }
  
  // جلب بيانات موظف محدد (جديد)
  static async getEmployeeByEmail(email: string): Promise<BasicData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/employees/${encodeURIComponent(email)}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        return null;
      }
      
    } catch (error) {
      console.error('خطأ في جلب بيانات الموظف:', error);
      return null;
    }
  }
  
  // مسح جميع البيانات
  static async clearData(): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في مسح البيانات:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }

  // مسح البيانات المفلترة
  static async clearFilteredData(sessionToken: string, filters: {
    name?: string;
    serial?: string;
    store?: string;
    model?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/submissions/filtered`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken,
          filters
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في مسح البيانات المفلترة:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }

  // حذف الفواتير المفلترة فقط (بدون حذف بيانات الموظفين)
  static async clearFilteredInvoices(sessionToken: string, filters: {
    name?: string;
    serial?: string;
    store?: string;
    model?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{success: boolean, message?: string}> {
    try {
      console.log('🌐 إرسال طلب حذف الفواتير إلى:', `${API_BASE_URL}/invoices/filtered`);
      console.log('📋 البيانات المرسلة:', { sessionToken: sessionToken ? 'موجود' : 'غير موجود', filters });
      
      const response = await fetch(`${API_BASE_URL}/invoices/filtered`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken,
          filters
        })
      });
      
      console.log('📡 حالة الاستجابة:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📋 نتيجة الخادم:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ خطأ في حذف الفواتير المفلترة:', error);
      return { 
        success: false, 
        message: `خطأ في الاتصال بالخادم: ${error.message}` 
      };
    }
  }
  
  // إضافة بيانات تجريبية
  static async generateTestData(): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/test-data`, {
        method: 'POST'
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في إضافة البيانات التجريبية:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }

  // ===== إدارة الموديلات =====
  
  // جلب جميع الموديلات
  static async getAllModels(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/models`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('خطأ في جلب الموديلات:', result.message);
        return [];
      }
      
    } catch (error) {
      console.error('خطأ في جلب الموديلات:', error);
      return [];
    }
  }

  // جلب الموديلات النشطة فقط
  static async getActiveModels(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/models/active`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('خطأ في جلب الموديلات النشطة:', result.message);
        return [];
      }
      
    } catch (error) {
      console.error('خطأ في جلب الموديلات النشطة:', error);
      return [];
    }
  }

  // إضافة موديل جديد
  static async addModel(sessionToken: string, name: string, category: string, description?: string): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken,
          name,
          category,
          description
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في إضافة الموديل:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }

  // تحديث موديل
  static async updateModel(sessionToken: string, id: string, name: string, category: string, description: string, isActive: boolean): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken,
          name,
          category,
          description,
          isActive
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في تحديث الموديل:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }

  // حذف موديل
  static async deleteModel(sessionToken: string, id: string): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/models/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionToken
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في حذف الموديل:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }
}