import React, { useState, useEffect, useRef } from 'react';
import { Department } from '../types';
import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from '../firebase';
import { Plus, Trash2, Settings, ChevronLeft, Building2, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

interface ConfigPageProps {
  onBack: () => void;
}

export const ConfigPage: React.FC<ConfigPageProps> = ({ onBack }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'departments'), orderBy('code', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[];
      setDepartments(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'departments'), {
        code: newCode,
        thaiName: newName,
        createdAt: Date.now(),
      });
      setNewCode('');
      setNewName('');
    } catch (err) {
      console.error('Error adding department:', err);
      alert('ไม่สามารถเพิ่มแผนกได้');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const newDepts = data.map(row => ({
          code: String(row.code || row.Code || '').trim(),
          thaiName: String(row.ThaiName || row.thaiName || row.THAINAME || '').trim(),
          createdAt: Date.now()
        })).filter(d => d.code && d.thaiName);

        if (newDepts.length === 0) {
          alert('ไม่พบข้อมูลแผนกในไฟล์ กรุณาตรวจสอบหัวคอลัมน์ (code, ThaiName)');
          setUploading(false);
          return;
        }

        // Filter out existing codes to avoid duplicates (optional but good)
        const existingCodes = new Set(departments.map(d => d.code));
        const toAdd = newDepts.filter(d => !existingCodes.has(d.code));

        if (toAdd.length === 0) {
          alert('ข้อมูลทั้งหมดมีอยู่ในระบบแล้ว');
          setUploading(false);
          return;
        }

        const promises = toAdd.map(dept => addDoc(collection(db, 'departments'), dept));
        await Promise.all(promises);
        alert(`นำเข้าข้อมูลสำเร็จ ${toAdd.length} รายการ`);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('ยืนยันการลบแผนกนี้?')) {
      try {
        await deleteDoc(doc(db, 'departments', id));
      } catch (err) {
        console.error('Error deleting department:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
              <Settings size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">ตั้งค่าข้อมูล (Data Config)</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={20} className="text-indigo-600" />
              จัดการแผนก (Departments)
            </h2>
            
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                นำเข้า Excel
              </button>
            </div>
          </div>
          
          <form onSubmit={handleAddDepartment} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <input
              required
              type="text"
              placeholder="รหัสแผนก (Code)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <div className="flex gap-2">
              <input
                required
                type="text"
                placeholder="ชื่อแผนก (Thai Name)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <button
                disabled={loading}
                type="submit"
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Plus size={24} />
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                <div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-2">
                    {dept.code}
                  </span>
                  <span className="font-medium text-slate-700">{dept.thaiName}</span>
                </div>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {departments.length === 0 && !uploading && (
              <p className="text-center py-8 text-slate-400 text-sm italic">ยังไม่มีข้อมูลแผนก</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
