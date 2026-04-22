import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import ExcelJS from "exceljs";
import axios from "axios";
import { google } from "googleapis";
import { Readable } from "stream";

process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); });
process.on('unhandledRejection', (err) => { console.error('Unhandled Rejection:', err); });


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve public folder (favicon, etc.)
  app.use(express.static(path.join(process.cwd(), "public")));
  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "favicon.png"));
  });

  // Logo Proxy Route
  app.get("/api/school-logo", async (req, res) => {
    try {
      let targetUrl = "";
      
      try {
        const doc = await getSheet();
        const settingsSheet = doc.sheetsByTitle["Settings"] || doc.sheetsByTitle["Pengaturan"];
        if (settingsSheet) {
          const rows = await settingsSheet.getRows();
          const logoRow = rows.find(r => r.get('Key') === 'Logo Sekolah' || r.get('config') === 'Logo Sekolah');
          if (logoRow && (logoRow.get('Value') || logoRow.get('value'))) {
            targetUrl = logoRow.get('Value') || logoRow.get('value');
          }
        }
      } catch (e) {
        // Continue
      }

      // If a custom URL is provided in Settings, try to proxy it
      if (targetUrl) {
        try {
          const response = await axios({
            url: targetUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          res.setHeader('Content-Type', (response.headers['content-type'] as string) || 'image/png');
          return response.data.pipe(res);
        } catch (e) {
          console.error("Custom logo proxy failed:", e);
        }
      }

      // Fallback: Logo Sekolah
      const fallbackUrl = "https://cdn-sdotid.adg.id/images/30f30183-0ce3-442a-8c90-57eb86693d65_500x500.webp.png";
      const response = await axios({
        url: fallbackUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      res.setHeader('Content-Type', (response.headers['content-type'] as string) || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      response.data.pipe(res);
    } catch (error) {
      res.status(404).end();
    }
  });

  app.get("/api/kemdikbud-logo", async (req, res) => {
    try {
      let targetUrl = "https://media.neliti.com/media/organisations/logo-None-kemdikbud.png";
      
      try {
        const doc = await getSheet();
        const settingsSheet = doc.sheetsByTitle["Settings"] || doc.sheetsByTitle["Pengaturan"];
        if (settingsSheet) {
          const rows = await settingsSheet.getRows();
          const logoRow = rows.find(r => r.get('Key') === 'Logo Kemdikbud' || r.get('config') === 'Logo Kemdikbud');
          if (logoRow && (logoRow.get('Value') || logoRow.get('value'))) {
            targetUrl = logoRow.get('Value') || logoRow.get('value');
          }
        }
      } catch (e) {
        // Continue with default
      }

      const response = await axios({
        url: targetUrl,
        method: 'GET',
        responseType: 'stream',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      res.setHeader('Content-Type', (response.headers['content-type'] as string) || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      response.data.pipe(res);
    } catch (error) {
       try {
         const fallbackRes = await axios.get('https://picsum.photos/seed/kemdikbud/200/200', { responseType: 'stream' });
         res.setHeader('Content-Type', 'image/jpeg');
         fallbackRes.data.pipe(res);
       } catch (e) {
         res.status(404).end();
       }
    }
  });

  // Google Sheets Helper
  const getSheet = async (sheetId?: string) => {
    // Priority: 1. Argument, 2. Env Var, 3. User-provided fallback
    const id = sheetId || process.env.GOOGLE_SHEET_ID || "1sqw8bX_IweU-Ve0_NwkAjwpWnGKK0npDcq8oFwL0RVE";
    if (!id) throw new Error("Spreadsheet ID is missing. Mohon masukkan GOOGLE_SHEET_ID di menu Secrets.");
    
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "si-rekap-smk@sirekap2026.iam.gserviceaccount.com";
    
    // Advanced private key sanitization
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
    
    if (privateKey) {
      try {
        // Case: User accidentally pasted the entire JSON object
        if (privateKey.trim().startsWith('{')) {
          const json = JSON.parse(privateKey);
          privateKey = json.private_key || privateKey;
        }
      } catch (e) {
        // Not JSON, continue with string cleaning
      }

      // Restore newlines if they are escaped as literal "\n"
      privateKey = privateKey.replace(/\\n/g, "\n");
      
      // Remove any surrounding quotes
      privateKey = privateKey.trim().replace(/^['"]|['"]$/g, "");

      // Ensure the key has the correct PEM structure
      if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
        // If the header is missing, something is wrong, but we can try to wrap it if it looks like base64
        // However, it's safer to just warn.
      }
    }

    if (!serviceEmail || !privateKey) {
      console.error("Google Credentials Missing: Email or Private Key is empty");
      throw new Error("Google Service Account credentials missing");
    }

    const serviceAccountAuth = new JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
      ],
    });

    try {
      const doc = new GoogleSpreadsheet(id, serviceAccountAuth);
      await doc.loadInfo();
      return doc;
    } catch (error) {
      console.error("Google Sheets Error:", error);
      throw error;
    }
  };

  const getDrive = async () => {
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "si-rekap-smk@sirekap2026.iam.gserviceaccount.com";
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
    
    if (privateKey) {
      if (privateKey.trim().startsWith('{')) {
        try { privateKey = JSON.parse(privateKey).private_key || privateKey; } catch(e) {}
      }
      privateKey = privateKey.replace(/\\n/g, "\n").trim().replace(/^['"]|['"]$/g, "");
    }

    const auth = new JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
  };

  const findOrCreateFolder = async (drive: any, folderName: string, parentId?: string) => {
    let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const res = await drive.files.list({ 
      q: query, 
      fields: "files(id, name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    
    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id;
    }

    const createRes = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : []
      },
      fields: "id",
      supportsAllDrives: true
    });
    return createRes.data.id;
  };

  // API Routes
  app.get("/api/master-data", async (req, res) => {
    try {
      const doc = await getSheet();
      
      // Assume sheets are named "Siswa" or "Data", "Kelas", "Jurusan", "Mapel" or "Mata Pelajaran", "Guru"
      const sheetsConfig = {
        siswa: doc.sheetsByTitle["Siswa"] || doc.sheetsByTitle["Data"],
        kelas: doc.sheetsByTitle["Kelas"],
        jurusan: doc.sheetsByTitle["Jurusan"],
        mapel: doc.sheetsByTitle["Mapel"] || doc.sheetsByTitle["Mata Pelajaran"] || doc.sheetsByTitle["mapel"],
        nilai: doc.sheetsByTitle["Nilai"],
        guru: doc.sheetsByTitle["Guru"] || doc.sheetsByTitle["GURU"] || doc.sheetsByTitle["Data Guru"],
        settings: doc.sheetsByTitle["Settings"] || doc.sheetsByTitle["Pengaturan"],
      };

      const data: any = {
        siswa: [],
        kelas: [],
        jurusan: [],
        mapel: [],
        nilai: [],
        guru: [],
        settings: {}
      };
      
      for (const [key, sheet] of Object.entries(sheetsConfig)) {
        if (sheet) {
          const rows = await sheet.getRows();
          const rawData = rows.map(row => row.toObject());
          
          if (key === 'settings') {
            const settingsObj: any = {};
            rawData.forEach((row: any) => {
              if (row.Key || row.config) {
                settingsObj[row.Key || row.config] = row.Value || row.value;
              }
            });
            data[key] = settingsObj;
          } else if (key === 'siswa') {
            data[key] = rawData.map((row: any, index: number) => ({
              id: row.NIPD ? row.NIPD.toString() : (row.NISN ? row.NISN.toString() : `student-${index}`),
              nama: row.Siswa || row.Nama || row.nama,
              nis: row.NIPD || row.nis || '',
              nisn: row.NISN || '',
              jk: row.JK || row.jk || 'L',
              kelasId: row.Kelas || row.kelas || '',
              jurusan: row.Jurusan || row.jurusan || ''
            }));

            // If "Kelas" sheet is missing or empty, generate classes from "Data" sheet
            if (!sheetsConfig.kelas || (data['kelas'] && data['kelas'].length === 0)) {
              const uniqueClasses = Array.from(new Set(data[key].map((s: any) => s.kelasId))).filter(Boolean);
              data['kelas'] = uniqueClasses.map(c => ({
                id: c,
                nama: c,
                jurusanId: ''
              }));
            }
          } else if (key === 'guru') {
            data[key] = rawData.map((row: any, index: number) => ({
              id: row.NIP ? row.NIP.toString() : (row.NUPTK ? row.NUPTK.toString() : `teacher-${index}`),
              nama: row["Nama Guru"] || row.Nama || row.nama || '',
              nip: row.NIP || '',
              nuptk: row.NUPTK || '',
              jk: row.JK || '',
              mengajar: row.Mengajar || row.mengajar || '',
              gelarDepan: row["Gelar Depan"] || row.gelarDepan || '',
              gelarBelakang: row["Gelar Belakang"] || row.gelarBelakang || ''
            }));
          } else if (key === 'kelas') {
            data[key] = rawData.map((row: any) => ({
              id: row.id || row.ID || row.Nama || row.nama || '',
              nama: row.Nama || row.nama || row.id || '',
              jurusanId: row.Jurusan || row.jurusanId || ''
            }));
          } else if (key === 'mapel') {
            data[key] = rawData.map((row: any) => ({
              id: row.Nama || row.nama || row.id || row.ID || '',
              nama: row.Nama || row.nama || '',
              kategori: row.Kategori || row.kategori || 'Umum',
              hasPraktik: row.Praktik === 'Ya' || row.hasPraktik === true || row.Praktik === true
            }));
          } else {
            data[key] = rawData;
          }
        }
      }

      // 1. Ambil semua mata pelajaran unik dari sheet Nilai yang mungkin tidak ada di sheet Mapel
      if (sheetsConfig.nilai) {
        const nilaiRows = await sheetsConfig.nilai.getRows();
        const nilaiData = nilaiRows.map(r => r.toObject());
        const nilaiMapels = Array.from(new Set(nilaiData.map((n: any) => n.mapelId || n.Mapel))).filter(Boolean);
        
        nilaiMapels.forEach((m: any) => {
          const mapelName = m.toString();
          const exists = data.mapel.find((existing: any) => existing.id === mapelName || existing.nama === mapelName);
          if (!exists) {
            data.mapel.push({
              id: mapelName,
              nama: mapelName,
              kategori: 'Umum', // Default untuk mapel sisipan
              hasPraktik: true
            });
          }
        });
      }

      // 2. Ambil semua kelas unik dari sheet Nilai jika tidak ada di sheet Kelas
      if (sheetsConfig.nilai) {
        const nilaiData = (await sheetsConfig.nilai.getRows()).map(r => r.toObject());
        const nilaiClasses = Array.from(new Set(nilaiData.map((n: any) => n.kelasId || n.Kelas))).filter(Boolean);
        
        nilaiClasses.forEach((c: any) => {
          const className = c.toString();
          const exists = data.kelas.find((existing: any) => existing.id === className || existing.nama === className);
          if (!exists) {
            data.kelas.push({
              id: className,
              nama: className,
              jurusanId: ''
            });
          }
        });
      }

      // Final fallback for Mapel if still empty
      if (data.mapel.length === 0) {
        data.mapel = [
          { id: 'Matematika', nama: 'Matematika', kategori: 'Kejuruan', hasPraktik: false },
          { id: 'Bahasa Inggris', nama: 'Bahasa Inggris', kategori: 'Kejuruan', hasPraktik: false },
          { id: 'Informatika', nama: 'Informatika', kategori: 'Kejuruan', hasPraktik: true },
          { id: 'Projek IPAS', nama: 'Projek IPAS', kategori: 'Kejuruan', hasPraktik: true },
          { id: 'Dasar-Dasar Program Keahlian', nama: 'Dasar-Dasar Program Keahlian', kategori: 'Kejuruan', hasPraktik: true },
          { id: 'Konsentrasi Keahlian', nama: 'Konsentrasi Keahlian', kategori: 'Kejuruan', hasPraktik: true },
          { id: 'PKK', nama: 'PKK', kategori: 'Kejuruan', hasPraktik: true },
          { id: 'PKL', nama: 'PKL', kategori: 'Kejuruan', hasPraktik: true },
          { id: 'Mata Pelajaran Pilihan', nama: 'Mata Pelajaran Pilihan', kategori: 'Kejuruan', hasPraktik: true },
        ];
      }

      res.json({ ...data, spreadsheetId: doc.spreadsheetId });
    } catch (error: any) {
      console.error("Error in /api/master-data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/save-grades", async (req, res) => {
    try {
      const { grades, sheetId } = req.body;
      const doc = await getSheet(sheetId);
      const sheet = doc.sheetsByTitle["Nilai"];
      
      if (!sheet) throw new Error("Sheet 'Nilai' tidak ditemukan. Mohon buat tab 'Nilai' di Spreadsheet Anda.");

      const rows = await sheet.getRows();
      
      for (const grade of grades) {
        // Find existing record for this student and subject
        const existingRow = rows.find(r => 
          (r.get('siswaId') || r.get('NIPD') || r.get('NISN')) === grade.siswaId && 
          (r.get('mapelId') || r.get('Mata Pelajaran') || r.get('Mapel')) === grade.mapelId
        );

        if (existingRow) {
          // Update existing
          existingRow.set('pengetahuan', grade.pengetahuan);
          existingRow.set('praktik', grade.praktik);
          existingRow.set('updateAt', new Date().toISOString());
          await existingRow.save();
        } else {
          // Add new
          await sheet.addRow({
            siswaId: grade.siswaId,
            mapelId: grade.mapelId,
            pengetahuan: grade.pengetahuan,
            praktik: grade.praktik,
            updateAt: new Date().toISOString()
          });
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

function formatSAJWorkbook(worksheet: ExcelJS.Worksheet, meta: any) {
  const config = meta.config || {
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
  };

  // Header Section
  worksheet.mergeCells("A1:G1");
  worksheet.getCell("A1").value = config.prov;
  worksheet.getCell("A1").alignment = { horizontal: "center" };
  worksheet.getCell("A1").font = { bold: true };

  worksheet.mergeCells("A2:G2");
  worksheet.getCell("A2").value = config.dept;
  worksheet.getCell("A2").alignment = { horizontal: "center" };
  worksheet.getCell("A2").font = { bold: true };

  worksheet.mergeCells("A3:G3");
  worksheet.getCell("A3").value = config.schoolName;
  worksheet.getCell("A3").alignment = { horizontal: "center" };
  worksheet.getCell("A3").font = { bold: true, size: 14 };

  worksheet.mergeCells("A4:G4");
  worksheet.getCell("A4").value = config.address;
  worksheet.getCell("A4").alignment = { horizontal: "center" };
  worksheet.getCell("A4").font = { size: 9 };
  
  worksheet.mergeCells("A5:G5");
  worksheet.getCell("A5").value = `${config.contact} | ${config.emailWeb}`;
  worksheet.getCell("A5").alignment = { horizontal: "center" };
  worksheet.getCell("A5").font = { size: 8, italic: true };

  worksheet.addRow([]);
  
  const titleRowNo = worksheet.lastRow ? worksheet.lastRow.number + 1 : 7;
  worksheet.mergeCells(`A${titleRowNo}:G${titleRowNo}`);
  worksheet.getCell(`A${titleRowNo}`).value = config.title;
  worksheet.getCell(`A${titleRowNo}`).alignment = { horizontal: "center" };
  worksheet.getCell(`A${titleRowNo}`).font = { bold: true, underline: true };

  const yearRowNo = titleRowNo + 1;
  worksheet.mergeCells(`A${yearRowNo}:G${yearRowNo}`);
  worksheet.getCell(`A${yearRowNo}`).value = `TAHUN PELAJARAN ${config.year}`;
  worksheet.getCell(`A${yearRowNo}`).alignment = { horizontal: "center" };
  worksheet.getCell(`A${yearRowNo}`).font = { bold: true };

  worksheet.addRow([]);
  worksheet.addRow(["MATA PELAJARAN:", meta.mapel.toUpperCase(), "", "", "KELAS:", meta.kelas.toUpperCase()]);
}

function addSignatures(worksheet: ExcelJS.Worksheet, meta: any) {
  const config = meta.config || {
    headmaster: 'Ratnawilis, S.Pd, M.Si',
    headmasterNip: '197407072007012004',
    city: 'Lubuk Sikaping',
    date: 'Maret 2026'
  };

  worksheet.addRow([]);
  worksheet.addRow([]);
  
  const sigRow = worksheet.addRow(["Mengetahui:", "", "", "", `${config.city}, ${config.date}`]);
  worksheet.addRow(["Kepala Sekolah,", "", "", "", "Guru Mata Pelajaran,"]);
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow([]);
  
  const nameRow = worksheet.addRow([config.headmaster, "", "", "", meta.teacherName || "GURU MATA PELAJARAN"]);
  nameRow.getCell(1).font = { bold: true, underline: true };
  nameRow.getCell(5).font = { bold: true, underline: true };
  
  worksheet.addRow([`NIP. ${config.headmasterNip}`, "", "", "", `NIP. ${meta.teacherNip || '.........................'}`]);
}

  app.post("/api/export-excel", async (req, res) => {
    try {
      const { data, meta } = req.body;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("SAJ Report");

      formatSAJWorkbook(worksheet, meta);
      
      const headerRow = worksheet.addRow(["NO", "NIS", "NAMA SISWA", "JK", "N_Pengetahuan", "N_Praktik", "Ket"]);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.alignment = { horizontal: 'center' };
      });
      
      data.forEach((item: any, index: number) => {
        const row = worksheet.addRow([
          index + 1,
          item.nis,
          item.nama.toUpperCase(),
          item.jk,
          item.pengetahuan,
          item.praktik,
          item.keterangan || "-"
        ]);
        row.eachCell((cell) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      addSignatures(worksheet, meta);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=SAJ_Report.xlsx"
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive/folders", async (req, res) => {
    try {
      const drive = await getDrive();
      
      const rootFolderId = await (async () => {
        let idFromSettings = "";
        try {
          const doc = await getSheet();
          const settingsSheet = doc.sheetsByTitle["Settings"] || doc.sheetsByTitle["Pengaturan"];
          if (settingsSheet) {
            const rows = await settingsSheet.getRows();
            const row = rows.find(r => r.get('Key') === 'Drive Folder ID' || r.get('config') === 'Drive Folder ID');
            if (row) idFromSettings = row.get('Value') || row.get('value');
          }
        } catch(e) {}
        if (idFromSettings) return idFromSettings;

        const parentFolderName = "BERBAGI";
        const subFolderName = "60. PSAJ 2026";
        const parentRes = await drive.files.list({ 
          q: `name = '${parentFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: "files(id, name)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        
        if (parentRes.data.files && parentRes.data.files.length > 0) {
          const parentId = parentRes.data.files[0].id;
          const subRes = await drive.files.list({ 
            q: `name = '${subFolderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          });
          if (subRes.data.files && subRes.data.files.length > 0) return subRes.data.files[0].id;
        }

        const resAll = await drive.files.list({ 
          q: `name = '${subFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: "files(id, name)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        return resAll.data.files?.[0]?.id || null;
      })();

      if (!rootFolderId) return res.json([]);

      const subRes = await drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      res.json(subRes.data.files || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/save-to-drive", async (req, res) => {
    try {
      const { data, meta, selectedFolderId } = req.body;
      const drive = await getDrive();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("SAJ Report");

      formatSAJWorkbook(worksheet, meta);
      
      const headerRow = worksheet.addRow(["NO", "NIS", "NAMA SISWA", "JK", "N_Pengetahuan", "N_Praktik", "Ket"]);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.alignment = { horizontal: 'center' };
      });
      
      data.forEach((item: any, index: number) => {
        const row = worksheet.addRow([
          index + 1,
          item.nis,
          item.nama.toUpperCase(),
          item.jk,
          item.pengetahuan,
          item.praktik,
          item.keterangan || "-"
        ]);
        row.eachCell((cell) => {
          cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
      });

      addSignatures(worksheet, meta);

      // Buffer the Excel file
      const buffer = await workbook.xlsx.writeBuffer();

      const rootFolderId = selectedFolderId || await (async () => {
        // Try getting ID from settings first
        let idFromSettings = "";
        try {
          const doc = await getSheet();
          const settingsSheet = doc.sheetsByTitle["Settings"] || doc.sheetsByTitle["Pengaturan"];
          if (settingsSheet) {
            const rows = await settingsSheet.getRows();
            const row = rows.find(r => r.get('Key') === 'Drive Folder ID' || r.get('config') === 'Drive Folder ID');
            if (row) idFromSettings = row.get('Value') || row.get('value');
          }
        } catch(e) {}

        if (idFromSettings) return idFromSettings;

        // Hierarchical Search: Look for '60. PSAJ 2026' inside 'BERBAGI'
        try {
          const parentFolderName = "BERBAGI";
          const subFolderName = "60. PSAJ 2026";
          
          // 1. Find parent folder
          const parentRes = await drive.files.list({ 
            q: `name = '${parentFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          });
          
          if (parentRes.data.files && parentRes.data.files.length > 0) {
            const parentId = parentRes.data.files[0].id;
            
            // 2. Find sub folder inside parent
            const subRes = await drive.files.list({ 
              q: `name = '${subFolderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
              fields: "files(id, name)",
              supportsAllDrives: true,
              includeItemsFromAllDrives: true
            });
            
            if (subRes.data.files && subRes.data.files.length > 0) {
              return subRes.data.files[0].id;
            }
          }

          // Fallback: Search globally if hierarchy fails
          const res = await drive.files.list({ 
            q: `name = '${subFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: "files(id, name)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
          });
          
          if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
          }
          
          throw new Error(`Folder "${subFolderName}" tidak ditemukan di dalam "${parentFolderName}" atau belum dibagikan.`);
        } catch (e: any) {
          throw new Error(e.message || "Gagal mengakses folder Google Drive.");
        }
      })();

      const jurusanFolderId = await findOrCreateFolder(drive, meta.jurusan || "Umum", rootFolderId);
      const kelasFolderId = await findOrCreateFolder(drive, meta.kelas, jurusanFolderId);
      
      const mapelCategory = meta.kategori || "Umum";
      // Gunakan nama folder yang lebih simpel sesuai permintaan: "Umum" atau "Kejuruan"
      const categoryFolderName = mapelCategory === "Kejuruan" ? "Kejuruan" : "Umum";
      const finalFolderId = await findOrCreateFolder(drive, categoryFolderName, kelasFolderId);

      const fileName = `SAJ_${meta.kelas}_${meta.mapel}.xlsx`;
      const { force } = req.body;

      // Check if file already exists
      const existingFileRes = await drive.files.list({
        q: `name = '${fileName}' and '${finalFolderId}' in parents and trashed = false`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const existingFile = existingFileRes.data.files?.[0];

      if (existingFile && !force) {
        return res.json({ 
          exists: true, 
          fileName,
          message: "File sudah ada di Drive. Apakah Anda ingin menimpa (overwrite) file tersebut?" 
        });
      }

      // If exists and force is true, delete the old one first to "overwrite"
      if (existingFile && force) {
        await drive.files.delete({
          fileId: existingFile.id,
          supportsAllDrives: true
        });
      }

      // Upload to Drive
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [finalFolderId]
        },
        media: {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          body: Readable.from(Buffer.from(buffer))
        },
        supportsAllDrives: true
      });

      res.json({ success: true, folderId: finalFolderId, fileName, force });
    } catch (error: any) {
      console.error("Drive upload error:", error);
      let message = error.message;
      if (message.includes("storage quota")) {
        message = "Kuota Storage Service Account Habis. SOLUSI: Simpan folder '60. PSAJ 2026' di dalam 'DRIVE BERSAMA' (Shared Drive) sekolah, lalu bagikan akses Editor ke Service Account.";
      }
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
