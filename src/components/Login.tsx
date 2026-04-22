import React, { useState } from 'react';
import { Teacher } from '../types';
import { LogIn, UserCircle, KeyRound, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  teachers: Teacher[];
  onLogin: (teacher: Teacher) => void;
}

export default function Login({ teachers, onLogin }: LoginProps) {
  const [nip, setNip] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const teacher = teachers.find(t => t.nip === nip || t.nuptk === nip);
    
    if (teacher) {
      onLogin(teacher);
    } else {
      setError('NIP atau NUPTK tidak ditemukan. Mohon hubungi Admin.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-10 rounded-[2.5rem] border border-white/10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-sky-500 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg shadow-sky-500/20">
            <UserCircle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Login Guru</h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Masuk menggunakan NIP atau NUPTK</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 tracking-widest uppercase px-1">Identitas (NIP/NUPTK)</label>
            <div className="relative">
              <input 
                type="text" 
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Masukkan NIP atau NUPTK"
                className="w-full pl-12 pr-5 py-4 bg-black/30 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all font-medium"
              />
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 " />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2 text-rose-500 text-xs font-bold bg-rose-500/10 p-4 rounded-xl border border-rose-500/20"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button 
            type="submit"
            className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-bold transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center space-x-2"
          >
            <LogIn className="w-5 h-5" />
            <span>MASUK APLIKASI</span>
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">SI-REKAP SMK NEGERI 1 LUBUKSIKAPING</p>
        </div>
      </motion.div>
    </div>
  );
}
