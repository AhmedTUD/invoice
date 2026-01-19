import React, { useState } from 'react';
import { Lock, User, Key, AlertCircle, ArrowRight, Home } from 'lucide-react';
import Layout from '../components/Layout';

interface AdminLoginProps {
  onLogin: (username: string, password: string) => Promise<{success: boolean, message?: string}>;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin(username, password);
      
      if (!result.success) {
        setError(result.message || 'بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.');
        setLoading(false);
      }
      // إذا نجح تسجيل الدخول، سيتم التوجيه تلقائياً
    } catch (error) {
      setError('خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    window.location.hash = '#/';
  };

  return (
    <Layout>
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-8">
            <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">دخول المشرفين</h2>
            <p className="text-gray-500 text-sm mt-2">يرجى إدخال بيانات الدخول للوصول للوحة التحكم</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">اسم المستخدم</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="ادخل اسم المستخدم"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                  <Key size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="ادخل كلمة المرور"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-brand-600 text-white font-bold py-3.5 rounded-lg shadow hover:bg-brand-700 transition-all flex justify-center items-center gap-2 ${
                loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                'جاري التحقق...'
              ) : (
                <>
                  تسجيل الدخول <ArrowRight size={18} className="rotate-180" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGoHome}
              className="w-full bg-white text-gray-600 font-medium py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-all flex justify-center items-center gap-2"
            >
              <Home size={18} />
              العودة للصفحة الرئيسية
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            <p>نظام إدارة حوافز FSMI</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLogin;