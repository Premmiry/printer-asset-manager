import React, { useState, useEffect } from 'react';
import { Printer, PrinterBrand, PrinterType, ColorMode, PRINTER_BRANDS, PRINTER_TYPES, Department } from '../types';
import { db, auth, collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from '../firebase';
import { X, Save, Printer as PrinterIcon, Plus, Trash2, Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrinterFormProps {
  printer?: Printer | null;
  onClose: () => void;
}

interface PrinterEntry {
  assetId: string;
  model: string;
  brand: PrinterBrand;
  type: PrinterType;
  colorMode: ColorMode;
  departmentCode: string;
}

export const PrinterForm: React.FC<PrinterFormProps> = ({ printer, onClose }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [entries, setEntries] = useState<PrinterEntry[]>([
    {
      assetId: printer?.assetId || '',
      model: printer?.model || '',
      brand: printer?.brand || 'Epson',
      type: printer?.type || 'Laser',
      colorMode: printer?.colorMode || 'Monochrome',
      departmentCode: printer?.departmentCode || '',
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDeptDropdownIdx, setOpenDeptDropdownIdx] = useState<number | null>(null);
  const [deptSearch, setDeptSearch] = useState('');

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
      setDepartments(data);
      
      // Set default department if not set
      if (data.length > 0 && !printer) {
        setEntries(prev => prev.map(e => ({ ...e, departmentCode: e.departmentCode || data[0].code })));
      }
    });
    return () => unsubscribe();
  }, [printer]);

  const handleAddEntry = () => {
    setEntries([...entries, {
      assetId: '',
      model: entries[entries.length - 1].model, // Copy last model for convenience
      brand: entries[entries.length - 1].brand,
      type: entries[entries.length - 1].type,
      colorMode: entries[entries.length - 1].colorMode,
      departmentCode: entries[entries.length - 1].departmentCode,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Unknown';

      if (printer) {
        // Edit mode (only 1 entry)
        await updateDoc(doc(db, 'printers', printer.id), {
          ...entries[0],
          updatedAt: Date.now(),
          updatedBy: auth.currentUser?.uid,
          updatedByName: currentUserName,
        });
      } else {
        // Multi-add mode
        const promises = entries.map(entry => 
          addDoc(collection(db, 'printers'), {
            ...entry,
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
            <div className="space-y-6">
              {entries.map((entry, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                  {!printer && entries.length > 1 && (
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
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">แผนก (Department)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenDeptDropdownIdx(openDeptDropdownIdx === index ? null : index);
                          setDeptSearch('');
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-left flex items-center justify-between"
                      >
                        <span className="truncate">
                          {departments.find(d => d.code === entry.departmentCode)?.thaiName || 'เลือกแผนก...'}
                        </span>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${openDeptDropdownIdx === index ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {openDeptDropdownIdx === index && (
                          <>
                            <div 
                              className="fixed inset-0 z-20" 
                              onClick={() => setOpenDeptDropdownIdx(null)} 
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-100 shadow-xl z-30 overflow-hidden"
                            >
                              <div className="p-2 border-b border-slate-50">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="ค้นหาแผนก..."
                                    value={deptSearch}
                                    onChange={(e) => setDeptSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto p-1">
                                {filteredDepts.map((d) => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                      updateEntry(index, 'departmentCode', d.code);
                                      setOpenDeptDropdownIdx(null);
                                      setDeptSearch('');
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                                      entry.departmentCode === d.code ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    {d.thaiName}
                                  </button>
                                ))}
                                {filteredDepts.length === 0 && (
                                  <p className="text-center py-4 text-[10px] text-slate-400 italic">ไม่พบแผนก</p>
                                )}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
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

            {!printer && (
              <button
                type="button"
                onClick={handleAddEntry}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 font-bold text-sm"
              >
                <Plus size={20} />
                เพิ่มรายการเครื่องพิมพ์อีก
              </button>
            )}

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
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
