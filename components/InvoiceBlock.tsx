import React, { useState, useEffect } from 'react';
import { InvoiceDraft, Model } from '../types';
import { ApiService } from '../services/apiService';
import { MAX_FILE_SIZE_MB, ALLOWED_FILE_TYPES } from '../constants';
import { Trash2, Upload, AlertCircle, ZoomIn, X, Eye, Camera, Search } from 'lucide-react';

interface InvoiceBlockProps {
  index: number;
  invoice: InvoiceDraft;
  onChange: (id: string, field: keyof InvoiceDraft, value: any) => void;
  onRemove: (id: string) => void;
  errors: Record<string, string>;
}

const InvoiceBlock: React.FC<InvoiceBlockProps> = ({ index, invoice, onChange, onRemove, errors }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Model search states
  const [modelSearch, setModelSearch] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Load models from database
  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const models = await ApiService.getActiveModels();
        setAvailableModels(models);
        setFilteredModels(models);
      } catch (error) {
        console.error('خطأ في تحميل الموديلات:', error);
      } finally {
        setModelsLoading(false);
      }
    };

    loadModels();
  }, []);
  
  // Filter models based on search
  useEffect(() => {
    if (modelSearch.trim() === '') {
      setFilteredModels(availableModels);
    } else {
      const filtered = availableModels.filter(model =>
        model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
        model.category.toLowerCase().includes(modelSearch.toLowerCase())
      );
      setFilteredModels(filtered);
    }
  }, [modelSearch, availableModels]);
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowImageModal(false);
        closeCameraModal();
      }
    };
    
    if (showImageModal || showCameraModal) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [showImageModal, showCameraModal]);

  // Clean up camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validation
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert("نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG) أو ملف PDF.");
        return;
      }
      
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`حجم الملف كبير جداً. الحد الأقصى هو ${MAX_FILE_SIZE_MB} ميجابايت.`);
        return;
      }

      onChange(invoice.id, 'file', file);
      
      // Create preview if image
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        onChange(invoice.id, 'filePreviewUrl', url);
      } else {
        onChange(invoice.id, 'filePreviewUrl', undefined);
      }
    }
  };

  // Camera functions
  const openCameraModal = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setStream(mediaStream);
      setShowCameraModal(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('لا يمكن الوصول للكاميرا. تأكد من السماح بالوصول للكاميرا في المتصفح.');
    }
  };

  const closeCameraModal = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCameraModal(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById(`camera-video-${invoice.id}`) as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `invoice-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onChange(invoice.id, 'file', file);
          
          const url = URL.createObjectURL(file);
          onChange(invoice.id, 'filePreviewUrl', url);
          
          closeCameraModal();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative mb-6 transition-all hover:shadow-md">
      <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
        <h3 className="text-lg font-semibold text-gray-700">فاتورة #{index + 1}</h3>
        {index > 0 && (
            <button 
                type="button" 
                onClick={() => onRemove(invoice.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors flex items-center gap-1 text-sm"
            >
                <Trash2 size={18} />
                <span>حذف الفاتورة</span>
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Upload - نقلناه للأعلى ليكون أول شيء */}
        <div className="md:col-span-2 order-first">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            صورة الفاتورة <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 mr-2">(ارفع الصورة أولاً لمعاينتها وقراءة البيانات)</span>
          </label>
          
          <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${errors.file ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}`}>
            <div className="space-y-1 text-center">
              {!invoice.file ? (
                <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex flex-col gap-3 items-center">
                        <div className="flex gap-2">
                            <label htmlFor={`file-upload-${invoice.id}`} className="cursor-pointer bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500 transition-colors flex items-center gap-2">
                                <Upload size={16} />
                                <span>اختر ملف</span>
                                <input id={`file-upload-${invoice.id}`} name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" />
                            </label>
                            
                            <button
                                type="button"
                                onClick={openCameraModal}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <Camera size={16} />
                                <span>تصوير</span>
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">JPG, PNG, PDF حتى 10MB</p>
                    </div>
                </>
              ) : (
                <div className="flex flex-col items-center">
                    {invoice.filePreviewUrl ? (
                        <div className="relative group">
                            <img 
                                src={invoice.filePreviewUrl} 
                                alt="Preview" 
                                className="h-40 object-contain mb-2 rounded border cursor-pointer hover:opacity-80 transition-opacity shadow-sm" 
                                onClick={() => setShowImageModal(true)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded">
                                <div className="bg-white rounded-full p-2 shadow-lg">
                                    <ZoomIn size={16} className="text-gray-600" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center mb-2">
                            <span className="text-xs font-bold text-gray-500">PDF</span>
                        </div>
                    )}
                    <p className="text-sm font-medium text-gray-900">{invoice.file.name}</p>
                    <div className="flex gap-3 mt-2">
                        {invoice.filePreviewUrl && (
                            <button 
                                type="button"
                                onClick={() => setShowImageModal(true)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                            >
                                <Eye size={12} />
                                معاينة كبيرة
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={() => {
                              onChange(invoice.id, 'file', null);
                              onChange(invoice.id, 'filePreviewUrl', undefined);
                            }} 
                            className="text-xs text-red-600 hover:text-red-800 underline bg-red-50 px-2 py-1 rounded"
                        >
                            تغيير الملف
                        </button>
                    </div>
                </div>
              )}
            </div>
          </div>
          {errors.file && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.file}</p>}
        </div>

        {/* Model Selection */}
        <div className={`${invoice.filePreviewUrl ? 'bg-yellow-50 border border-yellow-200 p-3 rounded-lg' : ''}`}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الموديل <span className="text-red-500">*</span>
            {invoice.filePreviewUrl && <span className="text-xs text-yellow-600 mr-2">(اقرأ من الصورة أعلاه)</span>}
          </label>
          
          {/* Search Input */}
          <div className="relative mb-2">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="ابحث في الموديلات... (مثل: RS68, WW11, RB34)"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              onFocus={() => setShowModelDropdown(true)}
              onBlur={() => {
                // Delay hiding to allow clicking on options
                setTimeout(() => setShowModelDropdown(false), 200);
              }}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors text-sm"
            />
          </div>

          {/* Model Dropdown */}
          {showModelDropdown && (
            <div className="relative mb-2">
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {modelsLoading ? (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    جاري تحميل الموديلات...
                  </div>
                ) : filteredModels.length > 0 ? (
                  <>
                    <div className="p-2 text-xs text-gray-500 border-b bg-gray-50">
                      <Search size={12} className="inline mr-1" />
                      {filteredModels.length} موديل متاح:
                    </div>
                    {filteredModels.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onChange(invoice.id, 'model', model.name);
                          setModelSearch('');
                          setShowModelDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{model.name}</div>
                        <div className="text-xs text-gray-500">{model.category}</div>
                        {model.description && (
                          <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                        )}
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="p-3 text-center text-gray-500 text-sm">
                    لا توجد موديلات تطابق البحث "{modelSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Model Display */}
          <div className="mb-2">
            {invoice.model ? (
              <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-sm font-medium text-green-800">
                  الموديل المختار: {invoice.model}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(invoice.id, 'model', '')}
                  className="text-red-500 hover:text-red-700 text-xs underline"
                >
                  إلغاء الاختيار
                </button>
              </div>
            ) : (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm text-gray-500">
                لم يتم اختيار موديل بعد
              </div>
            )}
          </div>

          {/* Fallback Traditional Select */}
          <details className="mb-2">
            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
              أو استخدم القائمة التقليدية ({availableModels.length} موديل)
            </summary>
            <select
              value={invoice.model}
              onChange={(e) => onChange(invoice.id, 'model', e.target.value)}
              className={`w-full mt-2 p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors text-sm ${errors.model ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">-- اختر الموديل --</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.name}>
                  {model.name} - {model.category}
                </option>
              ))}
            </select>
          </details>

          {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model}</p>}
        </div>

        {/* Date Selection */}
        <div className={`${invoice.filePreviewUrl ? 'bg-yellow-50 border border-yellow-200 p-3 rounded-lg' : ''}`}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            تاريخ الفاتورة <span className="text-red-500">*</span>
            {invoice.filePreviewUrl && <span className="text-xs text-yellow-600 mr-2">(اقرأ من الصورة أعلاه)</span>}
          </label>
          <input
            type="date"
            value={invoice.salesDate}
            onChange={(e) => onChange(invoice.id, 'salesDate', e.target.value)}
            className={`w-full p-2.5 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${errors.salesDate ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.salesDate && <p className="text-red-500 text-xs mt-1">{errors.salesDate}</p>}
          {!invoice.salesDate && (
            <button
              type="button"
              onClick={() => onChange(invoice.id, 'salesDate', new Date().toISOString().split('T')[0])}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 underline"
            >
              استخدام تاريخ اليوم
            </button>
          )}
        </div>
      </div>

      {/* Image Modal for Full Preview - Mobile Optimized */}
      {showImageModal && invoice.filePreviewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative w-full h-full max-w-6xl bg-white rounded-lg overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-gray-50 flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">معاينة الفاتورة #{index + 1}</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">اضغط على الصورة للتكبير • استخدم العجلة للتمرير</p>
              </div>
              <button 
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* Image Section */}
              <div className="flex-1 p-2 sm:p-4 overflow-auto bg-gray-100 flex items-center justify-center">
                <img 
                  src={invoice.filePreviewUrl} 
                  alt="Full Preview" 
                  className="max-w-full max-h-full object-contain cursor-zoom-in shadow-lg rounded transition-transform duration-200"
                  onClick={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (img.style.transform === 'scale(1.5)') {
                      img.style.transform = 'scale(1)';
                      img.style.cursor = 'zoom-in';
                    } else {
                      img.style.transform = 'scale(1.5)';
                      img.style.cursor = 'zoom-out';
                    }
                  }}
                />
              </div>
              
              {/* Helper Panel - Hidden on mobile, collapsible on tablet */}
              <div className="hidden lg:block w-80 p-4 border-l bg-white overflow-auto">
                <h4 className="font-semibold text-gray-800 mb-3">🔍 دليل قراءة الفاتورة</h4>
                
                <div className="space-y-3 text-sm">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">📱 البحث عن الموديل:</h5>
                    <ul className="text-blue-700 space-y-1 text-xs">
                      <li>• ابحث عن "Model" أو "موديل"</li>
                      <li>• عادة يكون بجانب اسم المنتج</li>
                      <li>• يبدأ بحروف مثل RS, RB, RT, WW</li>
                      <li>• مثال: RS68AB820B1/MR</li>
                    </ul>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h5 className="font-medium text-green-800 mb-2">📅 البحث عن التاريخ:</h5>
                    <ul className="text-green-700 space-y-1 text-xs">
                      <li>• ابحث في أعلى الفاتورة</li>
                      <li>• أو في أسفل الفاتورة</li>
                      <li>• قد يكون بجانب "Date" أو "تاريخ"</li>
                      <li>• تنسيق: DD/MM/YYYY</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h5 className="font-medium text-yellow-800 mb-2">💡 نصائح إضافية:</h5>
                    <ul className="text-yellow-700 space-y-1 text-xs">
                      <li>• كبر الصورة بالضغط عليها</li>
                      <li>• ابحث عن الباركود للموديل</li>
                      <li>• تأكد من وضوح الأرقام</li>
                      <li>• راجع البيانات قبل الحفظ</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-3 sm:p-4 border-t bg-gray-50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm sm:text-base"
                >
                  إغلاق المعاينة
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = invoice.filePreviewUrl!;
                    link.download = invoice.file?.name || 'invoice.jpg';
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  تحميل الصورة
                </button>
              </div>
              
              {/* Mobile Helper Tips */}
              <div className="lg:hidden mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                💡 اضغط على الصورة للتكبير/التصغير • ابحث عن الموديل والتاريخ في الفاتورة
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full bg-white rounded-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">تصوير الفاتورة #{index + 1}</h3>
                <p className="text-sm text-gray-600">وجه الكاميرا نحو الفاتورة واضغط التقاط</p>
              </div>
              <button 
                onClick={closeCameraModal}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-black">
              <video
                id={`camera-video-${invoice.id}`}
                ref={(video) => {
                  if (video && stream) {
                    video.srcObject = stream;
                    video.play();
                  }
                }}
                className="w-full max-w-2xl mx-auto rounded-lg"
                autoPlay
                playsInline
              />
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={capturePhoto}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <Camera size={20} />
                  التقاط الصورة
                </button>
                <button
                  onClick={closeCameraModal}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">📸 نصائح للتصوير الأمثل:</h5>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• تأكد من وضوح الإضاءة</li>
                    <li>• ضع الفاتورة على سطح مستوٍ</li>
                    <li>• تجنب الظلال والانعكاسات</li>
                    <li>• تأكد من ظهور الفاتورة كاملة</li>
                    <li>• اجعل النص واضحاً ومقروءاً</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceBlock;
