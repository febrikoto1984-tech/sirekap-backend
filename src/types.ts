export interface Student {
  id: string;
  nis: string;
  nama: string;
  jk: 'L' | 'P';
  kelasId: string;
}

export interface Class {
  id: string;
  nama: string;
  jurusanId: string;
}

export interface Major {
  id: string;
  nama: string;
}

export interface Subject {
  id: string;
  nama: string;
  kategori: 'Umum' | 'Kejuruan';
  hasPraktik: boolean;
}

export interface Grade {
  siswaId: string;
  mapelId: string;
  pengetahuan: number;
  praktik?: number;
  keterangan?: string;
}

export interface Teacher {
  id: string; // NIP
  nama: string;
  nip: string;
  nuptk: string;
  jk: string;
  mengajar: string; // List of subjects
  gelarDepan?: string;
  gelarBelakang?: string;
  role?: 'admin' | 'guru';
}

export interface AppSettings {
  logoUrl?: string;
  namaSekolah?: string;
  alamat?: string;
}

export interface MasterData {
  siswa: Student[];
  kelas: Class[];
  jurusan: Major[];
  mapel: Subject[];
  nilai: Grade[];
  guru: Teacher[];
  settings?: AppSettings;
}
