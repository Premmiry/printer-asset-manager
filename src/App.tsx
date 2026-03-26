import React, { useState, useEffect } from 'react';
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, onSnapshot, collection, query, orderBy, doc, getDocFromServer, addDoc, setDoc, updateDoc } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Printer, Department, Company, UserProfile } from './types';
import { PrinterForm } from './components/PrinterForm';
import { PrinterList } from './components/PrinterList';
import { ConfigPage } from './components/ConfigPage';
import { ReportPage } from './components/ReportPage';
import { LogIn, LogOut, Plus, Printer as PrinterIcon, Search, User as UserIcon, Settings, ChevronDown, X as CloseIcon, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
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
  const [toastMessage, setToastMessage] = useState({ type: '', text: '' });
  
  // Auth states
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCompany, setAuthCompany] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');

  // Fetch companies for login/register
  // Data Starter Script (Run once for admin to setup Yanhee)
  const setupDataStarter = async () => {
    const isSpecialAdmin = user?.email?.startsWith('prem@') || user?.displayName?.toLowerCase() === 'prem';
    if (!user || (userProfile?.role !== 'admin' && !isSpecialAdmin)) {
      alert('คุณไม่มีสิทธิ์ใช้งานฟังก์ชันนี้');
      return;
    }
    
    try {
      setLoading(true);
      console.log("Starting Data Starter...");
      
      // 1. Create Yanhee Company if not exists
      const qCompanies = query(collection(db, 'companies'));
      let yanheeExists = false;
      companies.forEach(c => {
        if (c.code === 'YANHEE') yanheeExists = true;
      });

      if (!yanheeExists) {
        await addDoc(collection(db, 'companies'), {
          code: 'YANHEE',
          name: 'บ.ยันฮี',
          createdAt: Date.now()
        });
        console.log("Created Yanhee company");
      } else {
        console.log("Yanhee company already exists");
      }

      // 2. Update all existing departments to belong to YANHEE
      // We already have departments in state
      const updatePromises = departments
        .filter(d => !d.companyCode) // Only update those without a company code
        .map(d => updateDoc(doc(db, 'departments', d.id), { companyCode: 'YANHEE' }));
      
      // 3. Update all existing printers to belong to YANHEE
      const printerPromises = printers
        .filter(p => !p.companyCode)
        .map(p => updateDoc(doc(db, 'printers', p.id), { companyCode: 'YANHEE' }));
      
      if (printerPromises.length > 0) {
        await Promise.all(printerPromises);
        console.log(`Updated ${printerPromises.length} printers to YANHEE`);
      }

      // 4. Seed default Printer Types and Brands if missing
      const defaultTypes = ['Laser', 'Inkjet', 'Dot Matrix', 'Thermal', 'Multifunction'];
      const defaultBrands = ['Epson', 'Canon', 'Brother', 'HP', 'Samsung', 'Pantum', 'Ricoh', 'Oki', 'Toshiba', 'Label / Barcode Printer'];
      const defaultTypePrinters = [{ id: '1', name: 'เครื่องบริษัท' }, { id: '2', name: 'เครื่องเช่า' }];

      // Just add them (to avoid duplicates we could check, but Run Data Starter is run once usually)
      // To be safe, let's just add them. But we should ideally check if they exist.
      // We will do a quick check via getDocs.
      // But actually, we don't need to check, just try to add them if they are missing.
      // But let's check first to avoid adding multiple times.
      // NOTE: Using getDocs here might fail if rules don't allow it, but admin should have access.
      const { getDocs } = await import('firebase/firestore');
      
      try {
        const typesSnap = await getDocs(collection(db, 'printerTypes'));
        if (typesSnap.empty) {
          await Promise.all(defaultTypes.map(name => addDoc(collection(db, 'printerTypes'), { name, createdAt: Date.now() })));
          console.log("Created default Printer Types");
        }
      } catch (e) {
        console.warn("Could not check/add printerTypes, maybe permission denied or already exists", e);
      }

      try {
        const brandsSnap = await getDocs(collection(db, 'printerBrands'));
        if (brandsSnap.empty) {
          await Promise.all(defaultBrands.map(name => addDoc(collection(db, 'printerBrands'), { name, createdAt: Date.now() })));
          console.log("Created default Printer Brands");
        }
      } catch (e) {
        console.warn("Could not check/add printerBrands, maybe permission denied or already exists", e);
      }

      try {
        const typePrintersSnap = await getDocs(collection(db, 'typeprinters'));
        if (typePrintersSnap.empty) {
          const { setDoc } = await import('firebase/firestore');
          await Promise.all(defaultTypePrinters.map(item => setDoc(doc(db, 'typeprinters', item.id), { id: item.id, name: item.name, createdAt: Date.now() })));
          console.log("Created default Type Printers");
        }
      } catch (e) {
        console.warn("Could not check/add typeprinters, maybe permission denied or already exists", e);
      }

      const msg = 'ตั้งค่าข้อมูลเริ่มต้น (Data Starter) สำหรับ บ.ยันฮี เรียบร้อยแล้ว!';
      console.log(msg);
      setToastMessage({ type: 'success', text: msg });
      setTimeout(() => setToastMessage({ type: '', text: '' }), 5000);
      alert(msg);
    } catch (err: any) {
      console.error("Error setting up data starter:", err);
      const errMsg = 'เกิดข้อผิดพลาด: ' + (err.message || 'Unknown error');
      setToastMessage({ type: 'error', text: errMsg });
      setTimeout(() => setToastMessage({ type: '', text: '' }), 5000);
      alert(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'companies'), orderBy('code', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Company[];
      setCompanies(data);
      
      // Auto-select the first company if not set and data is available
      const activeCompanies = data.filter(c => c.isActive !== false);
      if (activeCompanies.length > 0 && !authCompany) {
        setAuthCompany(activeCompanies[0].code);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user profile
        try {
          const profileDoc = await getDocFromServer(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            
            // Force admin role for 'prem' if not already set correctly
            if (user.email?.startsWith('prem@') || user.displayName?.toLowerCase() === 'prem') {
              if (data.role !== 'admin') {
                data.role = 'admin';
                // Don't override companyCode to 'ALL' anymore, keep what was selected during login
                await setDoc(doc(db, 'users', user.uid), data);
              }
            }
            setUserProfile(data);
          } else {
             // For old users (like prem) who don't have a profile yet
             const isSpecialAdmin = user.email?.startsWith('prem@') || user.displayName?.toLowerCase() === 'prem';
             const fallbackProfile: UserProfile = {
                uid: user.uid,
                username: user.displayName || user.email?.split('@')[0] || 'Unknown',
                role: isSpecialAdmin ? 'admin' : 'user',
                companyCode: authCompany || 'UNKNOWN', // Use selected company
                createdAt: Date.now()
             };
             setUserProfile(fallbackProfile);
             // Save it so it exists next time
             await setDoc(doc(db, 'users', user.uid), fallbackProfile);
          }
        } catch (err) {
          console.error("Error fetching user profile", err);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !userProfile) {
      setPrinters([]);
      setDepartments([]);
      return;
    }

    // Load printers based on role and company
    const qPrinters = query(collection(db, 'printers'), orderBy('createdAt', 'desc'));
    const unsubscribePrinters = onSnapshot(qPrinters, (snapshot) => {
      const printerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Printer[];
      
      // Filter by company for EVERYONE (including admin)
      // Admin with 'ALL' companyCode sees everything, otherwise filter by companyCode
      if (userProfile.companyCode === 'ALL') {
        setPrinters(printerData);
      } else {
        setPrinters(printerData.filter(p => p.companyCode === userProfile.companyCode));
      }
    });

    // Load departments
    const qDept = query(collection(db, 'departments'), orderBy('code', 'asc'));
    const unsubscribeDept = onSnapshot(qDept, (snapshot) => {
      const deptData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Department[];
      
      // Filter by company for EVERYONE (including admin)
      if (userProfile.companyCode === 'ALL') {
        setDepartments(deptData);
      } else {
        setDepartments(deptData.filter(d => d.companyCode === userProfile.companyCode));
      }
    });

    return () => {
      unsubscribePrinters();
      unsubscribeDept();
    };
  }, [user, userProfile]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (!authUsername || !authPassword) {
      setAuthError('กรุณากรอก Username และ Password');
      return;
    }

    if (!isLoginMode && !authCompany) {
      setAuthError('กรุณาเลือกบริษัท');
      return;
    }
    
    // Check if company is selected during login
    if (isLoginMode && !authCompany) {
      setAuthError('กรุณาเลือกบริษัทที่ต้องการเข้าสู่ระบบ');
      return;
    }

    // Create dummy email
    // Check if user exists in Firebase first to get correct email format
    // Since we don't have a way to check if user exists without trying to log in,
    // and old 'prem' account might have been created as prem@pam.local,
    // we should try that first for admin.
    const isSpecialAdmin = authUsername.toLowerCase() === 'prem';
    const emailPrefix = isSpecialAdmin ? authUsername.toLowerCase() : `${authUsername.toLowerCase()}.${authCompany.toLowerCase()}`;
    const dummyEmail = `${emailPrefix}@pam.local`;

    try {
      if (isLoginMode) {
        try {
          // Login
          const userCredential = await signInWithEmailAndPassword(auth, dummyEmail, authPassword);
          
          // Verify company match for ALL users (including admin)
          const profileDoc = await getDocFromServer(doc(db, 'users', userCredential.user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            
            // Allow login if user's company matches selected company
            // OR if it's the old 'prem' admin and they still have 'ALL' (backward compatibility)
            // Note: We don't auto-update admin's company to what they selected anymore, 
            // they must explicitly match their assigned company.
            if (data.companyCode !== authCompany && data.companyCode !== 'ALL') {
              // If company doesn't match, sign out and throw error
              await signOut(auth);
              throw new Error('COMPANY_MISMATCH');
            }
          }
        } catch (err: any) {
          if (err.message === 'COMPANY_MISMATCH') {
            setAuthError('ไม่พบชื่อผู้ใช้งานนี้ในบริษัทที่เลือก กรุณาตรวจสอบบริษัทอีกครั้ง');
            return;
          }
          // If admin login fails with company-specific email, try generic email (backward compatibility)
          if (isSpecialAdmin && err.code === 'auth/user-not-found') {
             const userCredential = await signInWithEmailAndPassword(auth, `${authUsername.toLowerCase()}@pam.local`, authPassword);
             // Verify company match for fallback login too
             const profileDoc = await getDocFromServer(doc(db, 'users', userCredential.user.uid));
             if (profileDoc.exists()) {
               const data = profileDoc.data() as UserProfile;
               if (data.companyCode !== authCompany && data.companyCode !== 'ALL') {
                 await signOut(auth);
                 throw new Error('COMPANY_MISMATCH');
               }
             }
          } else {
            throw err;
          }
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, authPassword);
        
        // Determine role
        const role = authUsername.toLowerCase() === 'prem' ? 'admin' : 'user';

        // Save user profile to Firestore
        await updateProfile(userCredential.user, {
          displayName: authUsername
        });
        
        // Save extra user data
        const profileData: UserProfile = {
          uid: userCredential.user.uid,
          username: authUsername,
          role: role,
          companyCode: authCompany, // Everyone gets assigned a company now
          createdAt: Date.now()
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), profileData);
        setUserProfile(profileData);
        setUser({ ...userCredential.user, displayName: authUsername } as User);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setAuthError('Username หรือ Password ไม่ถูกต้อง');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Username นี้ถูกใช้งานแล้ว');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      } else {
        setAuthError('เกิดข้อผิดพลาด: ' + err.message);
      }
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
          className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl shadow-indigo-100"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
            <PrinterIcon size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 text-center">Printer Asset</h1>
          <p className="text-slate-500 mb-8 leading-relaxed text-center">
            ระบบจัดการข้อมูลเครื่องพิมพ์สำหรับองค์กร
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="กรอกชื่อผู้ใช้งาน..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="กรอกรหัสผ่าน..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">บริษัท</label>
              <div className="relative">
                <select
                  value={authCompany}
                  onChange={(e) => setAuthCompany(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none bg-white"
                >
                  <option value="" disabled>เลือกบริษัท...</option>
                  {companies.filter(c => c.isActive !== false).map(c => (
                    <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={18} />
                </div>
              </div>
              {companies.filter(c => c.isActive !== false).length === 0 && (
                <p className="text-xs text-rose-500 mt-1">* ยังไม่มีข้อมูลบริษัทที่เปิดใช้งานในระบบ</p>
              )}
            </div>
            
            {authError && (
              <p className="text-rose-500 text-sm font-medium text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
            >
              <LogIn size={20} />
              <span>{isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setAuthError('');
              }}
              className="text-indigo-600 text-sm font-bold hover:underline"
            >
              {isLoginMode ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
            </button>
          </div>
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
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
              <PrinterIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">PRINTER</h1>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                {userProfile?.role === 'admin' ? 'Admin Manager' : userProfile?.companyCode || 'Asset Manager'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(userProfile?.role === 'admin' || user?.email?.startsWith('prem@') || user?.displayName?.toLowerCase() === 'prem') && (
              <button
                onClick={setupDataStarter}
                className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-200 transition-colors mr-2"
                title="ตั้งค่าข้อมูลเริ่มต้น (ยันฮี)"
              >
                <span>Run Data Starter</span>
              </button>
            )}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              <UserIcon size={14} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-700 max-w-20 truncate">
                {user.displayName || user.email?.split('@')[0] || 'User'}
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
      <main className="w-full px-6 py-8">
        <AnimatePresence>
          {toastMessage.text && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-4 p-4 rounded-2xl border font-medium flex items-center justify-between shadow-sm ${
                toastMessage.type === 'error' 
                  ? 'bg-rose-100 text-rose-800 border-rose-200' 
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <span>{toastMessage.text}</span>
              <button onClick={() => setToastMessage({ type: '', text: '' })} className={`p-1 rounded-full transition-colors ${
                toastMessage.type === 'error' ? 'hover:bg-rose-200' : 'hover:bg-emerald-200'
              }`}>
                <CloseIcon size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
            <span>ตั้งค่า {userProfile?.role === 'admin' ? '(Admin)' : ''}</span>
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
          <ConfigPage onBack={() => setView('list')} userProfile={userProfile} />
        )}
      </main>

      {/* Floating Action Button (only on List view) */}
      {view === 'list' && (
        <button
          onClick={() => {
            setEditingPrinter(null);
            setIsFormOpen(true);
          }}
          className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-40"
        >
          <Plus size={32} />
        </button>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <PrinterForm 
            printer={editingPrinter} 
            userProfile={userProfile}
            onClose={() => {
              setIsFormOpen(false);
              setEditingPrinter(null);
            }} 
          />
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="w-full px-6 py-12 text-center text-slate-400">
        <p className="text-xs font-medium">© 2026 Printer Asset Management System by DevPrem</p>
      </footer>
    </div>
  );
}
