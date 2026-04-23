/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  FileSpreadsheet, 
  Printer, 
  Save, 
  AlertCircle, 
  ChevronRight,
  Download,
  Database,
  LayoutDashboard,
  LogOut,
  Settings,
  Grid,
  User,
  CheckCircle2,
  Clock,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MasterData, Student, Class, Subject, Major, Grade, Teacher } from './types';
import GradeEntry from './components/GradeEntry';
import ReportPreview from './components/ReportPreview';
import Login from './components/Login';
import { cn } from './lib/utils';

import AdminDashboard from './components/AdminDashboard';
import { Sun, Moon, ShieldCheck } from 'lucide-react';

type View = 'dashboard' | 'input' | 'reports' | 'settings' | 'admin';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<Teacher | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Restore theme & session
  useEffect(() => {
    const savedTheme = localStorage.getItem('sirekap_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.body.classList.toggle('light', savedTheme === 'light');
    }

    const savedUser = localStorage.getItem('sirekap_guru');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('sirekap_guru');
      }
    }
  }, []);

  // Close sidebar on route change
  const navigateTo = (v: View) => {
    setView(v);
    setSidebarOpen(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('sirekap_theme', newTheme);
    document.body.classList.toggle('light', newTheme === 'light');
  };

  const isAdmin = useMemo(() => {
    return user?.role === 'admin' || user?.nama.toLowerCase().includes('admin') || user?.nip === '198402282010011009';
  }, [user]);

  const handleLogin = (teacher: Teacher) => {
    const updatedTeacher = { ...teacher };
    if (teacher.nama.toLowerCase().includes('admin') || teacher.nip === '198402282010011009') {
       updatedTeacher.role = 'admin';
    }
    setUser(updatedTeacher);
    localStorage.setItem('sirekap_guru', JSON.stringify(updatedTeacher));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('sirekap_guru');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/master-data`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal mengambil data dari Google Sheets.');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'input', label: 'Input Nilai', icon: FileSpreadsheet },
    { id: 'reports', label: 'Cetak Laporan', icon: Printer },
    { id: 'admin', label: 'Admin Panel', icon: ShieldCheck, hidden: !isAdmin },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ].filter(i => !i.hidden);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white px-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="mb-6"
        >
          <Database className="w-16 h-16 text-sky-500" />
        </motion.div>
        <p className="font-sans font-medium tracking-wide animate-pulse text-center">Menghubungkan ke Google Sheets...</p>
      </div>
    );
  }

  if (!user && data) {
    return <Login teachers={data.guru} onLogin={handleLogin} />;
  }

  const filteredData = data ? {
    ...data,
    mapel: !user?.mengajar || user.mengajar === "*" || user.mengajar.toLowerCase() === "all"
      ? data.mapel
      : data.mapel.filter(m => {
          const teaching = user.mengajar.toLowerCase();
          const mapelNama = m.nama.toLowerCase();
          return teaching.includes(mapelNama) || mapelNama.includes(teaching) || m.isCustom;
        })
  } : null;

  const SidebarContent = () => (
    <>
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-8 lg:mb-10">
          <img 
            src={`${import.meta.env.VITE_API_URL || ''}/api/school-logo`} 
            alt="Logo SMKN 1 Lubuk Sikaping" 
            className="w-10 h-10 lg:w-12 lg:h-12 object-contain drop-shadow-md" 
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="text-[var(--text-primary)] block font-bold tracking-tight text-base lg:text-lg leading-none">SI-REKAP</span>
            <span className="text-[10px] text-[var(--text-muted)] font-bold tracking-tighter uppercase">SMKN 1 LUBUKSIKAPING</span>
          </div>
        </div>

        <nav className="space-y-4">
          <div className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mb-2 px-3">Menu Utama</div>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as View)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium sidebar-link",
                  view === item.id && "active-link"
                )}
              >
                <item.icon className={cn("w-4 h-4 shrink-0", view === item.id ? "text-sky-400" : "text-slate-400")} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="mt-auto p-6 lg:p-8">
        <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-center">
          <p className="text-sky-400 text-[10px] uppercase font-bold mb-1 tracking-widest">G-Sheets Sync</p>
          <div className="text-[var(--text-primary)] text-xs font-medium flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            Terhubung
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className={cn(
      "min-h-screen w-full font-sans transition-colors duration-500",
      theme === 'dark' ? "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" : "bg-slate-50"
    )}>
      {/* ── DESKTOP LAYOUT ── */}
      <div className="hidden lg:flex h-screen w-full items-center justify-center p-6">
        <div className="w-full h-full glass rounded-3xl overflow-hidden flex shadow-2xl border-white/5">
          {/* Desktop Sidebar */}
          <aside className="w-64 flex flex-col border-r border-[var(--glass-border)] shrink-0 bg-[var(--sidebar-bg)] transition-colors">
            <SidebarContent />
          </aside>

          {/* Desktop Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-main)] transition-colors">
            <header className="h-20 px-10 flex items-center justify-between border-b border-[var(--glass-border)] shrink-0 bg-[var(--bg-surface)] transition-colors">
              <h2 className="text-[var(--text-primary)] text-lg font-bold tracking-tight">
                {menuItems.find(i => i.id === view)?.label}
              </h2>
              <div className="flex items-center gap-4">
                <button onClick={toggleTheme} className="w-10 h-10 rounded-full glass flex items-center justify-center border border-[var(--glass-border)] hover:bg-white/10 transition-colors" title="Toggle Tema">
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
                </button>
                <div className="h-8 w-px bg-[var(--glass-border)] mx-1"></div>
                <div className="flex flex-col items-end">
                  <p className="text-[var(--text-primary)] text-xs font-bold">{user?.nama}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight">{user?.nip ? `NIP. ${user.nip}` : 'GURU'}</p>
                </div>
                <button onClick={handleLogout} className="w-10 h-10 rounded-full glass flex items-center justify-center border border-[var(--glass-border)] hover:bg-rose-500/20 group transition-all" title="Log Out">
                  <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                </button>
                <div className="h-8 w-px bg-[var(--glass-border)] mx-1"></div>
                <button onClick={fetchData} className="w-10 h-10 rounded-full glass flex items-center justify-center border border-[var(--glass-border)] hover:bg-white/10 transition-colors" title="Refresh Data">
                  <Database className="w-4 h-4 text-[var(--text-primary)]" />
                </button>
              </div>
            </header>

            <section className="flex-1 overflow-y-auto p-6 lg:p-10 pt-8 scrollbar-thin">
              <PageContent error={error} view={view} filteredData={filteredData} data={data} user={user} fetchData={fetchData} />
            </section>
          </main>
        </div>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="flex flex-col lg:hidden min-h-screen">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--glass-border)] backdrop-blur-xl">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-xl bg-[var(--sidebar-active)] border border-[var(--glass-border)] flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-[var(--text-primary)]" />
          </button>

          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.VITE_API_URL || ''}/api/school-logo`} alt="Logo" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
            <span className="text-[var(--text-primary)] font-bold text-sm tracking-tight">SI-REKAP</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-9 h-9 rounded-xl bg-[var(--sidebar-active)] border border-[var(--glass-border)] flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
            </button>
            <button onClick={handleLogout} className="w-9 h-9 rounded-xl bg-[var(--sidebar-active)] border border-[var(--glass-border)] flex items-center justify-center group">
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="sidebar-overlay"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="mobile-sidebar open"
              >
                <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
                  <span className="text-[var(--text-primary)] font-bold text-sm">Menu</span>
                  <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg bg-[var(--sidebar-active)] flex items-center justify-center">
                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Mobile User Info */}
        <div className="px-4 py-3 flex items-center gap-3 bg-[var(--bg-main)]">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[var(--text-primary)] text-xs font-bold truncate">{user?.nama}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-tight">{user?.nip ? `NIP. ${user.nip}` : 'GURU'}</p>
          </div>
          <button onClick={fetchData} className="ml-auto w-9 h-9 rounded-xl bg-[var(--sidebar-active)] border border-[var(--glass-border)] flex items-center justify-center shrink-0" title="Refresh">
            <Database className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--glass-border)] backdrop-blur-xl flex">
          {menuItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id as View)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-all",
                view === item.id ? "text-sky-400" : "text-slate-500"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase tracking-wider leading-none">
                {item.label.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile Content */}
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 scrollbar-thin">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <PageContent error={error} view={view} filteredData={filteredData} data={data} user={user} fetchData={fetchData} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── Extracted Page Content ──────────────────────────────────────────────────
interface PageContentProps {
  error: string | null;
  view: string;
  filteredData: MasterData | null;
  data: MasterData | null;
  user: Teacher | null;
  fetchData: () => void;
}

function PageContent({ error, view, filteredData, data, user, fetchData }: PageContentProps) {
  return (
    <>
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-400 backdrop-blur-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Terjadi Kesalahan</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {view === 'dashboard' && filteredData && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-3 lg:gap-6">
                <StatCard label="Siswa" value={filteredData.siswa.length} icon={Users} color="text-sky-400" />
                <StatCard label="Kelas" value={filteredData.kelas.length} icon={Grid} color="text-indigo-400" />
                <StatCard label="Mapel" value={filteredData.mapel.length} icon={BookOpen} color="text-emerald-400" />
              </div>

              {/* Welcome Card */}
              <div className="glass-card p-6 lg:p-10 rounded-[2rem] relative overflow-hidden flex flex-col justify-center border border-[var(--glass-border)] shadow-2xl">
                <div className="relative z-10">
                  <h3 className="text-base lg:text-2xl font-bold text-[var(--text-primary)] tracking-tight mb-2 uppercase">
                    Selamat Datang, {user ? `${user.gelarDepan ? user.gelarDepan + ' ' : ''}${user.nama}` : ''}
                  </h3>
                  <p className="text-xs lg:text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                    Anda sedang mengampu mata pelajaran 
                    <span className="text-sky-500 font-bold mx-1 italic">{user?.mengajar || 'yang ditugaskan'}</span>. 
                    Daftar siswa dan mata pelajaran telah disesuaikan secara otomatis.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-5">
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Excel Active</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
                      <span className="text-[10px] text-sky-400 font-black tracking-widest uppercase">PDF Engine</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12">
                  <LayoutDashboard className="w-48 h-48 lg:w-64 lg:h-64 text-white" />
                </div>
              </div>

              {/* Teacher Status */}
              <div className="glass-card p-6 rounded-[2rem] border border-[var(--glass-border)]">
                <h4 className="text-[var(--text-primary)] font-bold text-xs uppercase tracking-widest mb-4 px-2">Status Input Nilai</h4>
                <div className="space-y-3">
                  {data?.guru.slice(0, 5).map(teacher => {
                    const hasInput = data.nilai.some(n => {
                      return teacher.mengajar.toLowerCase().includes(data.mapel.find(m => m.id === n.mapelId)?.nama.toLowerCase() || '');
                    });
                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/5 border border-[var(--glass-border)]">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-[var(--text-muted)]" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] text-[var(--text-primary)] font-bold truncate">
                              {teacher.gelarDepan ? teacher.gelarDepan + ' ' : ''}{teacher.nama}{teacher.gelarBelakang ? ', ' + teacher.gelarBelakang : ''}
                            </span>
                            <span className="text-[8px] text-[var(--text-muted)] font-medium truncate">{teacher.mengajar}</span>
                          </div>
                        </div>
                        {hasInput ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                  <p className="text-[8px] text-[var(--text-muted)] text-center mt-2 font-bold uppercase tracking-widest italic">Monitoring Keaktifan Guru</p>
                </div>
              </div>
            </div>
          )}

          {view === 'input' && filteredData && (
            <GradeEntry masterData={filteredData} onSave={fetchData} />
          )}

          {view === 'reports' && filteredData && (
            <ReportPreview masterData={filteredData} currentUser={user} />
          )}

          {view === 'admin' && filteredData && (
            <AdminDashboard masterData={data!} />
          )}

          {view === 'settings' && (
            <div className="glass-card p-6 lg:p-10 rounded-3xl max-w-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <Settings className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">Cloud Sync</h3>
                  <p className="text-xs text-slate-500">Konfigurasi endpoint Google Workspace</p>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2 tracking-widest uppercase">Spreadsheet Master ID</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={data?.spreadsheetId || 'MENGGUNAKAN DEFAULT SETTINGS'} 
                    readOnly
                    className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-sm font-mono text-sky-400 focus:outline-none"
                  />
                  <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
                <p className="text-[10px] text-slate-500 mt-3 italic leading-relaxed">
                  ID ini diambil dari konfigurasi sistem. Perubahan konfigurasi harus melalui administrator untuk keamanan data.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <div className="glass-card p-4 lg:p-6 rounded-2xl flex flex-col lg:flex-row items-center lg:items-center lg:space-x-5 gap-2 group hover:bg-white/[0.04] transition-all duration-300 cursor-default border-[var(--glass-border)]">
      <div className={cn("p-3 lg:p-4 rounded-2xl bg-black/5 border border-[var(--glass-border)] group-hover:scale-110 transition-transform duration-300 shadow-inner", color)}>
        <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
      </div>
      <div className="text-center lg:text-left">
        <p className="text-[9px] lg:text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-0.5 lg:mb-1">{label}</p>
        <p className="text-xl lg:text-2xl font-bold tracking-tight text-[var(--text-primary)]">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
