import React, { useState, useEffect } from 'react';
import UserForm from './pages/UserForm';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { AdminService, AdminSession } from './services/adminService';

const App: React.FC = () => {
  const [route, setRoute] = useState<string>('/');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(true);

  // التحقق من الجلسة المحفوظة عند بدء التطبيق
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedSession = AdminService.getSession();
      
      if (savedSession) {
        console.log('🔍 التحقق من الجلسة المحفوظة...');
        
        // التحقق من صحة الجلسة مع الخادم
        const verification = await AdminService.verifySession(savedSession.sessionToken);
        
        if (verification.success) {
          setIsAdminAuthenticated(true);
          setAdminSession(savedSession);
          console.log('✅ تم استعادة جلسة المدير من الخادم');
        } else {
          // الجلسة غير صالحة، مسحها
          AdminService.clearSession();
          console.log('❌ الجلسة المحفوظة غير صالحة، تم مسحها');
        }
      }
      
      setSessionLoading(false);
    };

    checkExistingSession();
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      setRoute(hash);
    };

    // Initialize
    handleHashChange();

    // Listen for changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // دالة تسجيل الدخول مع حفظ الجلسة في قاعدة البيانات
  const handleAdminLogin = async (username: string, password: string): Promise<{success: boolean, message?: string}> => {
    console.log('🔐 محاولة تسجيل دخول المدير...');
    
    const loginResult = await AdminService.login(username, password);
    
    if (loginResult.success && loginResult.session) {
      setIsAdminAuthenticated(true);
      setAdminSession(loginResult.session);
      
      // حفظ الجلسة مؤقتاً في sessionStorage (ستنتهي عند إغلاق المتصفح)
      AdminService.saveSession(loginResult.session);
      
      console.log('✅ تم تسجيل دخول المدير وحفظ الجلسة في قاعدة البيانات');
      return { success: true };
    } else {
      console.log('❌ فشل تسجيل دخول المدير:', loginResult.message);
      return { success: false, message: loginResult.message };
    }
  };

  // دالة تسجيل الخروج مع مسح الجلسة من قاعدة البيانات
  const handleAdminLogout = async () => {
    if (adminSession) {
      console.log('🚪 تسجيل خروج المدير...');
      
      // حذف الجلسة من قاعدة البيانات
      await AdminService.logout(adminSession.sessionToken);
    }
    
    // مسح الجلسة محلياً
    setIsAdminAuthenticated(false);
    setAdminSession(null);
    AdminService.clearSession();
    
    console.log('✅ تم تسجيل خروج المدير ومسح الجلسة');
  };

  // عرض شاشة تحميل أثناء التحقق من الجلسة
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  // Admin Route Handler
  if (route === '/admin') {
    if (isAdminAuthenticated && adminSession) {
      return <AdminDashboard onLogout={handleAdminLogout} sessionToken={adminSession.sessionToken} />;
    }
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  // Default: User Form
  return <UserForm />;
};

export default App;