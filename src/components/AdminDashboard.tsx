import React, { useMemo } from 'react';
import { MasterData, Teacher, Subject, Grade } from '../types';
import { CheckCircle2, XCircle, Clock, Search, BookOpen, User, BarChart3, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdminDashboardProps {
  masterData: MasterData;
}

export default function AdminDashboard({ masterData }: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const teachersStatus = useMemo(() => {
    return masterData.guru.map(teacher => {
      const taughtSubjects = teacher.mengajar.split(',').map(s => s.trim()).filter(Boolean);
      
      const subjectStatus = taughtSubjects.map(subName => {
        // Find subject in master data
        const subject = masterData.mapel.find(m => m.nama.toLowerCase().includes(subName.toLowerCase()));
        
        if (!subject) return { name: subName, status: 'warning', message: 'Mapel tidak terdaftar' };

        // Check if any grades exist for this subject
        const hasGrades = masterData.nilai.some(n => n.mapelId === subject.id);
        
        return {
          name: subName,
          status: hasGrades ? 'completed' : 'pending',
          id: subject.id
        };
      });

      const completedCount = subjectStatus.filter(s => s.status === 'completed').length;
      const totalCount = subjectStatus.length;
      
      return {
        ...teacher,
        subjects: subjectStatus,
        progess: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
        isFullyCompleted: totalCount > 0 && completedCount === totalCount
      };
    });
  }, [masterData]);

  const filteredTeachers = teachersStatus.filter(t => 
    t.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.nip.includes(searchTerm)
  );

  const stats = useMemo(() => {
    const total = teachersStatus.length;
    const completed = teachersStatus.filter(t => t.isFullyCompleted).length;
    const partial = teachersStatus.filter(t => !t.isFullyCompleted && t.progess > 0).length;
    return { total, completed, partial };
  }, [teachersStatus]);

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-3xl border border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-500">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Total Guru</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl border border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Selesai Semua</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl border border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Sedang Proses</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.partial}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-6 rounded-3xl border border-[var(--glass-border)]">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Persentase Total</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {stats.total > 0 ? Math.round(((stats.completed + (stats.partial * 0.5)) / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card p-8 rounded-[2.5rem] border border-[var(--glass-border)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">Monitoring Rekap Nilai</h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">Pantau progres penginputan nilai oleh Guru</p>
          </div>
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Cari Guru..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 input-styled rounded-2xl text-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--glass-border)]">
                <th className="px-4 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Guru</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Mata Pelajaran Diampu</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">Status</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center w-40">Progres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]">
              {filteredTeachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)]">
                         <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {teacher.gelarDepan ? teacher.gelarDepan + ' ' : ''}{teacher.nama}{teacher.gelarBelakang ? ', ' + teacher.gelarBelakang : ''}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-tight">NIP. {teacher.nip || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-6">
                    <div className="flex flex-wrap gap-2">
                       {teacher.subjects.map((sub, i) => (
                         <div 
                           key={i} 
                           className={cn(
                             "px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1.5 border",
                             sub.status === 'completed' 
                               ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                               : sub.status === 'pending'
                                 ? "bg-slate-500/10 text-slate-400 border-white/10"
                                 : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                           )}
                         >
                           {sub.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                           {sub.name}
                         </div>
                       ))}
                       {teacher.subjects.length === 0 && <span className="text-xs text-slate-600 italic">Belum ada mapel ditunjuk</span>}
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center">
                     {teacher.isFullyCompleted ? (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                          Selesai
                       </span>
                     ) : teacher.progess > 0 ? (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                          Proses
                       </span>
                     ) : (
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest border border-[var(--glass-border)]">
                          Belum Mulai
                       </span>
                     )}
                  </td>
                  <td className="px-4 py-6">
                    <div className="w-full bg-[var(--input-bg)] rounded-full h-1.5">
                       <div 
                         className={cn(
                           "h-full rounded-full transition-all duration-500",
                           teacher.isFullyCompleted ? "bg-emerald-500" : "bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]"
                         )}
                         style={{ width: `${teacher.progess}%` }}
                       />
                    </div>
                    <p className="text-[9px] text-right mt-1.5 font-bold text-[var(--text-muted)]">
                      {Math.round(teacher.progess)}%
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
