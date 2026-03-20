import React, { useState } from 'react';
import { Printer, Department } from '../types';
import { Edit2, Trash2, Printer as PrinterIcon, Tag, Layers, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, deleteDoc, doc } from '../firebase';

interface PrinterListProps {
  printers: Printer[];
  departments: Department[];
  onEdit: (printer: Printer) => void;
}

export const PrinterList: React.FC<PrinterListProps> = ({ printers, departments, onEdit }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(printers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPrinters = printers.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?')) {
      try {
        await deleteDoc(doc(db, 'printers', id));
      } catch (err) {
        console.error('Error deleting printer:', err);
        alert('ไม่สามารถลบข้อมูลได้ กรุณาตรวจสอบสิทธิ์ของคุณ');
      }
    }
  };

  if (printers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <div className="p-4 bg-slate-50 rounded-full mb-4">
          <PrinterIcon size={48} strokeWidth={1.5} />
        </div>
        <p className="text-lg font-medium">ยังไม่มีข้อมูลเครื่องพิมพ์</p>
        <p className="text-sm">กดปุ่ม + เพื่อเพิ่มข้อมูลใหม่</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="grid gap-3">
        <AnimatePresence mode="popLayout">
          {currentPrinters.map((printer, index) => (
            <motion.div
              key={printer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-100 transition-all relative group flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className={`p-3 rounded-xl flex-shrink-0 ${printer.colorMode === 'Color' ? 'bg-gradient-to-tr from-rose-50 to-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500'}`}>
                <PrinterIcon size={24} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {printer.brand}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(printer.createdAt).toLocaleDateString('th-TH')}
                  </span>
                  {printer.colorMode === 'Color' && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-500 to-indigo-500 text-white">
                      Color
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-800 truncate mb-2">
                  {printer.model}
                </h3>
                
                <div className="flex flex-wrap gap-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Building2 size={12} className="text-slate-400" />
                    <span className="truncate max-w-[150px]">{departments.find(d => d.code === printer.departmentCode)?.thaiName || printer.departmentCode}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                    <Tag size={12} className="text-indigo-400" />
                    <span>{printer.assetId}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Layers size={12} className="text-slate-400" />
                    <span>{printer.type}</span>
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 mt-2 sm:mt-0 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(printer)}
                  className="flex-1 sm:flex-none flex items-center justify-center p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors"
                  title="แก้ไข"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(printer.id)}
                  className="flex-1 sm:flex-none flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors"
                  title="ลบ"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6 pb-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">หน้า {currentPage}</span>
            <span className="text-sm font-medium text-slate-400">จาก {totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
