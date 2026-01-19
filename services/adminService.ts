// خدمة إدارة جلسة المدير
const API_BASE_URL = '/api';

export interface AdminSession {
  sessionToken: string;
  expiresAt: string;
}

export class AdminService {
  // تسجيل دخول المدير
  static async login(username: string, password: string): Promise<{success: boolean, session?: AdminSession, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          session: {
            sessionToken: result.sessionToken,
            expiresAt: result.expiresAt
          }
        };
      } else {
        return { success: false, message: result.message };
      }
      
    } catch (error) {
      console.error('خطأ في تسجيل دخول المدير:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }
  
  // التحقق من صحة الجلسة
  static async verifySession(sessionToken: string): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/verify-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في التحقق من الجلسة:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }
  
  // تسجيل خروج المدير
  static async logout(sessionToken: string): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في تسجيل خروج المدير:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }
  
  // تغيير كلمة المرور
  static async changePassword(sessionToken: string, currentPassword: string, newPassword: string): Promise<{success: boolean, message?: string}> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionToken, 
          currentPassword, 
          newPassword 
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('خطأ في تغيير كلمة المرور:', error);
      return { 
        success: false, 
        message: 'خطأ في الاتصال بالخادم' 
      };
    }
  }
  
  // حفظ الجلسة في sessionStorage (مؤقت فقط)
  static saveSession(session: AdminSession): void {
    sessionStorage.setItem('adminSession', JSON.stringify(session));
  }
  
  // استعادة الجلسة من sessionStorage
  static getSession(): AdminSession | null {
    const sessionData = sessionStorage.getItem('adminSession');
    if (sessionData) {
      try {
        return JSON.parse(sessionData);
      } catch (error) {
        console.error('خطأ في قراءة بيانات الجلسة:', error);
        sessionStorage.removeItem('adminSession');
      }
    }
    return null;
  }
  
  // مسح الجلسة من sessionStorage
  static clearSession(): void {
    sessionStorage.removeItem('adminSession');
  }
}