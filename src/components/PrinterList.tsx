import React from 'react';
import { Printer, Department } from '../types';
import { Edit2, Trash2, Printer as PrinterIcon, Tag, Layers, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db, deleteDoc, doc, auth } from '../firebase';

interface PrinterListProps {
  printers: Printer[];
  departments: Department[];
  onEdit: (printer: Printer) => void;
}

export const PrinterList: React.FC<PrinterListProps> = ({ printers, departments, onEdit }) => {
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
    <div className="grid gap-4 pb-24">
      {printers.map((printer, index) => (
        <motion.div
          key={printer.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group"
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${printer.colorMode === 'Color' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
              <PrinterIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {printer.brand}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {new Date(printer.createdAt).toLocaleDateString('th-TH')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 truncate mb-2">
                {printer.model}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                  <Building2 size={12} className="text-indigo-400" />
                  <span>{departments.find(d => d.code === printer.departmentCode)?.thaiName || printer.departmentCode}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                  <Tag size={12} className="text-slate-400" />
                  <span>{printer.assetId}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                  <Layers size={12} className="text-slate-400" />
                  <span>{printer.type}</span>
                </div>
                <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                  printer.colorMode === 'Color' 
                    ? 'bg-rose-50 text-rose-600' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {printer.colorMode === 'Color' ? 'Color' : 'B&W'}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(printer)}
              className="p-2.5 bg-indigo-50 sm:bg-transparent hover:bg-indigo-100 sm:hover:bg-indigo-50 text-indigo-600 rounded-xl transition-colors"
              title="แก้ไข"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => handleDelete(printer.id)}
              className="p-2.5 bg-rose-50 sm:bg-transparent hover:bg-rose-100 sm:hover:bg-rose-50 text-rose-600 rounded-xl transition-colors"
              title="ลบ"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
