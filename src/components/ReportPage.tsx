import React, { useState, useMemo } from 'react';
import { Printer, Department } from '../types';
import { FileText, Download, Search, Building2, Printer as PrinterIcon, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

interface ReportPageProps {
  printers: Printer[];
  departments: Department[];
}

export const ReportPage: React.FC<ReportPageProps> = ({ printers, departments }) => {
  const [searchQuery, setSearchQuery] = useState('');

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
      d.thaiName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.printers.some(p => p.assetId.toLowerCase().includes(searchQuery.toLowerCase()) || p.model.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => b.total - a.total);
  }, [printers, departments, searchQuery]);

  const exportToExcel = () => {
    const data = printers.map(p => {
      const dept = departments.find(d => d.code === p.departmentCode);
      return {
        'รหัสทรัพย์สิน': p.assetId,
        'รุ่น': p.model,
        'ยี่ห้อ': p.brand,
        'ประเภท': p.type,
        'โหมดสี': p.colorMode === 'Color' ? 'สี' : 'ขาว-ดำ',
        'แผนก (รหัส)': p.departmentCode,
        'แผนก (ชื่อ)': dept?.thaiName || 'ไม่ระบุ',
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

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="ค้นหาแผนก หรือรหัสทรัพย์สิน..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reportData.map((dept, idx) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{dept.thaiName}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{dept.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-indigo-600">{dept.total}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เครื่องทั้งหมด</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">ขาว-ดำ</div>
                  <div className="text-xl font-bold text-slate-700">{dept.monoCount}</div>
                </div>
                <div className="p-4 bg-rose-50 rounded-2xl">
                  <div className="text-xs font-bold text-rose-400 uppercase mb-1">สี</div>
                  <div className="text-xl font-bold text-rose-600">{dept.colorCount}</div>
                </div>
              </div>

              {dept.printers.length > 0 && (
                <div className="space-y-2 border-t border-slate-50 pt-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">รายละเอียดเครื่องพิมพ์</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dept.printers.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <PrinterIcon size={16} className={p.colorMode === 'Color' ? 'text-rose-500' : 'text-slate-400'} />
                          <div>
                            <div className="text-sm font-bold text-slate-700">{p.assetId}</div>
                            <div className="text-[10px] text-slate-500">{p.brand} {p.model}</div>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
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
