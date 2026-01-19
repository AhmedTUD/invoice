import React, { useState, useEffect, useCallback } from 'react';
import { BasicData, InvoiceDraft } from '../types';
import { MockDB } from '../services/mockDb';
import { ApiService } from '../services/apiService';
import Layout from '../components/Layout';
import InvoiceBlock from '../components/InvoiceBlock';
import { Plus, Send, CheckCircle, Loader2, AlertTriangle, User, Clock } from 'lucide-react';

const UserForm: React.FC = () => {
  // State 1: Basic Data (Entered Once)
  const [basicData, setBasicData] = useState<BasicData>({
    email: '',
    name: '',
    mobile: '',
    serial: '',
    storeName: '',
    storeCode: ''
  });

  // State 2: Dynamic Invoices Array
  const [invoices, setInvoices] = useState<InvoiceDraft[]>([
    { id: crypto.randomUUID(), model: '', salesDate: '', file: null }
  ]);

  // State 3: Employee suggestions
  const [employeeSuggestions, setEmployeeSuggestions] = useState<BasicData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounced search for employees
  const searchEmployees = useCallback(
    debounce(async (email: string) => {
      console.log('البحث عن:', email);
      // البحث فقط إذا كان الإيميل يحتوي على @ وطوله أكبر من 5 أحرف
      if (email.includes('@') && email.length >= 5) {
        setIsLoadingEmployee(true);
        const suggestions = await ApiService.searchEmployees(email);
        console.log('النتائج:', suggestions);
        setEmployeeSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        setIsLoadingEmployee(false);
      } else {
        setEmployeeSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300),
    []
  );

  // Debounce utility function
  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }

  // Load employee data when suggestion is selected
  const loadEmployeeData = async (email: string) => {
    setIsLoadingEmployee(true);
    const employeeData = await ApiService.getEmployeeByEmail(email);
    if (employeeData) {
      setBasicData(employeeData);
    }
    setShowSuggestions(false);
    setIsLoadingEmployee(false);
  };

  // Handlers
  const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBasicData(prev => ({ ...prev, [name]: value }));
    
    // Search for employees when email changes
    if (name === 'email') {
      console.log('تغيير الإيميل:', value);
      searchEmployees(value);
    }
    
    // Clear error for this field
    if (errors[name]) {
        const newErrors = {...errors};
        delete newErrors[name];
        setErrors(newErrors);
    }
  };

  const addInvoice = () => {
    setInvoices(prev => [
      ...prev,
      { id: crypto.randomUUID(), model: '', salesDate: '', file: null }
    ]);
  };

  const removeInvoice = (id: string) => {
    if (invoices.length === 1) {
      alert("يجب إدخال فاتورة واحدة على الأقل.");
      return;
    }
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const updateInvoice = (id: string, field: keyof InvoiceDraft, value: any) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === id ? { ...inv, [field]: value } : inv
    ));
    // Clear specific invoice error if exists
    const errorKey = `${id}-${field}`;
    if (errors[errorKey]) {
        const newErrors = {...errors};
        delete newErrors[errorKey];
        setErrors(newErrors);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Validate Basic Data
    if (!basicData.email) newErrors.email = "البريد الإلكتروني مطلوب";
    if (!basicData.name) newErrors.name = "الاسم مطلوب";
    if (!basicData.mobile) newErrors.mobile = "رقم الموبايل مطلوب";
    if (!basicData.serial) newErrors.serial = "الكود الوظيفي مطلوب";
    if (!basicData.storeName) newErrors.storeName = "اسم الفرع مطلوب";
    if (!basicData.storeCode) newErrors.storeCode = "كود الفرع مطلوب";

    // Validate Invoices
    invoices.forEach((inv) => {
      if (!inv.model) newErrors[`${inv.id}-model`] = "الموديل مطلوب";
      if (!inv.salesDate) newErrors[`${inv.id}-salesDate`] = "التاريخ مطلوب";
      if (!inv.file) newErrors[`${inv.id}-file`] = "الصورة مطلوبة";
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
      // Scroll to top error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Simulate Network Request
    setTimeout(async () => {
      const result = await MockDB.saveSubmission(basicData, invoices);
      setLoading(false);
      
      if (result.success) {
        setSuccessMessage(result.message || '');
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(result.message || "حدث خطأ أثناء الحفظ. حاول مرة أخرى.");
      }
    }, 1500);
  };

  const handleReset = () => {
    setSuccess(false);
    setSuccessMessage('');
    setBasicData({ email: '', name: '', mobile: '', serial: '', storeName: '', storeCode: '' });
    setInvoices([{ id: crypto.randomUUID(), model: '', salesDate: '', file: null }]);
    setErrors({});
  };

  if (success) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-lg shadow text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="text-green-500 w-24 h-24" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">تم الإرسال بنجاح!</h2>
          <p className="text-gray-600 mb-8">شكراً لك، تم حفظ البيانات والفواتير بنجاح.</p>
          
          {successMessage && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg mb-8 text-sm flex items-start gap-2 text-right">
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                <span>{successMessage}</span>
            </div>
          )}

          <button 
            onClick={handleReset}
            className="bg-brand-600 text-white px-8 py-3 rounded-lg hover:bg-brand-700 transition font-bold"
          >
            إرسال طلب جديد
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
        
        {/* Section 1: Basic Data */}
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-sm border-t-4 border-brand-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
            البيانات الأساسية
            <span className="text-sm font-normal text-gray-500 mr-2">
              💡 اكتب إيميلك كاملاً (مع @) لاسترجاع بياناتك السابقة
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
                <span className="text-xs text-blue-600 mr-1">(اكتب الإيميل كاملاً مع @)</span>
              </label>
              <div className="relative">
                <input 
                  type="email" 
                  name="email" 
                  value={basicData.email} 
                  onChange={handleBasicChange}
                  onFocus={() => {
                    if (employeeSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className={`w-full p-2.5 border rounded bg-gray-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} 
                  placeholder="example@company.com"
                />
                {isLoadingEmployee && (
                  <div className="absolute left-3 top-3">
                    <Loader2 className="animate-spin text-gray-400" size={16} />
                  </div>
                )}
              </div>
              
              {/* Employee Suggestions Dropdown */}
              {showSuggestions && employeeSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                    <User size={12} className="inline mr-1" />
                    اختر من البيانات المحفوظة (تم العثور على {employeeSuggestions.length} نتيجة):
                  </div>
                  {employeeSuggestions.map((employee, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => loadEmployeeData(employee.email)}
                      className="w-full text-right p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{employee.name}</div>
                          <div className="text-sm text-gray-600">{employee.email}</div>
                          <div className="text-xs text-gray-500">
                            {employee.storeName} • {employee.serial}
                          </div>
                        </div>
                        <div className="text-xs text-blue-600 flex items-center gap-1">
                          <Clock size={12} />
                          محفوظ
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className={`${basicData.name && basicData.email ? 'bg-green-50 border border-green-200 p-3 rounded-lg' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم بالكامل
                {basicData.name && basicData.email && (
                  <span className="text-xs text-green-600 mr-1">✓ محمل تلقائياً</span>
                )}
              </label>
              <input type="text" name="name" value={basicData.name} onChange={handleBasicChange} 
                className={`w-full p-2.5 border rounded bg-gray-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
               {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className={`${basicData.mobile && basicData.email ? 'bg-green-50 border border-green-200 p-3 rounded-lg' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الموبايل
                {basicData.mobile && basicData.email && (
                  <span className="text-xs text-green-600 mr-1">✓ محمل تلقائياً</span>
                )}
              </label>
              <input type="tel" name="mobile" value={basicData.mobile} onChange={handleBasicChange} 
                className={`w-full p-2.5 border rounded bg-gray-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`} />
               {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
            </div>
            <div className={`${basicData.serial && basicData.email ? 'bg-green-50 border border-green-200 p-3 rounded-lg' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كود الموظف (Serial)
                {basicData.serial && basicData.email && (
                  <span className="text-xs text-green-600 mr-1">✓ محمل تلقائياً</span>
                )}
              </label>
              <input type="text" name="serial" value={basicData.serial} onChange={handleBasicChange} 
                className={`w-full p-2.5 border rounded bg-gray-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${errors.serial ? 'border-red-500' : 'border-gray-300'}`} />
               {errors.serial && <p className="text-red-500 text-xs mt-1">{errors.serial}</p>}
            </div>
            <div className={`${basicData.storeName && basicData.email ? 'bg-green-50 border border-green-200 p-3 rounded-lg' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم الفرع
                {basicData.storeName && basicData.email && (
                  <span className="text-xs text-green-600 mr-1">✓ محمل تلقائياً</span>
                )}
              </label>
              <input type="text" name="storeName" value={basicData.storeName} onChange={handleBasicChange} 
                className={`w-full p-2.5 border rounded bg-gray-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${errors.storeName ? 'border-red-500' : 'border-gray-300'}`} />
               {errors.storeName && <p className="text-red-500 text-xs mt-1">{errors.storeName}</p>}
            </div>
            <div className={`${basicData.storeCode && basicData.email ? 'bg-green-50 border border-green-200 p-3 rounded-lg' : ''}`}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كود الفرع
                {basicData.storeCode && basicData.email && (
                  <span className="text-xs text-green-600 mr-1">✓ محمل تلقائياً</span>
                )}
              </label>
              <input type="text" name="storeCode" value={basicData.storeCode} onChange={handleBasicChange} 
                className={`w-full p-2.5 border rounded bg-gray-50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${errors.storeCode ? 'border-red-500' : 'border-gray-300'}`} />
               {errors.storeCode && <p className="text-red-500 text-xs mt-1">{errors.storeCode}</p>}
            </div>
          </div>
        </div>

        {/* Section 2: Invoices */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">فواتير المبيعات</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              العدد الحالي: {invoices.length}
            </span>
          </div>

          <div className="space-y-4">
            {invoices.map((inv, index) => (
              <InvoiceBlock
                key={inv.id}
                index={index}
                invoice={inv}
                onChange={updateInvoice}
                onRemove={removeInvoice}
                errors={{
                  model: errors[`${inv.id}-model`],
                  salesDate: errors[`${inv.id}-salesDate`],
                  file: errors[`${inv.id}-file`]
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addInvoice}
            className="mt-4 w-full md:w-auto flex items-center justify-center gap-2 bg-white border-2 border-brand-500 text-brand-600 px-6 py-3 rounded-lg font-bold hover:bg-brand-50 transition-colors shadow-sm"
          >
            <Plus size={20} />
            إضافة فاتورة جديدة
          </button>
        </div>

        {/* Submit Action */}
        <div className="pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-brand-600 text-white text-lg font-bold py-4 rounded-lg shadow-lg hover:bg-brand-700 hover:shadow-xl transition-all transform flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send size={20} />
                  إرسال البيانات
                </>
              )}
            </button>
        </div>

      </form>
    </Layout>
  );
};

export default UserForm;