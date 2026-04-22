import React, { useState, useMemo, useRef } from 'react';
import { MasterData, Student, Grade, Subject, Class, Teacher } from '../types';
import { Printer, Download, FileText, ChevronDown, Table, Cloud, FolderCheck, Settings2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';

interface ReportConfig {
  title: string;
  year: string;
  prov: string;
  dept: string;
  schoolName: string;
  address: string;
  contact: string;
  emailWeb: string;
  headmaster: string;
  headmasterNip: string;
  city: string;
  date: string;
}

interface ReportPreviewProps {
  masterData: MasterData;
  currentUser?: Teacher | null;
}

export default function ReportPreview({ masterData, currentUser }: ReportPreviewProps) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [savingToDrive, setSavingToDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [availableFolders, setAvailableFolders] = useState<{ id: string, name: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [printError, setPrintError] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<ReportConfig>({
    title: 'DAFTAR NILAI SUMATIF AKHIR JENJANG (SAJ) KELAS XII',
    year: '2025/2026',
    prov: 'PEMERINTAH PROPINSI SUMATERA BARAT',
    dept: 'DINAS PENDIDIKAN',
    schoolName: 'SMK NEGERI 1 LUBUKSIKAPING',
    address: 'Jl. Prof. DR. Hamka No. 26 Lubuksikaping, Kabupaten Pasaman',
    contact: 'Telepon/Fax : (0753)20365  -  Kode Pos : 26351',
    emailWeb: 'Email : smkn1lubuksikaping@yahoo.com - Website : www.smkn1lubuksikaping.sch.id',
    headmaster: 'Ratnawilis, S.Pd, M.Si',
    headmasterNip: '197407072007012004',
    city: 'Lubuk Sikaping',
    date: 'Maret 2026'
  });
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch folders on component mount
  React.useEffect(() => {
    const fetchFolders = async () => {
      setLoadingFolders(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/drive/folders`);
        if (res.ok) {
          const data = await res.json();
          setAvailableFolders(data);
          if (data.length > 0) setSelectedFolderId(data[0].id);
        }
      } catch (e) {
        console.error("Gagal ambil folder:", e);
      } finally {
        setLoadingFolders(false);
      }
    };
    fetchFolders();
  }, []);

  const selectedClass = masterData.kelas.find(c => c.id === selectedClassId);
  const selectedSubject = masterData.mapel.find(m => m.id === selectedSubjectId);

  const filteredStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return masterData.siswa.filter(s => s.kelasId === selectedClassId);
  }, [selectedClassId, masterData.siswa]);

  const getGrade = (studentId: string) => {
    return masterData.nilai.find(n => n.siswaId === studentId && n.mapelId === selectedSubjectId);
  };

  const handlePrint = async () => {
    if (!selectedClass || !selectedSubject) return;
    setPrinting(true);

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      // Helper to fetch images as base64
      const getBase64 = async (url: string) => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error("Failed to fetch image:", url, e);
          return null;
        }
      };

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const [logoKemdikbud, logoSchool] = await Promise.all([
        getBase64(`${apiUrl}/api/kemdikbud-logo`),
        getBase64(`${apiUrl}/api/school-logo`)
      ]);

      // Header Section
      const startY = 15;
      const marginX = 15;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Logos
      if (logoKemdikbud) doc.addImage(logoKemdikbud, 'PNG', marginX, startY, 18, 18);
      if (logoSchool) doc.addImage(logoSchool, 'PNG', pageWidth - marginX - 22, startY, 22, 22);

      // School Info
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(config.prov, pageWidth / 2, startY + 5, { align: 'center' });
      doc.text(config.dept, pageWidth / 2, startY + 10, { align: 'center' });
      doc.setFontSize(16);
      doc.text(config.schoolName, pageWidth / 2, startY + 17, { align: 'center' });
      
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.text(config.address, pageWidth / 2, startY + 22, { align: 'center' });
      doc.setFont('times', 'normal');
      doc.text(config.contact, pageWidth / 2, startY + 25, { align: 'center' });
      doc.text(config.emailWeb, pageWidth / 2, startY + 28, { align: 'center' });

      // Separator Line
      doc.setLineWidth(0.8);
      doc.line(marginX, startY + 32, pageWidth - marginX, startY + 32);
      doc.setLineWidth(0.2);
      doc.line(marginX, startY + 33, pageWidth - marginX, startY + 33);

      // Title
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(config.title, pageWidth / 2, startY + 42, { align: 'center' });
      const titleWidth = doc.getTextWidth(config.title);
      doc.line(pageWidth / 2 - titleWidth / 2, startY + 43, pageWidth / 2 + titleWidth / 2, startY + 43);
      doc.text(`TAHUN PELAJARAN ${config.year}`, pageWidth / 2, startY + 48, { align: 'center' });

      // Meta Info
      doc.setFontSize(10);
      doc.text("MATA PELAJARAN", marginX, startY + 60);
      doc.text(`: ${selectedSubject.nama.toUpperCase()}`, marginX + 40, startY + 60);
      
      doc.text("KELAS", pageWidth - marginX - 50, startY + 60);
      doc.text(`: ${selectedClass.nama.toUpperCase()}`, pageWidth - marginX - 35, startY + 60);

      // Main Table
      const tableData = filteredStudents.map((s, i) => {
        const g = getGrade(s.id);
        return [
          i + 1,
          s.nis,
          s.nama.toUpperCase(),
          s.jk,
          g?.pengetahuan || '-',
          g?.praktik || '-',
          '-'
        ];
      });

      // Fill empty rows to make it look standard
      const minRows = 35;
      while (tableData.length < minRows) {
        tableData.push(['', '', '', '', '', '', '']);
      }

      autoTable(doc, {
        startY: startY + 65,
        head: [['NO', 'NIS', 'NAMA SISWA', 'JK', 'N_PENGETAHUAN', 'N_PRAKTIK', 'KET']],
        body: tableData,
        styles: {
          font: 'times',
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [240, 240, 240],
          halign: 'center',
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 22 },
          2: { halign: 'left' },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 25 },
          6: { halign: 'center', cellWidth: 12 },
        },
        theme: 'grid',
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;

      // Signatures
      doc.setFontSize(9);
      doc.setFont('times', 'normal');
      
      // Left side (Headmaster)
      doc.text("Mengetahui:", marginX + 5, finalY);
      doc.text("Kepala Sekolah,", marginX + 5, finalY + 4);
      doc.setFont('times', 'bold');
      doc.text(config.headmaster.toUpperCase(), marginX + 5, finalY + 25);
      const hmWidth = doc.getTextWidth(config.headmaster.toUpperCase());
      doc.line(marginX + 5, finalY + 26, marginX + 5 + hmWidth, finalY + 26);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${config.headmasterNip}`, marginX + 5, finalY + 30);

      // Right side (Teacher)
      doc.text(`${config.city}, ${config.date}`, pageWidth - marginX - 5, finalY, { align: 'right' });
      doc.text("Guru Mata Pelajaran,", pageWidth - marginX - 5, finalY + 4, { align: 'right' });
      
      const teacherName = currentUser ? 
        `${currentUser.gelarDepan ? currentUser.gelarDepan + ' ' : ''}${currentUser.nama}${currentUser.gelarBelakang ? ', ' + currentUser.gelarBelakang : ''}` : 
        'GURU MATA PELAJARAN';
      
      doc.setFont('times', 'bold');
      doc.text(teacherName.toUpperCase(), pageWidth - marginX - 5, finalY + 25, { align: 'right' });
      const tWidth = doc.getTextWidth(teacherName.toUpperCase());
      doc.line(pageWidth - marginX - 5 - tWidth, finalY + 26, pageWidth - marginX - 5, finalY + 26);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${currentUser?.nip || '.............................'}`, pageWidth - marginX - 5, finalY + 30, { align: 'right' });

      doc.save(`SAJ_${selectedClass.nama}_${selectedSubject.nama}.pdf`);
    } catch (e) {
      console.error("Manual PDF generation failed:", e);
      setPrintError(true);
      setTimeout(() => setPrintError(false), 8000);
    } finally {
      setPrinting(false);
    }
  };

  const handleExcelExport = async () => {
    setExporting(true);
    const teacherFullDisplayName = currentUser ? 
      `${currentUser.gelarDepan ? currentUser.gelarDepan + ' ' : ''}${currentUser.nama}${currentUser.gelarBelakang ? ', ' + currentUser.gelarBelakang : ''}` : 
      'GURU MATA PELAJARAN';

    try {
      const payload = {
        meta: {
          kelas: selectedClass?.nama,
          mapel: selectedSubject?.nama,
          teacherName: teacherFullDisplayName,
          teacherNip: currentUser?.nip || '.........................',
          config: config
        },
        data: filteredStudents.map(s => {
          const g = getGrade(s.id);
          return {
            nis: s.nis,
            nama: s.nama,
            jk: s.jk,
            pengetahuan: g?.pengetahuan || 0,
            praktik: g?.praktik || 0,
          };
        })
      };

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/export-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SAJ_${selectedClass?.nama}_${selectedSubject?.nama}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleDriveSave = async (force: boolean = false) => {
    setSavingToDrive(true);
    setDriveStatus(null);
    const teacherFullDisplayName = currentUser ? 
      `${currentUser.gelarDepan ? currentUser.gelarDepan + ' ' : ''}${currentUser.nama}${currentUser.gelarBelakang ? ', ' + currentUser.gelarBelakang : ''}` : 
      'GURU MATA PELAJARAN';

    try {
      const payload = {
        meta: {
          kelas: selectedClass?.nama,
          mapel: selectedSubject?.nama,
          jurusan: selectedClass?.jurusanId,
          kategori: selectedSubject?.kategori,
          teacherName: teacherFullDisplayName,
          teacherNip: currentUser?.nip || '.........................',
          config: config
        },
        selectedFolderId,
        force,
        data: filteredStudents.map(s => {
          const g = getGrade(s.id);
          return {
            nis: s.nis,
            nama: s.nama,
            jk: s.jk,
            pengetahuan: g?.pengetahuan || 0,
            praktik: g?.praktik || 0,
          };
        })
      };

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/save-to-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan ke Drive');

      if (result.exists) {
        const confirmOverwrite = window.confirm(result.message);
        if (confirmOverwrite) {
          return handleDriveSave(true);
        } else {
          return;
        }
      }

      setDriveStatus({ 
        type: 'success', 
        message: result.force ? `File berhasil diperbarui di Drive!` : `File berhasil disimpan di Drive!` 
      });
    } catch (err: any) {
      setDriveStatus({ type: 'error', message: err.message });
    } finally {
      setSavingToDrive(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Configuration Toggle */}
      <div className="flex justify-end px-2">
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className={cn(
            "flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md group border",
            showConfig 
              ? "bg-amber-500 text-white border-amber-400" 
              : "glass text-[var(--text-primary)] border-[var(--glass-border)] hover:bg-[var(--sidebar-active)]"
          )}
        >
          <Settings2 className={cn("w-4 h-4", showConfig ? "animate-spin" : "group-hover:rotate-45 transition-transform")} />
          <span>{showConfig ? "TUTUP KONFIGURASI" : "KONFIGURASI LAPORAN"}</span>
        </button>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-8 rounded-3xl border border-[var(--glass-border)] space-y-8 mt-2 shadow-2xl">
              <div>
                <h4 className="text-xs font-black text-sky-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Identitas Laporan & Sekolah
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Title & Year */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Judul Laporan</label>
                      <input 
                        type="text" 
                        value={config.title}
                        onChange={(e) => setConfig({...config, title: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Tahun Pelajaran</label>
                      <input 
                        type="text" 
                        value={config.year}
                        onChange={(e) => setConfig({...config, year: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Gov & Dept */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Pemerintah Provinsi</label>
                      <input 
                        type="text" 
                        value={config.prov}
                        onChange={(e) => setConfig({...config, prov: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Dinas Pendidikan</label>
                      <input 
                        type="text" 
                        value={config.dept}
                        onChange={(e) => setConfig({...config, dept: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* School Detail */}
                  <div className="space-y-4 lg:col-span-1">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Nama Sekolah</label>
                      <input 
                        type="text" 
                        value={config.schoolName}
                        onChange={(e) => setConfig({...config, schoolName: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-bold text-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Alamat Sekolah</label>
                      <input 
                        type="text" 
                        value={config.address}
                        onChange={(e) => setConfig({...config, address: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Contact & Misc */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Telp/Fax & Kode Pos</label>
                      <input 
                        type="text" 
                        value={config.contact}
                        onChange={(e) => setConfig({...config, contact: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Email & Website</label>
                      <input 
                        type="text" 
                        value={config.emailWeb}
                        onChange={(e) => setConfig({...config, emailWeb: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Signature Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Kepala Sekolah</label>
                      <input 
                        type="text" 
                        value={config.headmaster}
                        onChange={(e) => setConfig({...config, headmaster: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">NIP Kepala</label>
                      <input 
                        type="text" 
                        value={config.headmasterNip}
                        onChange={(e) => setConfig({...config, headmasterNip: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Date & City */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Kota</label>
                      <input 
                        type="text" 
                        value={config.city}
                        onChange={(e) => setConfig({...config, city: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-widest">Bulan/Tahun Tanda Tangan</label>
                      <input 
                        type="text" 
                        value={config.date}
                        onChange={(e) => setConfig({...config, date: e.target.value})}
                        className="w-full px-4 py-3 input-styled rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {printError && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-2 mb-4 bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-start gap-4"
          >
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600">
              <Printer className="w-5 h-5 font-bold" />
            </div>
            <div>
              <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">Pencetakan Terblokir di Mode Pratinjau</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Browser memblokir jendela cetak di dalam iframe ini. Untuk mencetak dengan lancar, silakan klik tombol **"Open in new tab"** (ikon panah keluar di pojok kanan atas layar) lalu coba cetak kembali dari tab baru tersebut.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end glass-card p-8 rounded-3xl">
        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 tracking-widest uppercase px-1">Pilih Kelas</label>
          <div className="relative">
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full appearance-none px-5 py-3 input-styled rounded-2xl text-sm"
            >
              <option value="" className="bg-[var(--bg-surface)]">-- Kelas --</option>
              {masterData.kelas.map(c => <option key={c.id} value={c.id} className="bg-[var(--bg-surface)]">{c.nama}</option>)}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 tracking-widest uppercase px-1">Mata Pelajaran</label>
          <div className="relative">
            <select 
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full appearance-none px-5 py-3 input-styled rounded-2xl text-sm font-medium"
            >
              <option value="" className="bg-[var(--bg-surface)]">-- Mapel --</option>
              {masterData.mapel.map(m => <option key={m.id} value={m.id} className="bg-[var(--bg-surface)]">{m.nama}</option>)}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="col-span-1">
          <label className="block text-[10px] font-bold text-[var(--text-muted)] mb-2 tracking-widest uppercase px-1">Simpan Di Folder Utama</label>
          <div className="relative">
            <select 
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full appearance-none px-5 py-3 input-styled rounded-2xl text-sm font-medium"
            >
              {loadingFolders ? (
                <option>Memuat folder...</option>
              ) : availableFolders.length > 0 ? (
                <>
                  {availableFolders.map(f => (
                    <option key={f.id} value={f.id} className="bg-[var(--bg-surface)]">{f.name}</option>
                  ))}
                </>
              ) : (
                <option value="">-- PSAJ Utama --</option>
              )}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col space-y-4">
          {/* Path Preview for Safety */}
          {selectedClassId && (
            <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-2xl p-4 space-y-2">
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Pratinjau Lokasi Simpan:</p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-[var(--text-secondary)]">
                <span className="bg-blue-500/10 px-2 py-1 rounded text-blue-500 border border-blue-500/10">
                   {availableFolders.find(f => f.id === selectedFolderId)?.name || "PSAJ Utama"}
                </span>
                <ChevronDown className="w-3 h-3 -rotate-90 text-slate-400" />
                <span className="bg-slate-500/10 px-2 py-1 rounded text-[var(--text-primary)] border border-white/5">{selectedClass?.jurusanId || "Umum"}</span>
                <ChevronDown className="w-3 h-3 -rotate-90 text-slate-400" />
                <span className="bg-amber-500/10 px-2 py-1 rounded text-amber-600 font-bold border border-amber-500/10">{selectedClass?.nama}</span>
                <ChevronDown className="w-3 h-3 -rotate-90 text-slate-400" />
                <span className="bg-emerald-500/10 px-2 py-1 rounded text-emerald-600 border border-emerald-500/10">
                   {selectedSubject?.kategori === "Kejuruan" ? "Kejuruan" : "Umum"}
                </span>
              </div>
              <p className="text-[9px] text-[var(--text-muted)] italic mt-1">
                *Sistem otomatis membuat sub-folder jika belum ada.
              </p>
            </div>
          )}

          <div className="flex space-x-3">
            <button 
              disabled={!selectedClassId || !selectedSubjectId || printing}
              onClick={() => handlePrint()}
              className="flex-1 flex items-center justify-center space-x-3 px-6 py-3.5 bg-[var(--sidebar-active)] border border-[var(--glass-border)] hover:bg-white/10 text-[var(--text-primary)] rounded-2xl text-[10px] font-black uppercase transition-all disabled:opacity-20 shadow-lg"
            >
              <Printer className={cn("w-4 h-4", printing && "animate-spin")} />
              <span>{printing ? 'MEMPROSES...' : 'UNDUH PDF'}</span>
            </button>
            <button 
              disabled={!selectedClassId || !selectedSubjectId || exporting}
              onClick={handleExcelExport}
              className="flex-1 flex items-center justify-center space-x-3 px-6 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all border border-emerald-500/20 disabled:opacity-20 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'PROSES...' : 'EXCEL'}</span>
            </button>
          </div>
          
          <button 
            disabled={!selectedClassId || !selectedSubjectId || savingToDrive}
            onClick={() => handleDriveSave()}
            className={cn(
              "w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-2xl text-[10px] font-black transition-all border-2 uppercase tracking-widest",
              savingToDrive ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-sky-600 hover:bg-sky-500 text-white border-sky-400/20 shadow-xl shadow-sky-600/20"
            )}
          >
            {savingToDrive ? <Cloud className="w-4 h-4 animate-bounce" /> : <FolderCheck className="w-4 h-4" />}
            <span>{savingToDrive ? 'MENGUNGGAH...' : 'SIMPAN KE GDRIVE'}</span>
          </button>

          {driveStatus && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "p-3 rounded-xl text-[10px] font-bold text-center",
                driveStatus.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              )}
            >
              {driveStatus.message}
            </motion.div>
          )}
        </div>
      </div>

      {selectedClassId && selectedSubjectId ? (
        <div className="mt-8 overflow-x-auto bg-[var(--bg-main)] p-12 rounded-[2.5rem] min-h-[900px] flex justify-center border border-[var(--glass-border)] shadow-inner scrollbar-thin">
          {/* Printable Report Component */}
          <div 
            ref={reportRef}
            className="w-[210mm] bg-white p-[15mm] shadow-[0_0_50px_rgba(0,0,0,0.3)] origin-top transform scale-90 lg:scale-100"
            style={{ minHeight: '297mm', fontFamily: '"Arial", sans-serif', color: '#000' }}
          >
            {/* Header SMK */}
            <div className="text-center mb-6 relative">
               <div className="flex justify-between items-center px-4 mb-2 border-b-2 border-black pb-2">
                 <img 
                   src={`${import.meta.env.VITE_API_URL || ''}/api/kemdikbud-logo`} 
                   alt="Logo Kemdikbud" 
                   className="w-16 h-16 object-contain" 
                   referrerPolicy="no-referrer"
                 />
                 <div className="flex-1 text-center font-serif leading-tight">
                    <p className="text-[13px] font-bold uppercase">{config.prov}</p>
                    <p className="text-[13px] font-bold uppercase">{config.dept}</p>
                    <p className="text-xl font-black uppercase mt-1 tracking-tighter">{config.schoolName}</p>
                    <p className="text-[9px] font-medium mt-1 leading-normal italic">{config.address}</p>
                    <p className="text-[9px] font-medium">{config.contact}</p>
                    <p className="text-[9px] font-medium">{config.emailWeb}</p>
                 </div>
                 <img 
                   src={`${import.meta.env.VITE_API_URL || ''}/api/school-logo`} 
                   alt="Logo SMK" 
                   className="w-20 h-20 object-contain" 
                   referrerPolicy="no-referrer"
                 />
               </div>
               
               <div className="mt-4">
                 <h3 className="text-sm font-bold uppercase underline decoration-2 underline-offset-4 tracking-tighter">{config.title}</h3>
                 <h3 className="text-sm font-bold uppercase mt-1">TAHUN PELAJARAN {config.year}</h3>
               </div>
            </div>

            {/* Meta Info */}
            <div className="flex justify-between items-end mb-4 px-2">
              <div className="flex-1">
                <table className="text-[11px] font-bold">
                  <tbody>
                    <tr>
                      <td className="pr-4 py-1">MATA PELAJARAN</td>
                      <td>: {selectedSubject?.nama.toUpperCase()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold">KELAS:</span>
                <span className="bg-yellow-300 px-4 py-1 text-xs font-black border border-black">{selectedClass?.nama.toUpperCase()}</span>
              </div>
            </div>

            {/* Main Table */}
            <table className="w-full border-collapse border border-black text-[10px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-black px-2 py-1 w-8">NO</th>
                  <th className="border border-black px-2 py-1 w-20">NIS</th>
                  <th className="border border-black px-4 py-1 text-left">NAMA SISWA</th>
                  <th className="border border-black px-2 py-1 w-10">JK</th>
                  <th className="border border-black px-2 py-1 w-24">N_Pengetahuan</th>
                  <th className="border border-black px-2 py-1 w-24">N_Praktik</th>
                  <th className="border border-black px-2 py-1 w-12">Ket</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  const grade = getGrade(student.id);
                  return (
                    <tr key={student.id}>
                      <td className="border border-black px-2 py-1 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black px-2 py-1 text-center">{student.nis}</td>
                      <td className="border border-black px-4 py-1">{student.nama.toUpperCase()}</td>
                      <td className="border border-black px-2 py-1 text-center">{student.jk}</td>
                      <td className="border border-black px-2 py-1 text-center">{grade?.pengetahuan || '-'}</td>
                      <td className="border border-black px-2 py-1 text-center">{grade?.praktik || '-'}</td>
                      <td className="border border-black px-2 py-1 text-center">-</td>
                    </tr>
                  );
                })}
                {/* Fill empty rows for aesthetics like in Excel */}
                  {Array.from({ length: Math.max(0, 35 - filteredStudents.length) }).map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td className="border border-black px-2 py-1 text-center">&nbsp;</td>
                      <td className="border border-black px-2 py-1">&nbsp;</td>
                      <td className="border border-black px-4 py-1">&nbsp;</td>
                      <td className="border border-black px-2 py-1">&nbsp;</td>
                      <td className="border border-black px-2 py-1">&nbsp;</td>
                      <td className="border border-black px-2 py-1">&nbsp;</td>
                      <td className="border border-black px-2 py-1">&nbsp;</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* Signature Area */}
            <div className="mt-12 grid grid-cols-2 text-[11px] font-bold px-4">
              <div className="space-y-16">
                 <div>
                    <p className="uppercase leading-none">Mengetahui:</p>
                    <p className="uppercase">Kepala Sekolah,</p>
                 </div>
                 <div className="leading-tight">
                    <p className="underline font-black text-xs uppercase">{config.headmaster}</p>
                    <p className="font-bold">NIP. {config.headmasterNip}</p>
                 </div>
              </div>
              <div className="space-y-16 text-right">
                 <div>
                    <p className="capitalize">{config.city}, {config.date}</p>
                    <p className="uppercase">Guru Mata Pelajaran,</p>
                 </div>
                 <div className="leading-tight">
                    <p className="underline font-black text-xs uppercase">
                      {currentUser ? 
                        `${currentUser.gelarDepan ? currentUser.gelarDepan + ' ' : ''}${currentUser.nama}${currentUser.gelarBelakang ? ', ' + currentUser.gelarBelakang : ''}` : 
                        'GURU MATA PELAJARAN'
                      }
                    </p>
                    <p className="font-bold">NIP. {currentUser?.nip || '.............................'}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl border border-dashed border-gray-300">
           <Table className="w-16 h-16 text-gray-200 mb-4" />
           <p className="text-gray-400 font-medium text-center max-w-xs">
             Silakan pilih Kelas dan Mata Pelajaran untuk melihat pratinjau laporan.
           </p>
        </div>
      )}
    </div>
  );
}
