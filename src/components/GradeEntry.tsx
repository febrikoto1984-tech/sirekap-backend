import React, { useState, useMemo, useEffect } from 'react';
import { MasterData, Student, Grade, Subject, Class } from '../types';
import { Save, AlertCircle, CheckCircle2, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface GradeEntryProps {
  masterData: MasterData;
  onSave: () => void;
}

export default function GradeEntry({ masterData, onSave }: GradeEntryProps) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [grades, setGrades] = useState<Record<string, { pengetahuan: string, praktik: string }>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return masterData.siswa.filter(s => s.kelasId === selectedClassId);
  }, [selectedClassId, masterData.siswa]);

  // Pre-fill existing grades when class or subject changes
  useEffect(() => {
    if (selectedClassId && selectedSubjectId && masterData.nilai) {
      const initialGrades: Record<string, { pengetahuan: string, praktik: string }> = {};
      filteredStudents.forEach(student => {
        const existing = masterData.nilai.find(n => n.siswaId === student.id && n.mapelId === selectedSubjectId);
        if (existing) {
          initialGrades[student.id] = {
            pengetahuan: existing.pengetahuan.toString(),
            praktik: (existing.praktik || 0).toString()
          };
        }
      });
      setGrades(initialGrades);
    }
  }, [selectedClassId, selectedSubjectId, masterData.nilai, filteredStudents]);

  const selectedSubject = useMemo(() => {
    if (selectedSubjectId === 'custom') {
      return {
        id: 'custom',
        nama: customSubjectName || 'Mapel Kustom',
        kategori: 'Umum' as const,
        hasPraktik: true
      };
    }
    return masterData.mapel.find(m => m.id === selectedSubjectId);
  }, [selectedSubjectId, masterData.mapel, customSubjectName]);

  const handleGradeChange = (studentId: string, field: 'pengetahuan' | 'praktik', value: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId) return;
    
    setSaving(true);
    setStatus(null);

    const gradesPayload = filteredStudents.map(student => ({
      siswaId: student.id,
      mapelId: selectedSubjectId === 'custom' ? customSubjectName : selectedSubjectId,
      pengetahuan: parseInt(grades[student.id]?.pengetahuan || '0'),
      praktik: parseInt(grades[student.id]?.praktik || '0'),
      updatedAt: new Date().toISOString()
    }));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/save-grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: gradesPayload })
      });

      if (!response.ok) throw new Error('Gagal menyimpan data');
      
      setStatus({ type: 'success', message: 'Data nilai telah tersimpan ke Google Sheets.' });
      onSave();
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 glass-card p-8 rounded-3xl">
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 tracking-widest uppercase px-1">Pilih Kelas</label>
          <div className="relative">
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full appearance-none px-5 py-4 input-styled rounded-2xl text-sm"
            >
              <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">-- Pilih Kelas --</option>
              {masterData.kelas.map(c => (
                <option key={c.id} value={c.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">{c.nama}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 tracking-widest uppercase px-1">Mata Pelajaran</label>
          <div className="relative">
            <select 
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full appearance-none px-5 py-4 input-styled rounded-2xl text-sm font-medium"
            >
              <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium">-- Pilih Mapel --</option>
              {masterData.mapel.map(m => (
                <option key={m.id} value={m.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium">{m.nama} ({m.kategori})</option>
              ))}
              <option value="custom" className="bg-indigo-900 text-white font-bold italic">-- ISI SENDIRI / KETIK MANUAL --</option>
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {selectedSubjectId === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <input 
                type="text"
                placeholder="Ketik Nama Mata Pelajaran di sini..."
                value={customSubjectName}
                onChange={(e) => setCustomSubjectName(e.target.value)}
                className="w-full px-5 py-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-sm text-indigo-300 placeholder:text-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
              />
            </motion.div>
          )}
        </div>
      </div>

      {selectedClassId && selectedSubjectId ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl overflow-hidden shadow-xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-[var(--glass-border)]">
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest w-16">No</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest w-32">NIS</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Nama Mahasiswa</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest w-24 text-center">JK</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest w-32 text-center text-sky-400">Penget.</th>
                  {selectedSubject?.hasPraktik && (
                    <th className="px-8 py-5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest w-32 text-center text-emerald-400">Praktik</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glass-border)]">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5 text-sm text-[var(--text-muted)] group-hover:text-slate-400 transition-colors">{idx + 1}</td>
                    <td className="px-8 py-5 text-sm font-mono text-[var(--text-muted)]">{student.nis}</td>
                    <td className="px-8 py-5 text-sm font-bold text-[var(--text-primary)]">{student.nama}</td>
                    <td className="px-8 py-5 text-sm text-center font-medium text-[var(--text-muted)]">{student.jk}</td>
                    <td className="px-8 py-5">
                      <input 
                        type="number" 
                        min="0" max="100"
                        value={grades[student.id]?.pengetahuan || ''}
                        onChange={(e) => handleGradeChange(student.id, 'pengetahuan', e.target.value)}
                        className="w-full px-4 py-2.5 input-styled rounded-xl text-center text-sm font-mono"
                        placeholder="00"
                      />
                    </td>
                    {selectedSubject?.hasPraktik && (
                      <td className="px-8 py-5">
                        <input 
                          type="number"
                          min="0" max="100"
                          value={grades[student.id]?.praktik || ''}
                          onChange={(e) => handleGradeChange(student.id, 'praktik', e.target.value)}
                          className="w-full px-4 py-2.5 input-styled rounded-xl text-center text-sm font-mono"
                          placeholder="00"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-white/[0.02] border-t border-[var(--glass-border)] flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {status && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center space-x-2 text-xs font-bold px-4 py-2 rounded-lg backdrop-blur-md",
                    status.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                  )}
                >
                  {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{status.message}</span>
                </motion.div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-3 px-10 py-4 bg-sky-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-sky-600/20 hover:bg-sky-500 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Sinkronisasi...' : 'Simpan ke Google Sheets'}</span>
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center p-32 glass-card rounded-[3rem] border-dashed border-white/10">
           <div className="p-6 bg-white/[0.03] rounded-3xl mb-6 shadow-inner">
             <FileSpreadsheet className="w-16 h-16 text-slate-600" />
           </div>
           <p className="text-slate-500 font-medium text-center max-w-xs leading-relaxed">
             Sistem siap menerima input. Silakan tentukan <span className="text-sky-400">Kelas</span> dan <span className="text-indigo-400">Mata Pelajaran</span> di atas.
           </p>
        </div>
      )}
    </div>
  );
}
