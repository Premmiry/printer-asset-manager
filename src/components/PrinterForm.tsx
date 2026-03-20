import React, { useState, useEffect } from 'react';
import { Printer, PrinterBrand, PrinterType, ColorMode, PRINTER_BRANDS, PRINTER_TYPES, Department, UserProfile } from '../types';
import { db, auth, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, where } from '../firebase';
import { X, Save, Printer as PrinterIcon, Plus, Trash2, Search, ChevronDown, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Tesseract from 'tesseract.js';

interface PrinterFormProps {
  printer?: Printer | null;
  userProfile: UserProfile | null;
  onClose: () => void;
}

interface PrinterEntry {
  assetId: string;
  model: string;
  brand: PrinterBrand;
  type: PrinterType;
  colorMode: ColorMode;
}

export const PrinterForm: React.FC<PrinterFormProps> = ({ printer, userProfile, onClose }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mainDepartmentCode, setMainDepartmentCode] = useState<string>(printer?.departmentCode || '');
  const [entries, setEntries] = useState<PrinterEntry[]>([
    {
      assetId: printer?.assetId || '',
      model: printer?.model || '',
      brand: printer?.brand || 'Epson',
      type: printer?.type || 'Laser',
      colorMode: printer?.colorMode || 'Monochrome',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [existingPrinters, setExistingPrinters] = useState<Printer[]>([]);
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  
  // OCR Review States
  const [ocrResult, setOcrResult] = useState<string>('');
  const [showOcrReview, setShowOcrReview] = useState(false);
  const [activeOcrIndex, setActiveOcrIndex] = useState<number | null>(null);

  const filteredDepts = departments.filter(d => 
    d.thaiName.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearch.toLowerCase())
  );

  useEffect(() => {
    const q = query(collection(db, 'departments'), orderBy('code', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[];
      
      let filteredData = data;
      if (userProfile?.role !== 'admin') {
        filteredData = data.filter(d => d.companyCode === userProfile?.companyCode);
      }
      setDepartments(filteredData);
      
      // Set default department if not set
      if (filteredData.length > 0 && !printer && !mainDepartmentCode) {
        setMainDepartmentCode(filteredData[0].code);
      }
    });
    return () => unsubscribe();
  }, [printer, userProfile]);

  useEffect(() => {
    if (!mainDepartmentCode) {
      setExistingPrinters([]);
      return;
    }
    const q = query(
      collection(db, 'printers'), 
      where('departmentCode', '==', mainDepartmentCode)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Printer[];
      setExistingPrinters(data);
    });
    return () => unsub();
  }, [mainDepartmentCode]);

  const handleAddEntry = () => {
    setEntries([...entries, {
      assetId: '',
      model: entries[entries.length - 1].model, // Copy last model for convenience
      brand: entries[entries.length - 1].brand,
      type: entries[entries.length - 1].type,
      colorMode: entries[entries.length - 1].colorMode,
    }]);
  };

  const handleRemoveEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof PrinterEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningIndex(index);
    try {
      const result = await Tesseract.recognize(file, 'eng');
      const rawText = result.data.text;
      
      // 1. Remove all spaces to handle cases where OCR reads "H R - 5 6"
      const noSpaceText = rawText.replace(/\s+/g, '');
      
      // 2. Use Regex to find the pattern of asset ID (e.g., HR-56/00051 or PRT-001)
      // Looks for: At least 2 letters, a dash, and some numbers. Optionally followed by a slash and more numbers.
      const match = noSpaceText.match(/[A-Z]{2,}-\d+(?:\/\d+)?/i);
      
      let finalId = '';
      if (match) {
        finalId = match[0].toUpperCase();
      } else {
        // Fallback: Just strip out completely invalid characters
        finalId = rawText.replace(/[^a-zA-Z0-9-/]/g, '').toUpperCase();
        if (finalId.length > 20) {
          finalId = finalId.substring(0, 20); // Keep it short if it's garbage
        }
      }

      if (finalId) {
        setOcrResult(finalId);
        setActiveOcrIndex(index);
        setShowOcrReview(true);
      } else {
        alert('ไม่พบตัวอักษรในภาพ พยายามถ่ายให้เห็นเฉพาะป้ายรหัสให้ชัดเจนที่สุดครับ');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      alert('เกิดข้อผิดพลาดในการแสกนภาพ');
    } finally {
      setScanningIndex(null);
      e.target.value = ''; // Reset input
    }
  };

  const confirmOcrResult = () => {
    if (activeOcrIndex !== null) {
      updateEntry(activeOcrIndex, 'assetId', ocrResult);
      setShowOcrReview(false);
      setActiveOcrIndex(null);
      setOcrResult('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Unknown';

      if (!mainDepartmentCode) {
        setError('กรุณาเลือกแผนก');
        setLoading(false);
        return;
      }

      if (printer) {
        // Edit mode (update first entry)
        await updateDoc(doc(db, 'printers', printer.id), {
          ...entries[0],
          departmentCode: mainDepartmentCode,
          updatedAt: Date.now(),
          updatedBy: auth.currentUser?.uid,
          updatedByName: currentUserName,
        });

        // Add any newly appended entries in edit mode
        if (entries.length > 1) {
          const newEntries = entries.slice(1);
          const promises = newEntries.map(entry => 
            addDoc(collection(db, 'printers'), {
              ...entry,
              departmentCode: mainDepartmentCode,
              companyCode: printer.companyCode || (departments.find(d => d.code === mainDepartmentCode)?.companyCode || 'ALL'),
              createdAt: Date.now(),
              createdBy: auth.currentUser?.uid,
              createdByName: currentUserName,
            })
          );
          await Promise.all(promises);
        }
      } else {
        // Multi-add mode
        const promises = entries.map(entry => 
          addDoc(collection(db, 'printers'), {
            ...entry,
            departmentCode: mainDepartmentCode,
            companyCode: userProfile?.role === 'admin' 
              ? (departments.find(d => d.code === mainDepartmentCode)?.companyCode || 'ALL')
              : userProfile?.companyCode,
            createdAt: Date.now(),
            createdBy: auth.currentUser?.uid,
            createdByName: currentUserName,
          })
        );
        await Promise.all(promises);
      }
      onClose();
    } catch (err) {
      console.error('Error saving printer:', err);
      setError('Failed to save printer. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <PrinterIcon size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {printer ? 'แก้ไขข้อมูล' : 'เพิ่มเครื่องพิมพ์ใหม่'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Main Department Selection */}
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 relative z-20">
              <label className="block text-sm font-black text-indigo-900 uppercase mb-3">
                เลือกแผนกหลัก (สำหรับทุกเครื่องที่เพิ่ม)
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsDeptDropdownOpen(!isDeptDropdownOpen);
                  setDeptSearch('');
                }}
                className="w-full px-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-left flex items-center justify-between font-medium shadow-sm hover:border-indigo-300 transition-colors"
              >
                <span className="truncate text-slate-700">
                  {departments.find(d => d.code === mainDepartmentCode)?.thaiName || 'กรุณาเลือกแผนก...'}
                </span>
                <ChevronDown size={18} className={`text-indigo-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDeptDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setIsDeptDropdownOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-30 overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-50">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            autoFocus
                            type="text"
                            placeholder="ค้นหาแผนก..."
                            value={deptSearch}
                            onChange={(e) => setDeptSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto p-2">
                        {filteredDepts.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setMainDepartmentCode(d.code);
                              setIsDeptDropdownOpen(false);
                              setDeptSearch('');
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                              mainDepartmentCode === d.code ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-700 font-medium'
                            }`}
                          >
                            {d.thaiName}
                          </button>
                        ))}
                        {filteredDepts.length === 0 && (
                          <p className="text-center py-6 text-sm text-slate-400 italic">ไม่พบแผนกที่ค้นหา</p>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Show Existing Printers for selected department */}
              {existingPrinters.length > 0 && (
                <div className="mt-4 p-3 bg-white/60 rounded-xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-800 mb-2 flex items-center justify-between">
                    <span>เครื่องพิมพ์ที่บันทึกแล้วในแผนกนี้ ({existingPrinters.length} เครื่อง)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {existingPrinters.map(p => (
                      <span key={p.id} className="text-[10px] font-semibold bg-white border border-indigo-100 text-slate-600 px-2 py-1 rounded-lg shadow-sm">
                        {p.assetId} - {p.model}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">รายละเอียดเครื่องพิมพ์ (Sub)</h3>
              </div>
              {entries.map((entry, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                  {entries.length > 1 && (!printer || index > 0) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors z-10"
                    >
                      <X size={14} />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">รหัสทรัพย์สิน (Asset ID)</label>
                      <div className="relative">
                        <input
                          required
                          type="text"
                          value={entry.assetId}
                          onChange={(e) => updateEntry(index, 'assetId', e.target.value)}
                          className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          placeholder="PRT-001"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {scanningIndex === index ? (
                            <Loader2 size={18} className="text-indigo-500 animate-spin" />
                          ) : (
                            <label className="cursor-pointer p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors block" title="ถ่ายภาพหรือเลือกรูปภาพเพื่อแสกนรหัส">
                              <Camera size={18} />
                              {/* Using capture="environment" will open camera on mobile, but fallback to file picker on PC */}
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                                onChange={(e) => handleImageScan(e, index)}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">รุ่น (Model)</label>
                      <input
                        required
                        type="text"
                        value={entry.model}
                        onChange={(e) => updateEntry(index, 'model', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        placeholder="Model name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ยี่ห้อ (Brand)</label>
                      <select
                        value={entry.brand}
                        onChange={(e) => updateEntry(index, 'brand', e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                      >
                        {PRINTER_BRANDS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ประเภท (Type)</label>
                      <select
                        value={entry.type}
                        onChange={(e) => updateEntry(index, 'type', e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                      >
                        {PRINTER_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">โหมดสี</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateEntry(index, 'colorMode', 'Monochrome')}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                            entry.colorMode === 'Monochrome' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-white bg-white text-slate-400'
                          }`}
                        >
                          ขาว-ดำ
                        </button>
                        <button
                          type="button"
                          onClick={() => updateEntry(index, 'colorMode', 'Color')}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                            entry.colorMode === 'Color' ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-white bg-white text-slate-400'
                          }`}
                        >
                          สี
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleAddEntry}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Plus size={20} />
                เพิ่มรายการเครื่องพิมพ์อีก
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white py-4 border-t border-slate-50">
              <button
                onClick={onClose}
                type="button"
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                ยกเลิก
              </button>
              <button
                disabled={loading}
                type="submit"
                className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={20} />
                    <span>บันทึก {entries.length > 1 ? `${entries.length} รายการ` : 'ข้อมูล'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* OCR Review Popup */}
      <AnimatePresence>
        {showOcrReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4 text-indigo-600">
                <Camera size={24} />
                <h3 className="text-lg font-bold text-slate-900">ตรวจสอบรหัสที่แสกนได้</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                กรุณาตรวจสอบและแก้ไขรหัสให้ถูกต้องก่อนกดยืนยัน
              </p>
              <input
                type="text"
                autoFocus
                value={ocrResult}
                onChange={(e) => setOcrResult(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all text-lg font-bold text-center tracking-widest text-slate-800 mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowOcrReview(false);
                    setOcrResult('');
                    setActiveOcrIndex(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmOcrResult}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  ยืนยัน
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
