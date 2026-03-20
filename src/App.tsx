import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onSnapshot, collection, query, orderBy } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Printer, Department } from './types';
import { PrinterForm } from './components/PrinterForm';
import { PrinterList } from './components/PrinterList';
import { ConfigPage } from './components/ConfigPage';
import { ReportPage } from './components/ReportPage';
import { LogIn, LogOut, Plus, Printer as PrinterIcon, Search, User as UserIcon, Settings, ChevronDown, X as CloseIcon, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [view, setView] = useState<'list' | 'config' | 'report'>('list');

  useEffect(() => {
    // Check for redirect result when component mounts
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect login error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setPrinters([]);
      return;
    }

    const q = query(collection(db, 'printers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const printerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Printer[];
      setPrinters(printerData);
    });

    // Fetch departments for search mapping
    const qDept = query(collection(db, 'departments'), orderBy('code', 'asc'));
    const unsubscribeDept = onSnapshot(qDept, (snapshot) => {
      const deptData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[];
      setDepartments(deptData);
    });

    return () => {
      unsubscribe();
      unsubscribeDept();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      // Check if user is on a mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Use redirect for mobile devices to avoid popup blockers
        await signInWithRedirect(auth, googleProvider);
      } else {
        // Use popup for desktop
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const filteredPrinters = printers.filter(p => {
    const dept = departments.find(d => d.code === p.departmentCode);
    const deptName = dept ? dept.thaiName.toLowerCase() : '';
    const queryStr = searchQuery.toLowerCase();
    
    const matchesSearch = p.assetId.toLowerCase().includes(queryStr) ||
      p.model.toLowerCase().includes(queryStr) ||
      p.brand.toLowerCase().includes(queryStr) ||
      p.departmentCode.toLowerCase().includes(queryStr) ||
      deptName.includes(queryStr);

    const matchesDept = selectedDept === 'all' || p.departmentCode === selectedDept;

    return matchesSearch && matchesDept;
  });

  const filteredDepts = departments.filter(d => 
    d.thaiName.toLowerCase().includes(deptSearch.toLowerCase()) ||
    d.code.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const selectedDeptName = selectedDept === 'all' 
    ? 'ทุกแผนก' 
    : departments.find(d => d.code === selectedDept)?.thaiName || 'ทุกแผนก';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl shadow-indigo-100 text-center"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <PrinterIcon size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Printer Asset</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            ระบบจัดการข้อมูลเครื่องพิมพ์สำหรับองค์กร<br />
            เข้าสู่ระบบเพื่อเริ่มใช้งาน
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <LogIn size={20} />
            <span>เข้าสู่ระบบด้วย Google</span>
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === 'config') {
    // We'll handle this inside the main layout now to keep the header
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
              <PrinterIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">PRINTER</h1>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Asset Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              <UserIcon size={14} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-700 max-w-[80px] truncate">
                {user.displayName?.split(' ')[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-rose-50 text-rose-500 rounded-full transition-colors"
              title="ออกจากระบบ"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-100/50 mb-8">
          <button
            onClick={() => setView('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              view === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <PrinterIcon size={16} />
            <span>เครื่องพิมพ์</span>
          </button>
          <button
            onClick={() => setView('report')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              view === 'report' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText size={16} />
            <span>รายงาน</span>
          </button>
          <button
            onClick={() => setView('config')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              view === 'config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings size={16} />
            <span>ตั้งค่า</span>
          </button>
        </div>

        {view === 'list' ? (
          <>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="ค้นหา..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                />
              </div>
              
              {/* Searchable Dropdown */}
              <div className="sm:w-64 relative">
                <button
                  onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                  className="w-full px-4 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold text-slate-700 flex items-center justify-between"
                >
                  <span className="truncate">{selectedDeptName}</span>
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
                        <div className="max-h-60 overflow-y-auto p-1">
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
                            ทุกแผนก
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
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ทั้งหมด</p>
                <p className="text-2xl font-black text-indigo-600">{printers.length}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">พิมพ์สี</p>
                <p className="text-2xl font-black text-rose-500">
                  {printers.filter(p => p.colorMode === 'Color').length}
                </p>
              </div>
            </div>

            {/* List */}
            <PrinterList 
              printers={filteredPrinters} 
              departments={departments}
              onEdit={(p) => {
                setEditingPrinter(p);
                setIsFormOpen(true);
              }} 
            />
          </>
        ) : view === 'report' ? (
          <ReportPage printers={printers} departments={departments} />
        ) : (
          <ConfigPage onBack={() => setView('list')} />
        )}
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          setEditingPrinter(null);
          setIsFormOpen(true);
        }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-40"
      >
        <Plus size={32} />
      </button>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <PrinterForm 
            printer={editingPrinter} 
            onClose={() => {
              setIsFormOpen(false);
              setEditingPrinter(null);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="max-w-2xl mx-auto px-6 py-12 text-center text-slate-400">
        <p className="text-xs font-medium">© 2026 Printer Asset Management System</p>
      </footer>
    </div>
  );
}
