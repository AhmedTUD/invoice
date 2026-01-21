import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import { JoinedRecord, Model } from '../types';
import { MockDB } from '../services/mockDb';
import { AdminService } from '../services/adminService';
import { ApiService } from '../services/apiService';
import { Download, Search, Filter, Trash2, RefreshCw, LogOut, FileArchive, FileSpreadsheet, Home, XCircle, Settings, Key, Save, X, Plus, Edit, Package, Eye, ZoomIn } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// Declare ExcelJS from global scope (loaded via script tag in index.html)
declare const ExcelJS: any;

interface AdminDashboardProps {
  onLogout: () => void;
  sessionToken: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, sessionToken }) => {
  const [allRecords, setAllRecords] = useState<JoinedRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<JoinedRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Image Preview State
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{url: string, name: string} | null>(null);

  // Filters State
  const [filterName, setFilterName] = useState('');
  const [filterSerial, setFilterSerial] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterModel, setFilterModel] = useState('');
  
  // Date Filters State
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  // Initialize with current month on component mount
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFilterDateFrom(firstDay.toISOString().split('T')[0]);
    setFilterDateTo(lastDay.toISOString().split('T')[0]);
  }, []);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Models Management State
  const [showModelsModal, setShowModelsModal] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [showModelForm, setShowModelForm] = useState(false);
  const [modelForm, setModelForm] = useState({
    name: '',
    category: '',
    description: '',
    isActive: true
  });
  const [modelError, setModelError] = useState('');
  const [modelSuccess, setModelSuccess] = useState('');

  const refreshData = async () => {
    const data = await MockDB.getAllJoinedRecords();
    setAllRecords(data);
    applyFilters(data);
  };

  const loadModels = async () => {
    setModelsLoading(true);
    try {
      const modelsData = await ApiService.getAllModels();
      setModels(modelsData);
    } catch (error) {
      console.error('خطأ في تحميل الموديلات:', error);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    loadModels();
  }, []);

  // Compute Unique Values for Dropdowns (Datalists) based on existing data
  const uniqueNames = useMemo(() => Array.from(new Set(allRecords.map(r => r.name))).filter(Boolean).sort(), [allRecords]);
  const uniqueSerials = useMemo(() => Array.from(new Set(allRecords.map(r => r.serial))).filter(Boolean).sort(), [allRecords]);
  const uniqueStores = useMemo(() => Array.from(new Set(allRecords.map(r => r.storeName))).filter(Boolean).sort(), [allRecords]);
  const uniqueModels = useMemo(() => Array.from(new Set(allRecords.map(r => r.model))).filter(Boolean).sort(), [allRecords]);

  // Apply Filters
  const applyFilters = (data: JoinedRecord[]) => {
    let result = data;

    // We use toLowerCase() for case-insensitive search, 
    // but the inputs are now guided by existing data via datalists
    if (filterName) {
        result = result.filter(r => r.name.toLowerCase().includes(filterName.toLowerCase()));
    }
    if (filterSerial) {
        result = result.filter(r => r.serial.toLowerCase().includes(filterSerial.toLowerCase()));
    }
    if (filterStore) {
        result = result.filter(r => 
            r.storeName.toLowerCase().includes(filterStore.toLowerCase()) || 
            r.storeCode.toLowerCase().includes(filterStore.toLowerCase())
        );
    }
    if (filterModel) {
        result = result.filter(r => r.model.toLowerCase().includes(filterModel.toLowerCase()));
    }
    
    // Date Filters
    if (filterDateFrom) {
        result = result.filter(r => r.salesDate >= filterDateFrom);
    }
    if (filterDateTo) {
        result = result.filter(r => r.salesDate <= filterDateTo);
    }

    setFilteredRecords(result);
  };

  // Re-apply filters when inputs change (including date filters)
  useEffect(() => {
    applyFilters(allRecords);
  }, [filterName, filterSerial, filterStore, filterModel, filterDateFrom, filterDateTo, allRecords]);

  // 1. ADVANCED EXCEL EXPORT WITH FIXED IMAGES
  const handleExportExcel = async () => {
    if (filteredRecords.length === 0) {
        alert("لا توجد بيانات للتحميل.");
        return;
    }
    setLoading(true);

    try {
        console.log('🚀 بدء تصدير Excel المتقدم...');
        console.log('📊 عدد السجلات:', filteredRecords.length);
        
        // فحص البيانات بالتفصيل
        console.log('🔍 فحص البيانات الأولى:', filteredRecords[0]);
        
        // فحص البيانات أولاً
        const recordsWithImages = filteredRecords.filter(r => 
            r.fileDataUrl && (r.fileDataUrl.startsWith('data:image') || r.fileDataUrl.startsWith('data:application/pdf'))
        );
        console.log('🖼️ عدد السجلات مع صور:', recordsWithImages.length);
        
        // فحص عينة من البيانات
        if (recordsWithImages.length > 0) {
            console.log('📋 عينة من البيانات مع صور:', {
                name: recordsWithImages[0].name,
                storeName: recordsWithImages[0].storeName,
                storeCode: recordsWithImages[0].storeCode,
                hasImage: !!recordsWithImages[0].fileDataUrl,
                imageType: recordsWithImages[0].fileDataUrl?.substring(0, 50) + '...'
            });
        }
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'FSMI TV & HA By SmartSense';
        workbook.created = new Date();

        // تجميع البيانات حسب الفرع
        const groupedByStore: Record<string, JoinedRecord[]> = {};
        filteredRecords.forEach(record => {
            const storeKey = record.storeName || 'فرع غير محدد';
            if (!groupedByStore[storeKey]) {
                groupedByStore[storeKey] = [];
            }
            groupedByStore[storeKey].push(record);
        });

        console.log('🏢 عدد الفروع:', Object.keys(groupedByStore).length);
        console.log('📋 أسماء الفروع:', Object.keys(groupedByStore));

        // إنشاء شيت الملخص العام
        const summarySheet = workbook.addWorksheet('الملخص العام');
        
        // إعداد أعمدة الملخص
        summarySheet.columns = [
            { header: 'اسم الفرع', key: 'storeName', width: 25 },
            { header: 'كود الفرع', key: 'storeCode', width: 15 },
            { header: 'عدد الموظفين', key: 'employeeCount', width: 15 },
            { header: 'عدد الفواتير', key: 'invoiceCount', width: 15 }
        ];

        // تنسيق هيدر الملخص
        const summaryHeaderRow = summarySheet.getRow(1);
        summaryHeaderRow.eachCell((cell: any) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2E7D32' } // Green
            };
            cell.font = {
                color: { argb: 'FFFFFFFF' },
                bold: true,
                size: 14,
                name: 'Arial'
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        summaryHeaderRow.height = 35;

        // إضافة بيانات الملخص
        Object.entries(groupedByStore).forEach(([storeName, storeRecords]) => {
            const uniqueEmployees = new Set(storeRecords.map(r => r.serial)).size;
            const storeCode = storeRecords[0]?.storeCode || 'غير محدد';
            
            console.log(`📊 إضافة فرع للملخص: ${storeName} - كود: ${storeCode} - موظفين: ${uniqueEmployees} - فواتير: ${storeRecords.length}`);
            
            const row = summarySheet.addRow({
                storeName: storeName,
                storeCode: storeCode,
                employeeCount: uniqueEmployees,
                invoiceCount: storeRecords.length
            });

            row.eachCell((cell: any) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        let totalImagesAdded = 0;
        let totalImagesFailed = 0;

        // إنشاء شيت لكل فرع
        for (const [storeName, storeRecords] of Object.entries(groupedByStore)) {
            console.log(`📋 إنشاء شيت للفرع: ${storeName} (${storeRecords.length} فاتورة)`);
            
            // اسم آمن للشيت (حد أقصى 31 حرف)
            const safeStoreName = storeName
                .replace(/[^a-zA-Z0-9\u0600-\u06FF_]/g, '_')
                .substring(0, 31);
            
            console.log(`📝 اسم الشيت الآمن: ${safeStoreName}`);
            
            const storeSheet = workbook.addWorksheet(safeStoreName);

            // إعداد أعمدة البيانات أولاً
            storeSheet.columns = [
                { header: 'اسم الموظف', key: 'employeeName', width: 20 },
                { header: 'كود الموظف', key: 'employeeSerial', width: 15 },
                { header: 'الموبايل', key: 'mobile', width: 15 },
                { header: 'الموديل', key: 'model', width: 30 },
                { header: 'تاريخ البيع', key: 'salesDate', width: 15 },
                { header: 'صورة الفاتورة', key: 'image', width: 25 }
            ];

            // معلومات الفرع في أعلى الشيت - تصميم محسن
            const storeCode = storeRecords[0]?.storeCode || 'غير محدد';
            const uniqueEmployees = new Set(storeRecords.map(r => r.serial)).size;
            
            // الصف الأول: اسم الفرع
            storeSheet.mergeCells('A1:F1');
            const storeNameCell = storeSheet.getCell('A1');
            storeNameCell.value = `🏢 ${storeName}`;
            storeNameCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1565C0' } // Blue
            };
            storeNameCell.font = {
                color: { argb: 'FFFFFFFF' },
                bold: true,
                size: 16,
                name: 'Arial'
            };
            storeNameCell.alignment = { 
                vertical: 'middle', 
                horizontal: 'center'
            };
            storeNameCell.border = {
                top: { style: 'thick' },
                left: { style: 'thick' },
                bottom: { style: 'thin' },
                right: { style: 'thick' }
            };
            storeSheet.getRow(1).height = 35;

            // الصف الثاني: كود الفرع
            storeSheet.mergeCells('A2:F2');
            const storeCodeCell = storeSheet.getCell('A2');
            storeCodeCell.value = `🏷️ كود الفرع: ${storeCode}`;
            storeCodeCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3E5F5' } // Light purple
            };
            storeCodeCell.font = {
                bold: true,
                size: 14,
                name: 'Arial',
                color: { argb: 'FF1565C0' }
            };
            storeCodeCell.alignment = { 
                vertical: 'middle', 
                horizontal: 'center'
            };
            storeCodeCell.border = {
                top: { style: 'thin' },
                left: { style: 'thick' },
                bottom: { style: 'thin' },
                right: { style: 'thick' }
            };
            storeSheet.getRow(2).height = 30;

            // الصف الثالث: الإحصائيات
            storeSheet.mergeCells('A3:F3');
            const statsCell = storeSheet.getCell('A3');
            statsCell.value = `👥 عدد الموظفين: ${uniqueEmployees} | 📋 عدد الفواتير: ${storeRecords.length} | 📅 تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`;
            statsCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8F9FA' } // Very light gray
            };
            statsCell.font = {
                bold: false,
                size: 11,
                name: 'Arial',
                color: { argb: 'FF6C757D' }
            };
            statsCell.alignment = { 
                vertical: 'middle', 
                horizontal: 'center'
            };
            statsCell.border = {
                top: { style: 'thin' },
                left: { style: 'thick' },
                bottom: { style: 'thick' },
                right: { style: 'thick' }
            };
            storeSheet.getRow(3).height = 25;

            // إضافة صف فارغ للفصل
            storeSheet.getRow(4).height = 10;

            // تنسيق هيدر البيانات (الصف 5) - إعادة تعريف الهيدر
            const headerRow = storeSheet.getRow(5);
            headerRow.values = {
                employeeName: 'اسم الموظف',
                employeeSerial: 'كود الموظف',
                mobile: 'الموبايل',
                model: 'الموديل',
                salesDate: 'تاريخ البيع',
                image: 'صورة الفاتورة'
            };
            
            headerRow.eachCell((cell: any) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1565C0' } // Blue
                };
                cell.font = {
                    color: { argb: 'FFFFFFFF' },
                    bold: true,
                    size: 12,
                    name: 'Arial'
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            headerRow.height = 30;

            // إضافة بيانات الفواتير مع الصور
            let currentRow = 6; // البدء من الصف 6 بعد معلومات الفرع والهيدر
            for (const record of storeRecords) {
                console.log(`📄 إضافة فاتورة: ${record.name} - ${record.model} - صورة: ${!!record.fileDataUrl}`);
                
                const row = storeSheet.getRow(currentRow);
                row.values = {
                    employeeName: record.name,
                    employeeSerial: record.serial,
                    mobile: record.mobile,
                    model: record.model,
                    salesDate: record.salesDate,
                    image: '' // Placeholder for image
                };

                // تنسيق الصف
                row.eachCell((cell: any) => {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
                row.height = 120; // ارتفاع أكبر للصور

                // إدراج الصورة بجودة عالية - الإصلاح الجذري
                if (record.fileDataUrl && (record.fileDataUrl.startsWith('data:image') || record.fileDataUrl.startsWith('data:application/pdf'))) {
                    try {
                        // تحديد نوع الصورة والامتداد
                        let extension = 'jpeg';
                        let base64Data = record.fileDataUrl;
                        
                        if (record.fileDataUrl.includes('data:image/png')) {
                            extension = 'png';
                        } else if (record.fileDataUrl.includes('data:image/jpeg') || record.fileDataUrl.includes('data:image/jpg')) {
                            extension = 'jpeg';
                        } else if (record.fileDataUrl.includes('data:application/pdf')) {
                            // تخطي ملفات PDF في Excel
                            row.getCell('image').value = 'ملف PDF';
                            currentRow++;
                            continue;
                        }

                        // إزالة البادئة من Base64 إذا كانت موجودة - الإصلاح الجذري
                        if (base64Data.includes('base64,')) {
                            base64Data = base64Data.split('base64,')[1];
                        }

                        console.log(`🖼️ إضافة صورة للموظف ${record.name} - النوع: ${extension} - حجم البيانات: ${base64Data.length} حرف`);

                        const imageId = workbook.addImage({
                            base64: base64Data,
                            extension: extension
                        });

                        storeSheet.addImage(imageId, {
                            tl: { col: 5, row: currentRow - 1 }, // عمود الصورة (0-indexed) - العمود السادس الآن
                            ext: { width: 180, height: 100 }, // حجم أكبر للصور
                            editAs: 'oneCell'
                        });
                        
                        totalImagesAdded++;
                        console.log(`✅ تم إدراج الصورة بنجاح للموظف ${record.name}`);
                    } catch (imageError) {
                        totalImagesFailed++;
                        console.error('❌ خطأ في إدراج الصورة:', imageError, 'للموظف:', record.name);
                        row.getCell('image').value = 'خطأ في تحميل الصورة';
                    }
                } else {
                    totalImagesFailed++;
                    console.log(`⚠️ لا توجد صورة للموظف ${record.name} - البيانات:`, record.fileDataUrl ? 'موجودة لكن نوع خاطئ' : 'غير موجودة');
                    row.getCell('image').value = 'لا توجد صورة';
                }
                
                currentRow++;
            }
        }

        console.log(`📈 إحصائيات الصور في Excel: نجح ${totalImagesAdded} | فشل ${totalImagesFailed}`);
        console.log('💾 كتابة ملف Excel...');
        
        // كتابة الملف
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // إنشاء اسم ملف مع التاريخ والوقت
        const now = new Date();
        const dateTime = now.toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
        
        saveAs(blob, `FSMI_TV_HA_تقرير_الفروع_${dateTime}.xlsx`);

        console.log('✅ تم تصدير Excel بنجاح!');
        alert(`تم إنشاء ملف Excel بنجاح!\n\nالإحصائيات:\n- إجمالي الفواتير: ${filteredRecords.length}\n- الصور المضافة: ${totalImagesAdded}\n- بدون صور: ${totalImagesFailed}`);

    } catch (error) {
        console.error("❌ خطأ في تصدير Excel:", error);
        alert("حدث خطأ أثناء إنشاء ملف Excel. يرجى المحاولة مرة أخرى.");
    } finally {
        setLoading(false);
    }
  };

  // 2. STRUCTURED ZIP EXPORT WITH ENHANCED FOLDER STRUCTURE
  const handleExportZip = async () => {
    if (filteredRecords.length === 0) {
        alert("لا توجد بيانات للتحميل.");
        return;
    }
    setLoading(true);

    try {
        console.log('🚀 بدء تصدير ZIP...');
        console.log('📊 عدد السجلات:', filteredRecords.length);
        
        // فحص البيانات بالتفصيل
        console.log('🔍 فحص البيانات الأولى:', filteredRecords[0]);
        
        const zip = new JSZip();
        
        // Helper to count files for naming by model
        const modelCounters: Record<string, number> = {};
        let successfulImages = 0;
        let failedImages = 0;

        for (const record of filteredRecords) {
            console.log(`📄 معالجة فاتورة: ${record.name} - ${record.model} - صورة: ${!!record.fileDataUrl}`);
            
            // Enhanced Folder Structure: StoreName / EmployeeName / Model
            const safeStore = record.storeName.replace(/[^a-z0-9\u0600-\u06FF ]/gi, '_').trim() || "فرع_غير_محدد";
            const safeName = record.name.replace(/[^a-z0-9\u0600-\u06FF ]/gi, '_').trim() || "موظف_غير_محدد";
            const safeModel = record.model.replace(/[^a-z0-9]/gi, '_').trim();
            const safeDate = record.salesDate.replace(/[\/\\]/g, '-');
            
            // New folder structure: Store/Employee/Model
            const folderPath = `${safeStore}/${safeName}/${safeModel}`;
            
            // Model-based naming: Model_Date_Index.ext
            const modelKey = `${safeStore}_${safeName}_${safeModel}`;
            modelCounters[modelKey] = (modelCounters[modelKey] || 0) + 1;
            const idx = modelCounters[modelKey];
            
            // Add image to ZIP if available - الإصلاح الجذري
            if (record.fileDataUrl && (record.fileDataUrl.startsWith('data:image') || record.fileDataUrl.startsWith('data:application/pdf'))) {
                try {
                    // Extract base64 data properly
                    let base64Data = record.fileDataUrl;
                    let ext = 'jpg';
                    
                    // تحديد نوع الملف والامتداد
                    if (record.fileDataUrl.includes('data:image/png')) {
                        ext = 'png';
                    } else if (record.fileDataUrl.includes('data:image/jpeg') || record.fileDataUrl.includes('data:image/jpg')) {
                        ext = 'jpg';
                    } else if (record.fileDataUrl.includes('data:application/pdf')) {
                        ext = 'pdf';
                    }
                    
                    // إزالة البادئة من Base64 - الإصلاح الجذري
                    if (base64Data.includes('base64,')) {
                        base64Data = base64Data.split('base64,')[1];
                    }
                    
                    // Enhanced filename: Model_Date_Index.ext
                    const fileName = `${safeModel}_${safeDate}_${idx}.${ext}`;
                    
                    console.log(`🖼️ إضافة ملف إلى ZIP: ${folderPath}/${fileName} - حجم البيانات: ${base64Data.length} حرف`);
                    
                    // Add file to zip folder with enhanced structure
                    zip.folder(folderPath)?.file(fileName, base64Data, { base64: true });
                    
                    successfulImages++;
                    console.log(`✅ تم إضافة الملف بنجاح: ${fileName}`);
                    
                } catch (imageError) {
                    failedImages++;
                    console.error('❌ خطأ في معالجة الملف:', imageError, 'للموظف:', record.name);
                }
            } else {
                failedImages++;
                console.log(`⚠️ لا يوجد ملف للموظف ${record.name} - البيانات:`, record.fileDataUrl ? 'موجودة لكن نوع خاطئ' : 'غير موجودة');
                if (record.fileDataUrl) {
                    console.log(`🔍 نوع البيانات: ${record.fileDataUrl.substring(0, 50)}...`);
                }
            }
        }

        console.log(`📈 إحصائيات الصور: نجح ${successfulImages} | فشل ${failedImages}`);

        // Create a comprehensive Excel summary
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ملخص الفواتير');
        
        // Define columns for summary
        worksheet.columns = [
            { header: 'الفرع', key: 'store', width: 25 },
            { header: 'الموظف', key: 'employee', width: 25 },
            { header: 'الكود الوظيفي', key: 'serial', width: 15 },
            { header: 'الموبايل', key: 'mobile', width: 15 },
            { header: 'الموديل', key: 'model', width: 30 },
            { header: 'تاريخ البيع', key: 'date', width: 15 },
            { header: 'مسار الملف في ZIP', key: 'filePath', width: 50 }
        ];

        // Style header
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell: any) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1565C0' }
            };
            cell.font = {
                color: { argb: 'FFFFFFFF' },
                bold: true,
                size: 12,
                name: 'Arial'
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        headerRow.height = 30;

        // Add data rows to summary with enhanced structure
        const modelCountersForSummary: Record<string, number> = {};
        
        filteredRecords.forEach(record => {
            const safeStore = record.storeName.replace(/[^a-z0-9\u0600-\u06FF ]/gi, '_').trim() || "فرع_غير_محدد";
            const safeName = record.name.replace(/[^a-z0-9\u0600-\u06FF ]/gi, '_').trim() || "موظف_غير_محدد";
            const safeModel = record.model.replace(/[^a-z0-9]/gi, '_').trim();
            const safeDate = record.salesDate.replace(/[\/\\]/g, '-');
            
            const modelKey = `${safeStore}_${safeName}_${safeModel}`;
            modelCountersForSummary[modelKey] = (modelCountersForSummary[modelKey] || 0) + 1;
            const idx = modelCountersForSummary[modelKey];
            
            // تحديد اسم الملف ومساره مع البنية الجديدة
            let filePath = 'لا يوجد ملف';
            
            if (record.fileDataUrl && (record.fileDataUrl.startsWith('data:image') || record.fileDataUrl.startsWith('data:application/pdf'))) {
                let ext = 'jpg';
                if (record.fileDataUrl.includes('data:image/png')) {
                    ext = 'png';
                } else if (record.fileDataUrl.includes('data:application/pdf')) {
                    ext = 'pdf';
                }
                
                const fileName = `${safeModel}_${safeDate}_${idx}.${ext}`;
                filePath = `${safeStore}/${safeName}/${safeModel}/${fileName}`;
            }
            
            const row = worksheet.addRow({
                store: record.storeName,
                employee: record.name,
                serial: record.serial,
                mobile: record.mobile,
                model: record.model,
                date: record.salesDate,
                filePath: filePath
            });

            // Style row
            row.eachCell((cell: any) => {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Add Excel file to ZIP
        const xlsBuffer = await workbook.xlsx.writeBuffer();
        zip.file("ملخص_الفواتير_التفصيلي.xlsx", xlsBuffer);

        // Add README file with enhanced structure explanation
        const readmeContent = `
# ملف الفواتير المضغوط - FSMI TV & HA By SmartSense (بنية محسنة)

## إحصائيات الملف:
- إجمالي الفواتير: ${filteredRecords.length}
- الصور المضافة بنجاح: ${successfulImages}
- الفواتير بدون صور: ${failedImages}

## محتويات الملف:
- مجلدات منظمة حسب الفرع والموظف والموديل
- صور الفواتير بجودة عالية
- ملف Excel تفصيلي بجميع البيانات

## البنية المحسنة للمجلدات:
📁 اسم_الفرع/
  └── 📁 اسم_الموظف/
      ├── 📁 الموديل_الأول/
      │   ├── 🖼️ الموديل_الأول_التاريخ_1.jpg
      │   └── 🖼️ الموديل_الأول_التاريخ_2.jpg
      ├── 📁 الموديل_الثاني/
      │   └── 🖼️ الموديل_الثاني_التاريخ_1.jpg
      └── 📁 الموديل_الثالث/
          └── 🖼️ الموديل_الثالث_التاريخ_1.jpg

## مثال عملي:
📁 فرع_القاهرة/
  └── 📁 أحمد_محمد/
      ├── 📁 RS68AB820B1_MR/
      │   ├── 🖼️ RS68AB820B1_MR_2026-01-19_1.jpg
      │   └── 🖼️ RS68AB820B1_MR_2026-01-20_2.jpg
      └── 📁 WW11B944DGB_AS/
          └── 🖼️ WW11B944DGB_AS_2026-01-18_1.jpg

## ملاحظات:
- كل موديل في مجلد منفصل لسهولة التنظيم
- أسماء الملفات تحتوي على الموديل والتاريخ والرقم التسلسلي
- ملف Excel يحتوي على مسارات جميع الصور
- البنية الهرمية تسهل البحث والتصفح

تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}
النظام: FSMI TV & HA By SmartSense (Enhanced Structure)
        `;
        
        zip.file("اقرأني_README.txt", readmeContent);

        console.log('💾 إنشاء ملف ZIP...');

        // Generate and download ZIP
        const content = await zip.generateAsync({ 
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: {
                level: 6
            }
        });
        
        // إنشاء اسم ملف مع التاريخ والوقت
        const now = new Date();
        const dateTime = now.toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
        
        saveAs(content, `FSMI_TV_HA_فواتير_منظمة_بالموديل_${dateTime}.zip`);

        console.log('✅ تم تصدير ZIP بنجاح!');
        alert(`تم إنشاء الملف المضغوط بنجاح!\n\nالبنية الجديدة:\n📁 الفرع/الموظف/الموديل/الصور\n\nالإحصائيات:\n- إجمالي الفواتير: ${filteredRecords.length}\n- الصور المضافة: ${successfulImages}\n- بدون صور: ${failedImages}`);

    } catch (error) {
        console.error("❌ خطأ في تصدير ZIP:", error);
        alert("حدث خطأ أثناء إنشاء الملف المضغوط. يرجى المحاولة مرة أخرى.");
    } finally {
        setLoading(false);
    }
  };

  const handleClearData = async () => {
    // تحديد ما إذا كانت هناك فلاتر مطبقة
    const hasFilters = filterName || filterSerial || filterStore || filterModel || filterDateFrom || filterDateTo;
    const recordsCount = hasFilters ? filteredRecords.length : allRecords.length;
    
    // رسالة التأكيد بناءً على وجود فلاتر
    let confirmMessage;
    if (hasFilters) {
      confirmMessage = `تحذير: سيتم حذف البيانات المفلترة فقط (${recordsCount} سجل).\n\nالفلاتر المطبقة:\n`;
      if (filterName) confirmMessage += `- الاسم: ${filterName}\n`;
      if (filterSerial) confirmMessage += `- الكود: ${filterSerial}\n`;
      if (filterStore) confirmMessage += `- الفرع: ${filterStore}\n`;
      if (filterModel) confirmMessage += `- الموديل: ${filterModel}\n`;
      confirmMessage += `\nهل أنت متأكد من حذف هذه البيانات؟`;
    } else {
      confirmMessage = `تحذير: سيتم حذف جميع البيانات (${recordsCount} سجل).\n\nهذا سيحذف:\n- جميع الفواتير\n- جميع الطلبات\n- جميع بيانات الموظفين\n- جميع الملفات المرفوعة\n\nهل أنت متأكد؟`;
    }

    if (confirm(confirmMessage)) {
      setLoading(true);
      
      try {
        let result;
        
        if (hasFilters) {
          // حذف البيانات المفلترة
          result = await ApiService.clearFilteredData(sessionToken, {
            name: filterName || undefined,
            serial: filterSerial || undefined,
            store: filterStore || undefined,
            model: filterModel || undefined,
            dateFrom: filterDateFrom || undefined,
            dateTo: filterDateTo || undefined
          });
        } else {
          // حذف جميع البيانات
          result = await MockDB.clearData();
        }
        
        if (result.success) {
          alert(result.message || 'تم حذف البيانات بنجاح');
          
          // إعادة تعيين الفلاتر إذا تم حذف البيانات المفلترة
          if (hasFilters) {
            setFilterName('');
            setFilterSerial('');
            setFilterStore('');
            setFilterModel('');
            // إعادة تعيين فلاتر التاريخ للشهر الحالي
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setFilterDateFrom(firstDay.toISOString().split('T')[0]);
            setFilterDateTo(lastDay.toISOString().split('T')[0]);
          }
          
          // إعادة تحميل البيانات
          refreshData();
        } else {
          alert(result.message || 'حدث خطأ في حذف البيانات');
        }
      } catch (error) {
        console.error('خطأ في حذف البيانات:', error);
        alert('حدث خطأ في حذف البيانات');
      } finally {
        setLoading(false);
      }
    }
  };

  // حذف الفواتير المفلترة فقط (بدون حذف بيانات الموظفين)
  const handleClearInvoicesOnly = async () => {
    // تحديد ما إذا كانت هناك فلاتر مطبقة
    const hasFilters = filterName || filterSerial || filterStore || filterModel || filterDateFrom || filterDateTo;
    const recordsCount = hasFilters ? filteredRecords.length : allRecords.length;
    
    // رسالة التأكيد
    let confirmMessage;
    if (hasFilters) {
      confirmMessage = `تحذير: سيتم حذف الفواتير المفلترة فقط (${recordsCount} فاتورة).\n\nالفلاتر المطبقة:\n`;
      if (filterName) confirmMessage += `- الاسم: ${filterName}\n`;
      if (filterSerial) confirmMessage += `- الكود: ${filterSerial}\n`;
      if (filterStore) confirmMessage += `- الفرع: ${filterStore}\n`;
      if (filterModel) confirmMessage += `- الموديل: ${filterModel}\n`;
      confirmMessage += `\nملاحظة: بيانات الموظفين ستبقى محفوظة.\n\nهل أنت متأكد من حذف هذه الفواتير؟`;
    } else {
      confirmMessage = `تحذير: سيتم حذف جميع الفواتير (${recordsCount} فاتورة).\n\nملاحظة: بيانات الموظفين ستبقى محفوظة.\n\nهل أنت متأكد؟`;
    }

    if (confirm(confirmMessage)) {
      setLoading(true);
      
      try {
        console.log('🔄 بدء حذف الفواتير المفلترة...');
        console.log('🔑 Session Token:', sessionToken ? 'موجود' : 'غير موجود');
        
        // حذف الفواتير المفلترة فقط
        const result = await ApiService.clearFilteredInvoices(sessionToken, {
          name: filterName || undefined,
          serial: filterSerial || undefined,
          store: filterStore || undefined,
          model: filterModel || undefined,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined
        });
        
        console.log('📋 نتيجة API:', result);
        
        if (result.success) {
          alert(result.message || 'تم حذف الفواتير بنجاح');
          
          // إعادة تعيين الفلاتر إذا تم حذف الفواتير المفلترة
          if (hasFilters) {
            setFilterName('');
            setFilterSerial('');
            setFilterStore('');
            setFilterModel('');
            // إعادة تعيين فلاتر التاريخ للشهر الحالي
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setFilterDateFrom(firstDay.toISOString().split('T')[0]);
            setFilterDateTo(lastDay.toISOString().split('T')[0]);
          }
          
          // إعادة تحميل البيانات
          refreshData();
        } else {
          console.error('❌ فشل API:', result.message);
          alert(`فشل في حذف الفواتير: ${result.message || 'خطأ غير معروف'}`);
        }
      } catch (error) {
        console.error('❌ خطأ في حذف الفواتير:', error);
        alert(`خطأ في الاتصال بالخادم: ${error.message || 'تأكد من تشغيل الخادم'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const goHome = () => {
      window.location.hash = '#/';
  };

  const clearFilters = () => {
      setFilterName('');
      setFilterSerial('');
      setFilterStore('');
      setFilterModel('');
  };

  // دالة تغيير كلمة المرور
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // التحقق من تطابق كلمة المرور الجديدة
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    // التحقق من قوة كلمة المرور
    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    try {
      // تغيير كلمة المرور عبر الخادم
      const result = await AdminService.changePassword(sessionToken, currentPassword, newPassword);
      
      if (result.success) {
        setPasswordSuccess('تم تغيير كلمة المرور بنجاح!');
        
        // إعادة تعيين النموذج
        setTimeout(() => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setShowPasswordModal(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        setPasswordError(result.message || 'حدث خطأ في تغيير كلمة المرور');
      }
    } catch (error) {
      setPasswordError('خطأ في الاتصال بالخادم');
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  // دوال إدارة الموديلات
  const openModelsModal = () => {
    setShowModelsModal(true);
    loadModels();
  };

  const closeModelsModal = () => {
    setShowModelsModal(false);
    setShowModelForm(false);
    setEditingModel(null);
    resetModelForm();
  };

  const resetModelForm = () => {
    setModelForm({
      name: '',
      category: '',
      description: '',
      isActive: true
    });
    setModelError('');
    setModelSuccess('');
  };

  const openAddModelForm = () => {
    resetModelForm();
    setEditingModel(null);
    setShowModelForm(true);
  };

  const openEditModelForm = (model: Model) => {
    setModelForm({
      name: model.name,
      category: model.category,
      description: model.description || '',
      isActive: model.isActive
    });
    setEditingModel(model);
    setShowModelForm(true);
    setModelError('');
    setModelSuccess('');
  };

  const handleModelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModelError('');
    setModelSuccess('');

    if (!modelForm.name.trim() || !modelForm.category.trim()) {
      setModelError('اسم الموديل والفئة مطلوبان');
      return;
    }

    try {
      let result;
      if (editingModel) {
        // تحديث موديل موجود
        result = await ApiService.updateModel(
          sessionToken,
          editingModel.id,
          modelForm.name.trim(),
          modelForm.category.trim(),
          modelForm.description.trim(),
          modelForm.isActive
        );
      } else {
        // إضافة موديل جديد
        result = await ApiService.addModel(
          sessionToken,
          modelForm.name.trim(),
          modelForm.category.trim(),
          modelForm.description.trim()
        );
      }

      if (result.success) {
        setModelSuccess(result.message || 'تم حفظ الموديل بنجاح!');
        await loadModels(); // إعادة تحميل القائمة
        
        setTimeout(() => {
          setShowModelForm(false);
          setEditingModel(null);
          resetModelForm();
        }, 1500);
      } else {
        setModelError(result.message || 'حدث خطأ في حفظ الموديل');
      }
    } catch (error) {
      setModelError('خطأ في الاتصال بالخادم');
    }
  };

  const handleDeleteModel = async (model: Model) => {
    if (!confirm(`هل أنت متأكد من حذف الموديل "${model.name}"؟\n\nملاحظة: لا يمكن حذف الموديل إذا كان مستخدماً في فواتير موجودة.`)) {
      return;
    }

    try {
      const result = await ApiService.deleteModel(sessionToken, model.id);
      
      if (result.success) {
        alert(result.message || 'تم حذف الموديل بنجاح!');
        await loadModels(); // إعادة تحميل القائمة
      } else {
        alert(result.message || 'حدث خطأ في حذف الموديل');
      }
    } catch (error) {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  return (
    <Layout isAdmin>
      {/* Header & Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-gray-800 mb-6">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">لوحة تحكم المشرفين</h2>
                <p className="text-gray-500 text-sm mt-1">عرض وتحليل الفواتير ({filteredRecords.length} نتيجة)</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
                 <button onClick={goHome} className="btn-secondary flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-gray-700 text-sm">
                    <Home size={16} /> الرئيسية
                 </button>
                 
                 <button onClick={handleClearData} disabled={loading} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded text-sm border border-red-200">
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    {(filterName || filterSerial || filterStore || filterModel) 
                      ? `حذف المفلتر (${filteredRecords.length})` 
                      : `حذف الكل (${allRecords.length})`
                    }
                 </button>

                 <button onClick={handleClearInvoicesOnly} disabled={loading} className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-600 px-4 py-2 rounded text-sm border border-orange-200">
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <FileArchive size={16} />}
                    {(filterName || filterSerial || filterStore || filterModel) 
                      ? `حذف فواتير فقط (${filteredRecords.length})` 
                      : `حذف كل الفواتير (${allRecords.length})`
                    }
                 </button>
                 
                 <div className="w-px h-8 bg-gray-300 mx-1 hidden lg:block"></div>

                 <button onClick={handleExportZip} disabled={loading} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded text-sm font-bold shadow">
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <FileArchive size={16} />}
                    تحميل صور منظمة (ZIP)
                 </button>

                 <button onClick={handleExportExcel} disabled={loading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow">
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
                    Excel متقدم (شيتات منفصلة)
                 </button>
                 
                 <div className="w-px h-8 bg-gray-300 mx-1 hidden lg:block"></div>

                 <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm shadow">
                    <Key size={16} /> تغيير كلمة المرور
                 </button>

                 <button onClick={openModelsModal} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm shadow">
                    <Package size={16} /> إدارة الموديلات
                 </button>
                 
                 <button onClick={onLogout} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded text-sm shadow">
                    <LogOut size={16} />
                 </button>
            </div>
        </div>

        {/* Filters Bar with Datalists (Searchable Dropdowns) */}
        <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-600">الفلترة والبحث (اختر من القائمة أو اكتب للبحث):</span>
                    {(filterName || filterSerial || filterStore || filterModel) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            مفلتر: {filteredRecords.length} من {allRecords.length}
                        </span>
                    )}
                </div>
                {(filterName || filterSerial || filterStore || filterModel) && (
                    <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                        <XCircle size={14} /> مسح الفلاتر
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Employee Name */}
                <div className="relative">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input 
                        list="list-names"
                        type="text" 
                        placeholder="ابحث بالاسم..." 
                        value={filterName}
                        onChange={e => setFilterName(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 border rounded bg-gray-50 focus:bg-white transition"
                    />
                    <datalist id="list-names">
                        {uniqueNames.map((val, i) => <option key={i} value={val} />)}
                    </datalist>
                </div>

                {/* Serial */}
                <div className="relative">
                    <Filter className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input 
                        list="list-serials"
                        type="text" 
                        placeholder="كود الموظف..." 
                        value={filterSerial}
                        onChange={e => setFilterSerial(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 border rounded bg-gray-50 focus:bg-white transition"
                    />
                     <datalist id="list-serials">
                        {uniqueSerials.map((val, i) => <option key={i} value={val} />)}
                    </datalist>
                </div>

                {/* Store */}
                <div className="relative">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input 
                        list="list-stores"
                        type="text" 
                        placeholder="الفرع..." 
                        value={filterStore}
                        onChange={e => setFilterStore(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 border rounded bg-gray-50 focus:bg-white transition"
                    />
                    <datalist id="list-stores">
                        {uniqueStores.map((val, i) => <option key={i} value={val} />)}
                    </datalist>
                </div>

                {/* Model */}
                <div className="relative">
                    <Filter className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input 
                        list="list-models"
                        type="text" 
                        placeholder="الموديل..." 
                        value={filterModel}
                        onChange={e => setFilterModel(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 border rounded bg-gray-50 focus:bg-white transition"
                    />
                    <datalist id="list-models">
                        {uniqueModels.map((val, i) => <option key={i} value={val} />)}
                    </datalist>
                </div>
            </div>

            {/* Date Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="md:col-span-3 mb-2">
                    <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                        📅 فلتر التاريخ
                        <span className="text-xs text-blue-600 font-normal">(افتراضياً: الشهر الحالي)</span>
                    </h3>
                </div>
                
                {/* Date From */}
                <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">من تاريخ</label>
                    <input 
                        type="date" 
                        value={filterDateFrom}
                        onChange={e => setFilterDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded bg-white focus:bg-white focus:border-blue-500 transition text-sm"
                    />
                </div>

                {/* Date To */}
                <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">إلى تاريخ</label>
                    <input 
                        type="date" 
                        value={filterDateTo}
                        onChange={e => setFilterDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded bg-white focus:bg-white focus:border-blue-500 transition text-sm"
                    />
                </div>

                {/* Quick Date Filters */}
                <div>
                    <label className="block text-xs font-medium text-blue-700 mb-1">فلاتر سريعة</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const now = new Date();
                                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                setFilterDateFrom(firstDay.toISOString().split('T')[0]);
                                setFilterDateTo(lastDay.toISOString().split('T')[0]);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                        >
                            الشهر الحالي
                        </button>
                        <button
                            onClick={() => {
                                const now = new Date();
                                const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                                setFilterDateFrom(firstDay.toISOString().split('T')[0]);
                                setFilterDateTo(lastDay.toISOString().split('T')[0]);
                            }}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition"
                        >
                            الشهر الماضي
                        </button>
                        <button
                            onClick={() => {
                                setFilterDateFrom('');
                                setFilterDateTo('');
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                        >
                            إلغاء الفلتر
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموظف</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفرع</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الموديل</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">التاريخ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الصورة</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.name}</div>
                    <div className="text-sm text-gray-500">{record.serial} | {record.mobile}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{record.storeName}</div>
                    <div className="text-sm text-gray-500">{record.storeCode}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.model}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.salesDate}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {record.fileDataUrl ? (
                      <div className="flex items-center gap-2">
                        <img 
                          src={record.fileDataUrl} 
                          alt="فاتورة" 
                          className="h-12 w-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setSelectedImage({
                              url: record.fileDataUrl!,
                              name: `فاتورة ${record.name} - ${record.model}`
                            });
                            setShowImageModal(true);
                          }}
                        />
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => {
                              setSelectedImage({
                                url: record.fileDataUrl!,
                                name: `فاتورة ${record.name} - ${record.model}`
                              });
                              setShowImageModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="معاينة الصورة"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = record.fileDataUrl!;
                              link.download = `فاتورة_${record.name}_${record.model}_${record.salesDate}.jpg`;
                              link.click();
                            }}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50 transition-colors"
                            title="تحميل الصورة"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">لا توجد صورة</span>
                    )}
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد بيانات تطابق الفلاتر المحددة</p>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Key size={20} />
                تغيير كلمة المرور
              </h3>
              <button onClick={closePasswordModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ادخل كلمة المرور الحالية"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ادخل كلمة المرور الجديدة"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  required
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                  {passwordSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  حفظ التغييرات
                </button>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Models Management Modal */}
      {showModelsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Package size={24} />
                إدارة الموديلات
              </h3>
              <button onClick={closeModelsModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {!showModelForm ? (
                <>
                  {/* Header with Add Button */}
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-gray-600">إدارة موديلات المنتجات المتاحة في النظام</p>
                    <button
                      onClick={openAddModelForm}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Plus size={16} />
                      إضافة موديل جديد
                    </button>
                  </div>

                  {/* Models List */}
                  {modelsLoading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                      <p className="text-gray-500">جاري تحميل الموديلات...</p>
                    </div>
                  ) : models.length === 0 ? (
                    <div className="text-center py-8">
                      <Package size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500">لا توجد موديلات مضافة بعد</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">اسم الموديل</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الفئة</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">الوصف</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">الحالة</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {models.map((model) => (
                            <tr key={model.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{model.name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{model.category}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{model.description || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  model.isActive 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {model.isActive ? 'نشط' : 'غير نشط'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => openEditModelForm(model)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="تعديل"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteModel(model)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="حذف"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                /* Model Form */
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setShowModelForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ← العودة
                    </button>
                    <h4 className="text-lg font-semibold text-gray-800">
                      {editingModel ? 'تعديل الموديل' : 'إضافة موديل جديد'}
                    </h4>
                  </div>

                  <form onSubmit={handleModelSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          اسم الموديل *
                        </label>
                        <input
                          type="text"
                          value={modelForm.name}
                          onChange={(e) => setModelForm({...modelForm, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="مثال: RS68AB820B1/MR"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          الفئة *
                        </label>
                        <input
                          type="text"
                          value={modelForm.category}
                          onChange={(e) => setModelForm({...modelForm, category: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="مثال: ثلاجات، غسالات، تكييفات"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الوصف
                      </label>
                      <textarea
                        value={modelForm.description}
                        onChange={(e) => setModelForm({...modelForm, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="وصف اختياري للموديل"
                        rows={3}
                      />
                    </div>

                    {editingModel && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={modelForm.isActive}
                          onChange={(e) => setModelForm({...modelForm, isActive: e.target.checked})}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700">
                          الموديل نشط ومتاح للاستخدام
                        </label>
                      </div>
                    )}

                    {modelError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                        {modelError}
                      </div>
                    )}

                    {modelSuccess && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                        {modelSuccess}
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
                      >
                        <Save size={16} />
                        {editingModel ? 'حفظ التعديلات' : 'إضافة الموديل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowModelForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="relative w-full h-full max-w-6xl bg-white rounded-lg overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-gray-50 flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">معاينة الفاتورة</h3>
                <p className="text-sm text-gray-600">{selectedImage.name}</p>
              </div>
              <button 
                onClick={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Image Section */}
            <div className="flex-1 p-2 sm:p-4 overflow-auto bg-gray-100 flex items-center justify-center">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.name}
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
            
            {/* Footer */}
            <div className="p-3 sm:p-4 border-t bg-gray-50 flex-shrink-0">
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
                <button
                  onClick={() => {
                    setShowImageModal(false);
                    setSelectedImage(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  إغلاق المعاينة
                </button>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedImage.url;
                    link.download = `${selectedImage.name}.jpg`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  تحميل الصورة
                </button>
                <button
                  onClick={() => {
                    const img = document.querySelector('.fixed img') as HTMLImageElement;
                    if (img) {
                      if (img.style.transform === 'scale(1.5)') {
                        img.style.transform = 'scale(1)';
                      } else {
                        img.style.transform = 'scale(1.5)';
                      }
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  <ZoomIn size={16} />
                  تكبير/تصغير
                </button>
              </div>
              
              {/* Mobile Helper Tips */}
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700 text-center">
                💡 اضغط على الصورة للتكبير/التصغير • استخدم أزرار التحكم أعلاه
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AdminDashboard;