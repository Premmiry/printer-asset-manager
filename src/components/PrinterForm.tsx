import React, { useState, useEffect } from 'react';
import { Printer, PrinterBrand, PrinterType, ColorMode, Department, UserProfile, PrinterTypeConfig, PrinterBrandConfig, TypePrinterConfig } from '../types';
import { db, auth, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, where, setDoc } from '../firebase';
import { X, Save, Printer as PrinterIcon, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  typeprinterId: string;
  purchaseYear2Digit: string;
}

export const PrinterForm: React.FC<PrinterFormProps> = ({ printer, userProfile, onClose }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [mainDepartmentCode, setMainDepartmentCode] = useState<string>(printer?.departmentCode || '');
  const [entries, setEntries] = useState<PrinterEntry[]>([
    {
      assetId: printer?.assetId || '',
      model: printer?.model || '',
      brand: printer?.brand || '',
      type: printer?.type || '',
      colorMode: printer?.colorMode || 'Monochrome',
      typeprinterId: (printer as any)?.typeprinterId || '',
      purchaseYear2Digit: (printer as any)?.purchaseYear2Digit || '',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [existingPrinters, setExistingPrinters] = useState<Printer[]>([]);
  const [printerTypes, setPrinterTypes] = useState<PrinterTypeConfig[]>([]);
  const [printerBrands, setPrinterBrands] = useState<PrinterBrandConfig[]>([]);
  const [typePrinters, setTypePrinters] = useState<TypePrinterConfig[]>([]);
  const [seedingTypePrinters, setSeedingTypePrinters] = useState(false);

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

  useEffect(() => {
    const qTypes = query(collection(db, 'printerTypes'), orderBy('name', 'asc'));
    const unsubTypes = onSnapshot(qTypes, (snapshot) => {
      setPrinterTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrinterTypeConfig[]);
    });

    const qBrands = query(collection(db, 'printerBrands'), orderBy('name', 'asc'));
    const unsubBrands = onSnapshot(qBrands, (snapshot) => {
      setPrinterBrands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrinterBrandConfig[]);
    });

    const qTypePrinters = query(collection(db, 'typeprinters'), orderBy('id', 'asc'));
    const unsubTypePrinters = onSnapshot(qTypePrinters, (snapshot) => {
      setTypePrinters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TypePrinterConfig[]);
    });

    return () => {
      unsubTypes();
      unsubBrands();
      unsubTypePrinters();
    };
  }, []);

  const seedTypePrinters = async () => {
    if (!auth.currentUser) return;
    try {
      setSeedingTypePrinters(true);
      const defaults = [
        { id: '1', name: 'เครื่องบริษัท' },
        { id: '2', name: 'เครื่องเช่า' }
      ];
      await Promise.all(defaults.map(item => setDoc(doc(db, 'typeprinters', item.id), { id: item.id, name: item.name, createdAt: Date.now() })));
    } finally {
      setSeedingTypePrinters(false);
    }
  };

  const handleAddEntry = () => {
    setEntries([...entries, {
      assetId: '',
      model: entries[entries.length - 1].model, // Copy last model for convenience
      brand: entries[entries.length - 1].brand,
      type: entries[entries.length - 1].type,
      colorMode: entries[entries.length - 1].colorMode,
      typeprinterId: entries[entries.length - 1].typeprinterId,
      purchaseYear2Digit: entries[entries.length - 1].purchaseYear2Digit,
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
  const getAgeFromTwoDigit = (twoDigit: string) => {
    if (!twoDigit) return '';
    const currentYearBE = new Date().getFullYear() + 543;
    const purchaseYearFull = parseInt(`25${twoDigit}`);
    if (isNaN(purchaseYearFull)) return '';
    const age = Math.max(0, currentYearBE - purchaseYearFull);
    return String(age);
  };
  const validateForm = () => {
    if (!mainDepartmentCode) return 'กรุณาเลือกแผนก';
    for (const e of entries) {
      if (!e.assetId || !e.assetId.trim()) return 'กรุณากรอก Asset ID';
      if (!e.model || !e.model.trim()) return 'กรุณากรอก รุ่น';
      if (!e.brand) return 'กรุณาเลือกยี่ห้อ';
      if (!e.type) return 'กรุณาเลือกประเภท';
      if (!e.typeprinterId) return 'กรุณาเลือกประเภทเครื่องพิมพ์';
      if (e.purchaseYear2Digit) {
        const n2 = Number(e.purchaseYear2Digit);
        if (!Number.isInteger(n2) || n2 < 0 || n2 > 99) return 'ปีซื้อไม่ถูกต้อง (ต้องเป็นตัวเลข 00-99)';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setLoading(false);
        return;
      }
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
                      <input
                        required
                        type="text"
                        value={entry.assetId}
                        onChange={(e) => updateEntry(index, 'assetId', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        placeholder="PRT-001"
                      />
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
                        onChange={(e) => updateEntry(index, 'brand', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                      >
                        <option value="" disabled>เลือกยี่ห้อ...</option>
                        {printerBrands.map((b) => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ประเภท (Type)</label>
                      <select
                        value={entry.type}
                        onChange={(e) => updateEntry(index, 'type', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                      >
                        <option value="" disabled>เลือกประเภท...</option>
                        {printerTypes.map((t) => (
                          <option key={t.id} value={t.name}>{t.name}</option>
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
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ประเภทเครื่องพิมพ์</label>
                      <select
                        required
                        value={entry.typeprinterId}
                        onChange={(e) => updateEntry(index, 'typeprinterId', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none"
                      >
                        <option value="" disabled>เลือกประเภทเครื่องพิมพ์...</option>
                        {typePrinters.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {typePrinters.length === 0 && (
                        <div className="mt-2 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl p-2">
                          <span className="text-[11px] font-bold text-amber-700">ยังไม่มีข้อมูลประเภทเครื่องพิมพ์</span>
                          <button
                            type="button"
                            onClick={seedTypePrinters}
                            disabled={seedingTypePrinters}
                            className="text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-200 disabled:opacity-50 font-bold"
                          >
                            {seedingTypePrinters ? 'กำลังโหลด...' : 'โหลดข้อมูลเริ่มต้น'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ปีซื้อ (2 หลัก)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={entry.purchaseYear2Digit}
                          onChange={(e) => updateEntry(index, 'purchaseYear2Digit', e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          placeholder="65"
                        />
                        <span className="text-xs font-bold px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 whitespace-nowrap">
                          อายุการใช้งาน : {getAgeFromTwoDigit(entry.purchaseYear2Digit) || '-'} ปี
                        </span>
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

            {printer && (
              <div className="flex flex-col items-center justify-center gap-1 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                  <span>บันทึกโดย: <span className="text-slate-700 font-bold">{printer.createdByName || 'ไม่ระบุ'}</span></span>
                  {printer.createdAt && (
                    <span className="text-slate-400">({new Date(printer.createdAt).toLocaleString('th-TH')})</span>
                  )}
                </div>
                {printer.updatedByName && (
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                    <span>แก้ไขล่าสุดโดย: <span className="text-slate-700 font-bold">{printer.updatedByName}</span></span>
                    {printer.updatedAt && (
                      <span className="text-slate-400">({new Date(printer.updatedAt).toLocaleString('th-TH')})</span>
                    )}
                  </div>
                )}
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
    </motion.div>
  );
};
