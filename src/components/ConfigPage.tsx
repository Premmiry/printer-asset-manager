import React, { useState, useEffect, useRef } from 'react';
import { Department, Company, UserProfile, PrinterTypeConfig, PrinterBrandConfig, TypePrinterConfig } from '../types';
import { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from '../firebase';
import { Plus, Trash2, Settings, ChevronLeft, Building2, Upload, FileSpreadsheet, Loader2, Users, Check, X, Printer, Tag, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

interface ConfigPageProps {
  onBack: () => void;
  userProfile: UserProfile | null;
}

export const ConfigPage: React.FC<ConfigPageProps> = ({ onBack, userProfile }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [printerTypes, setPrinterTypes] = useState<PrinterTypeConfig[]>([]);
  const [printerBrands, setPrinterBrands] = useState<PrinterBrandConfig[]>([]);
  const [typePrinters, setTypePrinters] = useState<TypePrinterConfig[]>([]);
  
  // Department form
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCompany, setNewDeptCompany] = useState('');
  
  // Company form
  const [newCompanyCode, setNewCompanyCode] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');

  // Printer Type & Brand form
  const [newPrinterType, setNewPrinterType] = useState('');
  const [newPrinterBrand, setNewPrinterBrand] = useState('');
  const [newTypePrinter, setNewTypePrinter] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importCompanyCode, setImportCompanyCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deptSearch, setDeptSearch] = useState('');

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [editingBrandName, setEditingBrandName] = useState('');
  const [editingTypePrinterId, setEditingTypePrinterId] = useState<string | null>(null);
  const [editingTypePrinterName, setEditingTypePrinterName] = useState('');

  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    if (!userProfile) return;

    // Load Companies
    const qCompanies = query(collection(db, 'companies'), orderBy('code', 'asc'));
    const unsubCompanies = onSnapshot(qCompanies, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Company[];
      setCompanies(data);
      const activeCompanies = data.filter(c => c.isActive !== false);
      if (activeCompanies.length > 0 && !newDeptCompany) {
        setNewDeptCompany(activeCompanies[0].code);
      }
      if (activeCompanies.length > 0 && !importCompanyCode) {
        setImportCompanyCode(activeCompanies[0].code);
      }
    });

    // Load Departments based on role
    const qDepts = query(collection(db, 'departments'), orderBy('code', 'asc'));
    const unsubDepts = onSnapshot(qDepts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Department[];
      if (isAdmin) {
        setDepartments(data);
      } else {
        setDepartments(data.filter(d => d.companyCode === userProfile.companyCode));
      }
    });

    // Load Users (Admin only)
    let unsubUsers = () => {};
    if (isAdmin) {
      const qUsers = query(collection(db, 'users'), orderBy('username', 'asc'));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as UserProfile[];
        setUsers(data);
      });
    }

    // Load Printer Types
    const qTypes = query(collection(db, 'printerTypes'), orderBy('name', 'asc'));
    const unsubTypes = onSnapshot(qTypes, (snapshot) => {
      setPrinterTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrinterTypeConfig[]);
    });

    // Load Printer Brands
    const qBrands = query(collection(db, 'printerBrands'), orderBy('name', 'asc'));
    const unsubBrands = onSnapshot(qBrands, (snapshot) => {
      setPrinterBrands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PrinterBrandConfig[]);
    });

    // Load Type Printers
    const qTypePrinters = query(collection(db, 'typeprinters'), orderBy('id', 'asc'));
    const unsubTypePrinters = onSnapshot(qTypePrinters, (snapshot) => {
      setTypePrinters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TypePrinterConfig[]);
    });

    return () => {
      unsubCompanies();
      unsubDepts();
      unsubUsers();
      unsubTypes();
      unsubBrands();
      unsubTypePrinters();
    };
  }, [userProfile, isAdmin]);

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
    } catch (err) {
      console.error('Error toggling user role:', err);
      alert('ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้งานได้');
    }
  };

  // Filter departments by selected company and search query
  const filteredDepartments = departments.filter(d => {
    const companyMatch = !newDeptCompany || d.companyCode === newDeptCompany;
    const q = deptSearch.trim().toLowerCase();
    const searchMatch = !q || d.thaiName.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
    return companyMatch && searchMatch;
  });

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptCode || !newDeptName || !newDeptCompany) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'departments'), {
        code: newDeptCode,
        thaiName: newDeptName,
        companyCode: newDeptCompany,
        createdAt: Date.now(),
      });
      setNewDeptCode('');
      setNewDeptName('');
    } catch (err) {
      console.error('Error adding department:', err);
      alert('ไม่สามารถเพิ่มแผนกได้');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartmentName = async (deptId: string) => {
    if (!editingDeptName.trim()) return;
    try {
      await updateDoc(doc(db, 'departments', deptId), { thaiName: editingDeptName.trim() });
      setEditingDeptId(null);
      setEditingDeptName('');
    } catch (err) {
      console.error('Error updating department name:', err);
      alert('ไม่สามารถแก้ไขชื่อแผนกได้');
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyCode || !newCompanyName) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'companies'), {
        code: newCompanyCode,
        name: newCompanyName,
        isActive: true,
        createdAt: Date.now(),
      });
      setNewCompanyCode('');
      setNewCompanyName('');
    } catch (err) {
      console.error('Error adding company:', err);
      alert('ไม่สามารถเพิ่มบริษัทได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrinterType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterType.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'printerTypes'), {
        name: newPrinterType.trim(),
        createdAt: Date.now(),
      });
      setNewPrinterType('');
    } catch (err) {
      console.error('Error adding printer type:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrinterBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrinterBrand.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'printerBrands'), {
        name: newPrinterBrand.trim(),
        createdAt: Date.now(),
      });
      setNewPrinterBrand('');
    } catch (err) {
      console.error('Error adding printer brand:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTypePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypePrinter.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'typeprinters'), {
        id: String(Date.now()),
        name: newTypePrinter.trim(),
        createdAt: Date.now(),
      });
      setNewTypePrinter('');
    } catch (err) {
      console.error('Error adding typeprinter:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompanyStatus = async (id: string, currentStatus: boolean | undefined) => {
    try {
      await updateDoc(doc(db, 'companies', id), {
        isActive: currentStatus === undefined ? false : !currentStatus
      });
    } catch (err) {
      console.error('Error toggling company status:', err);
      alert('ไม่สามารถเปลี่ยนสถานะบริษัทได้');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importCompanyCode) {
      alert('กรุณาเลือกบริษัทที่จะนำเข้าข้อมูลแผนกก่อน');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
          companyCode: importCompanyCode,
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

  const handleClearAllDepartments = async () => {
    if (window.confirm('คำเตือน: คุณต้องการลบข้อมูล "แผนกทั้งหมด" ใช่หรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้!')) {
      if (window.confirm('ยืนยันอีกครั้ง: ลบข้อมูลแผนกทั้งหมดจริงๆ ใช่ไหม?')) {
        setLoading(true);
        try {
          const promises = departments.map(dept => deleteDoc(doc(db, 'departments', dept.id)));
          await Promise.all(promises);
          alert('ลบข้อมูลแผนกทั้งหมดเรียบร้อยแล้ว');
        } catch (err) {
          console.error('Error clearing departments:', err);
          alert('เกิดข้อผิดพลาดในการลบข้อมูลแผนกทั้งหมด');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleUpdatePrinterTypeName = async (typeId: string) => {
    if (!editingTypeName.trim()) return;
    try {
      await updateDoc(doc(db, 'printerTypes', typeId), { name: editingTypeName.trim() });
      setEditingTypeId(null);
      setEditingTypeName('');
    } catch (err) {
      console.error('Error updating type name:', err);
      alert('ไม่สามารถแก้ไขชื่อประเภทได้');
    }
  };

  const handleUpdatePrinterBrandName = async (brandId: string) => {
    if (!editingBrandName.trim()) return;
    try {
      await updateDoc(doc(db, 'printerBrands', brandId), { name: editingBrandName.trim() });
      setEditingBrandId(null);
      setEditingBrandName('');
    } catch (err) {
      console.error('Error updating brand name:', err);
      alert('ไม่สามารถแก้ไขชื่อยี่ห้อได้');
    }
  };

  const handleUpdateTypePrinterName = async (typePrinterId: string) => {
    if (!editingTypePrinterName.trim()) return;
    try {
      await updateDoc(doc(db, 'typeprinters', typePrinterId), { name: editingTypePrinterName.trim() });
      setEditingTypePrinterId(null);
      setEditingTypePrinterName('');
    } catch (err) {
      console.error('Error updating typeprinter name:', err);
      alert('ไม่สามารถแก้ไขชื่อประเภทเครื่องพิมพ์ได้');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4 sticky top-0 z-40">
        <div className="max-w-3xl md:max-w-5xl mx-auto flex items-center gap-4">
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

      <main className="max-w-3xl md:max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Admin Only: Company Management */}
        {isAdmin && (
          <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600" />
                จัดการบริษัท (Companies)
              </h2>
            </div>
            
            <form onSubmit={handleAddCompany} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
              <input
                required
                type="text"
                placeholder="รหัสบริษัท (Code)"
                value={newCompanyCode}
                onChange={(e) => setNewCompanyCode(e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  placeholder="ชื่อบริษัท"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
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
              {companies.map((comp) => (
                <div key={comp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                  <div className="flex items-center">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-2">
                      {comp.code}
                    </span>
                    <span className={`font-medium mr-3 ${comp.isActive !== false ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                      {comp.name}
                    </span>
                    {comp.isActive !== false ? (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} /> เปิดใช้งาน
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <X size={10} /> ปิดใช้งาน
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => handleToggleCompanyStatus(comp.id, comp.isActive)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        comp.isActive !== false 
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {comp.isActive !== false ? 'ปิดการแสดงผล' : 'เปิดการแสดงผล'}
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm('ยืนยันการลบบริษัทนี้?')) {
                          await deleteDoc(doc(db, 'companies', comp.id));
                        }
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                      title="ลบบริษัท"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm italic">ยังไม่มีข้อมูลบริษัท</p>
              )}
            </div>
          </section>
        )}

        {/* Department Management */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={20} className="text-indigo-600" />
              จัดการแผนก (Departments)
            </h2>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <input
                type="text"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="ค้นหาชื่อ/รหัสแผนก"
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {isAdmin && departments.length > 0 && (
                <button
                  onClick={handleClearAllDepartments}
                  disabled={loading}
                  className="px-3 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all disabled:opacity-50"
                  title="ลบข้อมูลแผนกทั้งหมด"
                >
                  ล้างข้อมูลแผนก
                </button>
              )}
              <select
                value={importCompanyCode}
                onChange={(e) => setImportCompanyCode(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">เลือกบริษัทก่อนนำเข้า...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
              </select>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <button
                disabled={uploading || !importCompanyCode}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
                title={!importCompanyCode ? "กรุณาเลือกบริษัทก่อนนำเข้าข้อมูล" : ""}
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                นำเข้า Excel
              </button>
            </div>
          </div>
          
          <form onSubmit={handleAddDepartment} className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="relative">
              <select
                required
                value={newDeptCompany}
                onChange={(e) => setNewDeptCompany(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white"
              >
                <option value="" disabled>เลือกบริษัท...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.code}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <input
              required
              type="text"
              placeholder="รหัสแผนก (Code)"
              value={newDeptCode}
              onChange={(e) => setNewDeptCode(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <div className="flex gap-2">
              <input
                required
                type="text"
                placeholder="ชื่อแผนก (Thai Name)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
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

          <div className="space-y-2 sm:space-y-3 max-h-64 md:max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {filteredDepartments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl group transition-colors border border-slate-100/50">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {dept.companyCode}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">
                          {dept.code}
                        </span>
                      </div>
                      {editingDeptId === dept.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingDeptName}
                            onChange={(e) => setEditingDeptName(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <button
                            onClick={() => handleUpdateDepartmentName(dept.id)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                            title="บันทึกชื่อแผนก"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => { setEditingDeptId(null); setEditingDeptName(''); }}
                            className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                            title="ยกเลิก"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700 text-sm">{dept.thaiName}</span>
                      )}
                    </div>
                  </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  {editingDeptId === dept.id ? null : (
                    <button
                      onClick={() => { setEditingDeptId(dept.id); setEditingDeptName(dept.thaiName); }}
                      className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl"
                      title="แก้ไขชื่อแผนก"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(dept.id)}
                    className="p-2 text-rose-500 hover:bg-rose-100 hover:text-rose-600 rounded-xl transition-all shadow-sm"
                    title="ลบแผนก"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {filteredDepartments.length === 0 && !uploading && (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Building2 size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">ยังไม่มีข้อมูลแผนกสำหรับบริษัทที่เลือก</p>
                <p className="text-slate-400 text-sm mt-1">เพิ่มแผนกใหม่ด้านบน หรือนำเข้าจากไฟล์ Excel</p>
              </div>
            )}
          </div>
        </section>
        {/* Admin Only: Printer Types and Brands Management */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Printer Types */}
            <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Printer size={20} className="text-indigo-600" />
                  จัดการประเภท (Types)
                </h2>
                {printerTypes.length === 0 && (
                  <button
                    onClick={async () => {
                      const defaults = ['Laser', 'Inkjet', 'Dot Matrix', 'Thermal', 'Multifunction'];
                      setLoading(true);
                      try {
                        await Promise.all(defaults.map(name => addDoc(collection(db, 'printerTypes'), { name, createdAt: Date.now() })));
                      } finally { setLoading(false); }
                    }}
                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                  >
                    โหลดข้อมูลเริ่มต้น
                  </button>
                )}
              </div>
              
              <form onSubmit={handleAddPrinterType} className="flex flex-col sm:flex-row gap-2 mb-6">
                <input
                  required
                  type="text"
                  placeholder="เพิ่มประเภทใหม่"
                  value={newPrinterType}
                  onChange={(e) => setNewPrinterType(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  disabled={loading}
                  type="submit"
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Plus size={24} />
                </button>
              </form>

              <div className="space-y-3 max-h-64 md:max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {printerTypes.map((type) => (
                  <div key={type.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group">
                    {editingTypeId === type.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingTypeName}
                          onChange={(e) => setEditingTypeName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button onClick={() => handleUpdatePrinterTypeName(type.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Check size={16} /></button>
                        <button onClick={() => { setEditingTypeId(null); setEditingTypeName(''); }} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-700 ml-2">{type.name}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => { setEditingTypeId(type.id); setEditingTypeName(type.name); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg" title="แก้ไขชื่อประเภท"><Pencil size={16} /></button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`ยืนยันการลบประเภท "${type.name}"?`)) {
                                await deleteDoc(doc(db, 'printerTypes', type.id));
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                            title="ลบประเภท"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {printerTypes.length === 0 && (
                  <p className="text-center py-4 text-slate-400 text-sm italic">ยังไม่มีข้อมูลประเภท</p>
                )}
              </div>
            </section>

            {/* Printer Brands */}
            <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Tag size={20} className="text-indigo-600" />
                  จัดการยี่ห้อ (Brands)
                </h2>
                {printerBrands.length === 0 && (
                  <button
                    onClick={async () => {
                      const defaults = ['Epson', 'Canon', 'Brother', 'HP', 'Samsung', 'Pantum', 'Ricoh', 'Oki', 'Toshiba', 'Label / Barcode Printer'];
                      setLoading(true);
                      try {
                        await Promise.all(defaults.map(name => addDoc(collection(db, 'printerBrands'), { name, createdAt: Date.now() })));
                      } finally { setLoading(false); }
                    }}
                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                  >
                    โหลดข้อมูลเริ่มต้น
                  </button>
                )}
              </div>
              
              <form onSubmit={handleAddPrinterBrand} className="flex flex-col sm:flex-row gap-2 mb-6">
                <input
                  required
                  type="text"
                  placeholder="เพิ่มยี่ห้อใหม่"
                  value={newPrinterBrand}
                  onChange={(e) => setNewPrinterBrand(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                <button
                  disabled={loading}
                  type="submit"
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Plus size={24} />
                </button>
              </form>

              <div className="space-y-3 max-h-64 md:max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {printerBrands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group">
                    {editingBrandId === brand.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingBrandName}
                          onChange={(e) => setEditingBrandName(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button onClick={() => handleUpdatePrinterBrandName(brand.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Check size={16} /></button>
                        <button onClick={() => { setEditingBrandId(null); setEditingBrandName(''); }} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-700 ml-2">{brand.name}</span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => { setEditingBrandId(brand.id); setEditingBrandName(brand.name); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg" title="แก้ไขชื่อยี่ห้อ"><Pencil size={16} /></button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`ยืนยันการลบยี่ห้อ "${brand.name}"?`)) {
                                await deleteDoc(doc(db, 'printerBrands', brand.id));
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                            title="ลบยี่ห้อ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {printerBrands.length === 0 && (
                  <p className="text-center py-4 text-slate-400 text-sm italic">ยังไม่มีข้อมูลยี่ห้อ</p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* Admin Only: TypePrinters Management */}
        {isAdmin && (
          <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer size={20} className="text-indigo-600" />
                จัดการประเภทเครื่องพิมพ์ (TypePrinters)
              </h2>
              {typePrinters.length === 0 && (
                <span className="text-xs bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg">ยังไม่มีข้อมูล</span>
              )}
            </div>
            <form onSubmit={handleAddTypePrinter} className="flex flex-col sm:flex-row gap-2 mb-6">
              <input
                required
                type="text"
                placeholder="เพิ่มประเภทเครื่องพิมพ์ใหม่"
                value={newTypePrinter}
                onChange={(e) => setNewTypePrinter(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <button
                disabled={loading}
                type="submit"
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Plus size={24} />
              </button>
            </form>
            <div className="space-y-3 max-h-64 md:max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {typePrinters.map((tp) => (
                <div key={tp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group">
                  {editingTypePrinterId === tp.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingTypePrinterName}
                        onChange={(e) => setEditingTypePrinterName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button onClick={() => handleUpdateTypePrinterName(tp.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><Check size={16} /></button>
                      <button onClick={() => { setEditingTypePrinterId(null); setEditingTypePrinterName(''); }} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-slate-700 ml-2">{tp.name}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setEditingTypePrinterId(tp.id); setEditingTypePrinterName(tp.name); }} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg" title="แก้ไขชื่อ"><Pencil size={16} /></button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`ยืนยันการลบ "${tp.name}"?`)) {
                              await deleteDoc(doc(db, 'typeprinters', tp.id));
                            }
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {typePrinters.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm italic">ยังไม่มีข้อมูลประเภทเครื่องพิมพ์</p>
              )}
            </div>
          </section>
        )}

        {/* Admin Only: User Management */}
        {isAdmin && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" />
                จัดการผู้ใช้งาน (Users)
              </h2>
            </div>
            
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                  <div>
                    <span className="font-medium text-slate-700 mr-2">{u.username}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 ${
                      u.role === 'admin' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {u.role}
                    </span>
                    {u.role !== 'admin' && (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {u.companyCode}
                      </span>
                    )}
                  </div>
                  {/* Allow promoting/demoting other users, but don't allow changing own role or the main 'prem' account */}
                  {u.uid !== userProfile?.uid && u.username.toLowerCase() !== 'prem' && (
                    <button
                      onClick={() => handleToggleUserRole(u.uid, u.role)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors opacity-0 group-hover:opacity-100 ${
                        u.role === 'admin' 
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {u.role === 'admin' ? 'ลดสิทธิ์เป็น User' : 'เลื่อนเป็น Admin'}
                    </button>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center py-8 text-slate-400 text-sm italic">ยังไม่มีข้อมูลผู้ใช้งาน</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
