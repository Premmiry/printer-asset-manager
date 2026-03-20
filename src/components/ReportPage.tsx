import React, { useState, useMemo } from 'react';
import { Printer, Department } from '../types';
import { FileText, Download, Search, Building2, Printer as PrinterIcon, ChevronDown, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface ReportPageProps {
  printers: Printer[];
  departments: Department[];
}

export const ReportPage: React.FC<ReportPageProps> = ({ printers, departments }) => {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');

  const filteredDepts = departments.filter(d => 
    d.thaiName.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const selectedDeptName = selectedDept === 'all' 
    ? 'ดูรายงานทุกแผนก' 
    : departments.find(d => d.code === selectedDept)?.thaiName || 'ไม่ทราบชื่อแผนก';

  const reportData = useMemo(() => {
    return departments.map(dept => {
      const deptPrinters = printers.filter(p => p.departmentCode === dept.code);
      return {
        ...dept,
        printers: deptPrinters,
        total: deptPrinters.length,
        colorCount: deptPrinters.filter(p => p.colorMode === 'Color').length,
        monoCount: deptPrinters.filter(p => p.colorMode === 'Monochrome').length
      };
    }).filter(d => 
      selectedDept === 'all' || d.code === selectedDept
    ).sort((a, b) => b.total - a.total);
  }, [printers, departments, selectedDept]);

  const exportToExcel = () => {
    const data = printers.map(p => {
      const dept = departments.find(d => d.code === p.departmentCode);
      return {
        'รหัสทรัพย์สิน': p.assetId,
        'รุ่น': p.model,
        'ยี่ห้อ': p.brand,
        'ประเภท': p.type,
        'โหมดสี': p.colorMode === 'Color' ? 'สี' : 'ขาว-ดำ',
        'แผนก': dept?.thaiName || 'ไม่ระบุ',
        'วันที่บันทึก': new Date(p.createdAt).toLocaleString('th-TH')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Printer Assets');
    XLSX.writeFile(workbook, `Printer_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">รายงานสรุป</h2>
          <p className="text-slate-500 text-sm">สรุปจำนวนเครื่องพิมพ์แยกตามแผนก</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Download size={20} />
          <span>ส่งออก Excel</span>
        </button>
      </div>

      <div className="relative z-20">
        <button
          onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold text-slate-700 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <span className="truncate">{selectedDeptName}</span>
          </div>
          <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isDeptDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDeptDropdownOpen(false)} 
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-20 overflow-hidden"
              >
                <div className="p-2 border-b border-slate-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      autoFocus
                      type="text"
                      placeholder="พิมพ์ชื่อแผนก..."
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {deptSearch && (
                      <button 
                        onClick={() => setDeptSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <CloseIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                  <button
                    onClick={() => {
                      setSelectedDept('all');
                      setIsDeptDropdownOpen(false);
                      setDeptSearch('');
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      selectedDept === 'all' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    ดูรายงานทุกแผนก
                  </button>
                  {filteredDepts.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setSelectedDept(dept.code);
                        setIsDeptDropdownOpen(false);
                        setDeptSearch('');
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                        selectedDept === dept.code ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {dept.thaiName}
                    </button>
                  ))}
                  {filteredDepts.length === 0 && (
                    <p className="text-center py-4 text-xs text-slate-400 italic">ไม่พบแผนกที่ค้นหา</p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reportData.map((dept, idx) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-lg transition-shadow overflow-hidden"
          >
            <div className="p-6 bg-gradient-to-br from-white to-slate-50/50">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                    <Building2 size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg sm:text-xl">{dept.thaiName}</h3>
                    
                  </div>
                </div>
                <div className="text-right bg-indigo-600 px-4 py-2 rounded-2xl shadow-sm">
                  <div className="text-2xl sm:text-3xl font-black text-white leading-none">{dept.total}</div>
                  <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mt-1">ทั้งหมด</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ขาว-ดำ</div>
                    <div className="text-2xl font-black text-slate-700">{dept.monoCount}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-slate-800" />
                  </div>
                </div>
                <div className="p-4 bg-white border border-rose-50 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">พิมพ์สี</div>
                    <div className="text-2xl font-black text-rose-600">{dept.colorCount}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500" />
                  </div>
                </div>
              </div>

              {dept.printers.length > 0 && (
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <PrinterIcon size={12} />
                    รายการเครื่องพิมพ์
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {dept.printers.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition-colors rounded-xl border border-slate-100 shadow-sm group">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.colorMode === 'Color' ? 'bg-gradient-to-tr from-rose-500 to-indigo-500' : 'bg-slate-400'}`} />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">{p.assetId}</div>
                            <div className="text-[11px] text-slate-500 font-medium truncate">{p.brand} <span className="text-slate-400">{p.model}</span></div>
                          </div>
                        </div>
                        <div className="text-[10px] px-2 py-1 rounded-md bg-slate-100 text-slate-500 font-medium whitespace-nowrap ml-2">
                          {p.type}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {reportData.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText size={40} />
            </div>
            <h3 className="text-lg font-bold text-slate-400">ไม่พบข้อมูลรายงาน</h3>
          </div>
        )}
      </div>
    </div>
  );
};
