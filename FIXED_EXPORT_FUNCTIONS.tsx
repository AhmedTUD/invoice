import React, { useState } from 'react';
import { JoinedRecord } from './types';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// Declare ExcelJS from global scope (loaded via script tag in index.html)
declare const ExcelJS: any;

interface ExportFunctionsProps {
  filteredRecords: JoinedRecord[];
}

const ExportFunctions: React.FC<ExportFunctionsProps> = ({ filteredRecords }) => {
  const [loading, setLoading] = useState(false);

  // 1. تصدير Excel المتقدم مع الصور
  const handleExportExcelFixed = async () => {
    if (filteredRecords.length === 0) {
        alert("لا توجد بيانات للتحميل.");
        return;
    }
    setLoading(true);

    try {
        console.log('🚀 بدء تصدير Excel المتقدم...');
        console.log('📊 عدد السجلات:', filteredRecords.length);
        
        // فحص البيانات أولاً
        const recordsWithImages = filteredRecords.filter(r => 
            r.fileDataUrl && (r.fileDataUrl.startsWith('data:image') || r.fileDataUrl.startsWith('data:application/pdf'))
        );
        console.log('🖼️ عدد السجلات مع صور:', recordsWithImages.length);
        
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
            
            const storeSheet = workbook.addWorksheet(safeStoreName);

            // معلومات الفرع في أعلى الشيت
            const storeCode = storeRecords[0]?.storeCode || 'غير محدد';
            const uniqueEmployees = new Set(storeRecords.map(r => r.serial)).size;
            
            // صف معلومات الفرع
            storeSheet.mergeCells('A1:G3');
            const infoCell = storeSheet.getCell('A1');
            infoCell.value = `الفرع: ${storeName}\nكود الفرع: ${storeCode}\nعدد الموظفين: ${uniqueEmployees} | عدد الفواتير: ${storeRecords.length}\nتاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}`;
            infoCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF3E5F5' } // Light purple
            };
            infoCell.font = {
                bold: true,
                size: 12,
                name: 'Arial'
            };
            infoCell.alignment = { 
                vertical: 'middle', 
                horizontal: 'center',
                wrapText: true 
            };
            infoCell.border = {
                top: { style: 'thick' },
                left: { style: 'thick' },
                bottom: { style: 'thick' },
                right: { style: 'thick' }
            };

            // إعداد أعمدة البيانات
            storeSheet.columns = [
                { header: 'اسم الموظف', key: 'employeeName', width: 20 },
                { header: 'كود الموظف', key: 'employeeSerial', width: 15 },
                { header: 'الموبايل', key: 'mobile', width: 15 },
                { header: 'الموديل', key: 'model', width: 30 },
                { header: 'تاريخ البيع', key: 'salesDate', width: 15 },
                { header: 'اسم الملف', key: 'fileName', width: 25 },
                { header: 'صورة الفاتورة', key: 'image', width: 25 }
            ];

            // تنسيق هيدر البيانات (الصف 5)
            const headerRow = storeSheet.getRow(5);
            headerRow.values = {
                employeeName: 'اسم الموظف',
                employeeSerial: 'كود الموظف',
                mobile: 'الموبايل',
                model: 'الموديل',
                salesDate: 'تاريخ البيع',
                fileName: 'اسم الملف',
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
            let currentRow = 6; // البدء من الصف 6
            for (const record of storeRecords) {
                const row = storeSheet.getRow(currentRow);
                row.values = {
                    employeeName: record.name,
                    employeeSerial: record.serial,
                    mobile: record.mobile,
                    model: record.model,
                    salesDate: record.salesDate,
                    fileName: record.fileName || 'غير محدد',
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

                // إدراج الصورة بجودة عالية
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

                        // إزالة البادئة من Base64 إذا كانت موجودة
                        if (base64Data.includes('base64,')) {
                            base64Data = base64Data.split('base64,')[1];
                        }

                        console.log(`إضافة صورة للموظف ${record.name} - النوع: ${extension}`);

                        const imageId = workbook.addImage({
                            base64: base64Data,
                            extension: extension
                        });

                        storeSheet.addImage(imageId, {
                            tl: { col: 6, row: currentRow - 1 }, // عمود الصورة (0-indexed)
                            ext: { width: 180, height: 100 }, // حجم أكبر للصور
                            editAs: 'oneCell'
                        });
                        
                        totalImagesAdded++;
                        console.log(`✅ تم إدراج الصورة بنجاح للموظف ${record.name}`);
                    } catch (imageError) {
                        totalImagesFailed++;
                        console.error('خطأ في إدراج الصورة:', imageError, 'للموظف:', record.name);
                        row.getCell('image').value = 'خطأ في تحميل الصورة';
                    }
                } else {
                    totalImagesFailed++;
                    console.log(`لا توجد صورة للموظف ${record.name} - البيانات:`, record.fileDataUrl ? 'موجودة لكن نوع خاطئ' : 'غير موجودة');
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
        console.error("خطأ في تصدير Excel:", error);
        alert("حدث خطأ أثناء إنشاء ملف Excel. يرجى المحاولة مرة أخرى.");
    } finally {
        setLoading(false);
    }
  };

  // 2. تصدير ZIP المحسن مع الصور
  const handleExportZipFixed = async () => {
    if (filteredRecords.length === 0) {
        alert("لا توجد بيانات للتحميل.");
        return;
    }
    setLoading(true);

    try {
        console.log('🚀 بدء تصدير ZIP...');
        console.log('📊 عدد السجلات:', filteredRecords.length);
        
        const zip = new JSZip();
        
        // Helper to count files for naming
        const nameCounters: Record<string, number> = {};
        let successfulImages = 0;
        let failedImages = 0;

        for (const record of filteredRecords) {
            // Folder Structure: StoreName / EmployeeName
            const safeStore = record.storeName.replace(/[^a-z0-9\u0600-\u06FF ]/gi, '_').trim() || "فرع_غير_محدد";
            const safeName = record.name.replace(/[^a-z0-9\u0600-\u06FF ]/gi, '_').trim() || "موظف_غير_محدد";
            const safeModel = record.model.replace(/[^a-z0-9]/gi, '_').trim();
            const safeDate = record.salesDate.replace(/[\/\\]/g, '-');
            
            const folderPath = `${safeStore}/${safeName}`;
            
            // Image Naming: Model_Date_Index.ext
            const counterKey = `${safeStore}_${safeName}_${safeModel}_${safeDate}`;
            nameCounters[counterKey] = (nameCounters[counterKey] || 0) + 1;
            const idx = nameCounters[counterKey];
            
            // Add image to ZIP if available
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
                    
                    // إزالة البادئة من Base64
                    if (base64Data.includes('base64,')) {
                        base64Data = base64Data.split('base64,')[1];
                    }
                    
                    // استخدام اسم الملف الأصلي إذا كان متوفراً، وإلا استخدم الموديل والتاريخ
                    const fileName = record.fileName && record.fileName.trim() 
                        ? record.fileName 
                        : `${safeModel}_${safeDate}_${idx}.${ext}`;
                    
                    console.log(`إضافة ملف إلى ZIP: ${folderPath}/${fileName}`);
                    
                    // Add file to zip folder
                    zip.folder(folderPath)?.file(fileName, base64Data, { base64: true });
                    
                    successfulImages++;
                    console.log(`✅ تم إضافة الملف بنجاح: ${fileName}`);
                    
                } catch (imageError) {
                    failedImages++;
                    console.error('خطأ في معالجة الملف:', imageError, 'للموظف:', record.name);
                }
            } else {
                failedImages++;
                console.log(`لا يوجد ملف للموظف ${record.name} - البيانات:`, record.fileDataUrl ? 'موجودة لكن نوع خاطئ' : 'غير موجودة');
            }
        }

        console.log(`📈 إحصائيات الصور: نجح ${successfulImages} | فشل ${failedImages}`);

        // إضافة ملف README مع الإحصائيات
        const readmeContent = `
# ملف الفواتير المضغوط - FSMI TV & HA By SmartSense

## إحصائيات الملف:
- إجمالي الفواتير: ${filteredRecords.length}
- الصور المضافة بنجاح: ${successfulImages}
- الفواتير بدون صور: ${failedImages}

## محتويات الملف:
- مجلدات منظمة حسب الفرع والموظف
- صور الفواتير بجودة عالية

## بنية المجلدات:
📁 اسم_الفرع/
  └── 📁 اسم_الموظف/
      ├── 🖼️ الموديل_التاريخ_1.jpg
      ├── 🖼️ الموديل_التاريخ_2.jpg
      └── ...

تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}
النظام: FSMI TV & HA By SmartSense
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
        
        saveAs(content, `FSMI_TV_HA_فواتير_مع_صور_${dateTime}.zip`);

        console.log('✅ تم تصدير ZIP بنجاح!');
        alert(`تم إنشاء الملف المضغوط بنجاح!\n\nالإحصائيات:\n- إجمالي الفواتير: ${filteredRecords.length}\n- الصور المضافة: ${successfulImages}\n- بدون صور: ${failedImages}`);

    } catch (error) {
        console.error("خطأ في تصدير ZIP:", error);
        alert("حدث خطأ أثناء إنشاء الملف المضغوط. يرجى المحاولة مرة أخرى.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="export-functions">
      <div className="flex gap-4">
        <button
          onClick={handleExportExcelFixed}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {loading ? '⏳' : '📊'} تصدير Excel محسن
        </button>
        
        <button
          onClick={handleExportZipFixed}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          {loading ? '⏳' : '📁'} تصدير ZIP محسن
        </button>
      </div>
    </div>
  );
};

export default ExportFunctions;