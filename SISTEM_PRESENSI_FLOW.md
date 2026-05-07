# 📋 ALUR MEKANISME SISTEM PRESENSI SIPMA

---

## 🏗️ ARSITEKTUR SISTEM

```
┌─────────────────────────────────────────────────────────────┐
│                     SISTEM PRESENSI SIPMA                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────┐    │
│  │   DOSEN          │         │    MAHASISWA         │    │
│  │  • Buka Sesi     │         │  • Lihat Jadwal      │    │
│  │  • Lihat Rekap   │         │  • Kirim Absensi     │    │
│  │  • Export PDF    │         │  • Lihat Riwayat     │    │
│  └────────┬─────────┘         └────────┬─────────────┘    │
│           │                            │                   │
│           └──────────────┬─────────────┘                   │
│                          │                                  │
│                   ┌──────▼──────┐                          │
│                   │  BACKEND    │                          │
│                   │  Express.js │                          │
│                   └──────┬──────┘                          │
│                          │                                  │
│           ┌──────────────┼──────────────┐                 │
│           │              │              │                 │
│      ┌────▼────┐  ┌──────▼──────┐  ┌───▼────┐           │
│      │ Jadwal  │  │  Presensi   │  │  Alpa  │           │
│      │ Manager │  │  Processor  │  │ Cron   │           │
│      └─────────┘  └─────────────┘  └────────┘           │
│                          │                                  │
│                   ┌──────▼──────┐                          │
│                   │   MySQL     │                          │
│                   │  DATABASE   │                          │
│                   └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ FLOW UTAMA SISTEM

### A. FASE PERSIAPAN (Admin/Dosen)

```
┌─────────────────────────────────────────────────────────────┐
│ ADMIN MEMBUAT JADWAL KELAS                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Admin masuk ke /admin                                   │
│ 2. Menu "Kelola Jadwal"                                    │
│ 3. Isi form:                                               │
│    - Kelas: PTIK D                                         │
│    - Matakuliah: Analisis Desain Sistem                    │
│    - Dosen: Drs. Ahmad                                     │
│    - Hari: Rabu                                            │
│    - Jam: 16:25 - 17:00                                    │
│    - Ruangan: Ruang 101                                    │
│ 4. Klik "Tambah Jadwal"                                    │
│                                                              │
│ DATABASE UPDATE:                                            │
│ INSERT INTO jadwal (                                        │
│   kelas_id=1, matakuliah_id=5, dosen_nidn=16,             │
│   hari='Rabu', jam_mulai='16:25', jam_selesai='17:00',    │
│   ruangan_id=1, is_open=0 ← BELUM DIBUKA                  │
│ )                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### B. FASE AKTIF (Dosen Buka Session)

```
┌─────────────────────────────────────────────────────────────┐
│ DOSEN MEMBUKA SESSION PRESENSI                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Dosen login: dosen.test@univ.ac.id                      │
│ 2. Menu "Kelola Presensi" (/dosen/attendance)             │
│ 3. Lihat jadwal Rabu 16:25 "Analisis Desain Sistem"       │
│ 4. Status: ❌ Tertutup (is_open=0)                        │
│ 5. Klik tombol "Buka Sesi" ✅                              │
│                                                              │
│ API CALL:                                                   │
│ POST /api/presensi/toggle/:jadwalId                        │
│ Payload: { action: "open" }                                │
│                                                              │
│ DATABASE UPDATE:                                            │
│ UPDATE jadwal SET                                          │
│   is_open = 1,                                            │
│   opened_at = NOW()  ← Timestamp buka session             │
│ WHERE id = 34                                             │
│                                                              │
│ RESPONSE:                                                   │
│ {                                                           │
│   "success": true,                                         │
│   "message": "Session dibuka",                            │
│   "session": {                                            │
│     "id": 34,                                             │
│     "is_open": 1,                                         │
│     "opened_at": "2026-05-07T16:25:00.000Z"              │
│   }                                                        │
│ }                                                           │
│                                                              │
│ STATUS DI UI:                                              │
│ ✅ Session TERBUKA - Dosen menunggu mahasiswa mengabsen   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### C. FASE PENGISIAN ABSENSI (Mahasiswa Submit)

```
┌─────────────────────────────────────────────────────────────┐
│ MAHASISWA MENGABSEN KEHADIRAN                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Mahasiswa login: mahasiswa.test@univ.ac.id             │
│ 2. Menu "Kirim Absensi" (/mahasiswa/submit-attendance)   │
│ 3. Lihat "Sesi Absensi Tersedia":                        │
│    ✅ Analisis Desain Sistem (16:25-17:00)              │
│    Status: ⏳ Belum Absen                               │
│ 4. Klik untuk membuka form                                │
│ 5. Pilih status:                                          │
│    - Hadir (memerlukan geolocation)                      │
│    - Izin (dengan alasan)                                │
│    - Sakit (dengan bukti)                                │
│ 6. Jika "Hadir", aktifkan lokasi GPS                     │
│ 7. Klik "Kirim Absensi"                                  │
│                                                              │
│ API CALL:                                                   │
│ POST /api/presensi/submit/34                             │
│ Payload: {                                                 │
│   nim: "240209501004",                                   │
│   status: "Hadir",                                        │
│   latitude: -7.2575,                                      │
│   longitude: 112.7521                                     │
│ }                                                           │
│                                                              │
│ DATABASE UPDATE:                                            │
│ INSERT INTO presensi (                                     │
│   jadwal_id=34,                                           │
│   mahasiswa_nim='240209501004',                          │
│   status='Hadir',                                         │
│   latitude=-7.2575,                                       │
│   longitude=112.7521,                                     │
│   timestamp=NOW(),                                        │
│   is_late = 0  ← Cek jika <15 min dari jam mulai        │
│ )                                                          │
│                                                              │
│ RESPONSE:                                                   │
│ {                                                           │
│   "success": true,                                         │
│   "message": "Absensi berhasil dikirim",                │
│   "status": "Hadir",                                      │
│   "is_late": 0,                                          │
│   "timestamp": "2026-05-07T16:28:00.000Z"               │
│ }                                                           │
│                                                              │
│ UI STATUS:                                                  │
│ ✅ SUDAH ABSEN - Naila Nursyifa Nasir (Hadir)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### D. FASE AUTO-MARK ALPA (Cron Job)

```
┌─────────────────────────────────────────────────────────────┐
│ SISTEM OTOMATIS MARK ALPA (Setiap 1 Menit)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TRIGGER: node-cron schedule('* * * * *')                   │
│ WAKTU: 16:26 (1 menit setelah jadwal jam 16:25 dimulai)   │
│                                                              │
│ LOGIKA:                                                     │
│ 1. Cari semua jadwal yang:                                │
│    - opened_at ada & match dengan hari ini               │
│    - Jam selesai sudah lewat dari sekarang              │
│                                                              │
│ 2. Untuk setiap jadwal, cek mahasiswa yang:               │
│    - Terdaftar di kelas tersebut                         │
│    - BELUM mengabsen (tidak ada di tabel presensi)      │
│                                                              │
│ 3. Insert status "Alpa" untuk mereka                      │
│                                                              │
│ SQL QUERY:                                                  │
│ INSERT INTO presensi (                                     │
│   jadwal_id, mahasiswa_nim, status, timestamp             │
│ )                                                           │
│ SELECT j.id, m.nim, 'Alpa', NOW()                        │
│ FROM jadwal j                                             │
│ JOIN kelas k ON j.kelas_id = k.id                        │
│ JOIN mahasiswa m ON m.kelas_id = k.id                    │
│ WHERE DATE(j.opened_at) = CURDATE()  ← Dibuka hari ini   │
│   AND j.jam_selesai < TIME(NOW())  ← Sudah selesai       │
│   AND NOT EXISTS (                   ← Belum absen         │
│     SELECT 1 FROM presensi p                             │
│     WHERE p.jadwal_id = j.id                            │
│       AND p.mahasiswa_nim = m.nim                        │
│       AND DATE(p.timestamp) = CURDATE()                 │
│   )                                                       │
│                                                              │
│ CONTOH HASIL:                                               │
│ Mahasiswa yang tidak absen dijam 16:25-17:00:           │
│ - Reski Sahri Ramdani (240209501011) → INSERT Alpa      │
│ - M. Laksamana Sheva (240209501071) → INSERT Alpa       │
│                                                              │
│ DATABASE UPDATE:                                            │
│ INSERT INTO presensi VALUES                              │
│ (NULL, 34, '240209501011', 'Alpa', NOW(), 0, NULL)      │
│ (NULL, 34, '240209501071', 'Alpa', NOW(), 0, NULL)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### E. FASE LIHAT HASIL REKAP (Dosen)

```
┌─────────────────────────────────────────────────────────────┐
│ DOSEN LIHAT REKAP PRESENSI                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Menu "Lihat Rekap" (/dosen/recap)                       │
│ 2. Pilih Jadwal atau biarkan kosong (tampil semua)        │
│ 3. Tampil tabel rekap:                                     │
│                                                              │
│ ┌─────────┬─────────────────────┬────────┬─────┬─────┬──────┐
│ │ Nama    │ NIM                 │ Hadir  │ Izin│ Sakit│ Alpa │
│ ├─────────┼─────────────────────┼────────┼─────┼─────┼──────┤
│ │ Naila   │ 240209501004        │  ✓ 1  │  0  │ 0   │  0   │
│ │ Reski   │ 240209501011        │  0    │  0  │ 0   │ ✓ 1  │
│ │ M. Lake │ 240209501071        │  0    │  0  │ 0   │ ✓ 1  │
│ │ Putri   │ 240209501081        │  ✓ 1  │  0  │ 0   │  0   │
│ └─────────┴─────────────────────┴────────┴─────┴─────┴──────┘
│                                                              │
│ 4. Tombol "Export PDF":                                     │
│    - Generate file PDF dengan tabel rekap                 │
│    - Filename: Attendance_Recap_PTIK_D.pdf               │
│                                                              │
│ API CALL:                                                   │
│ GET /api/presensi/recap/:kelasId                         │
│                                                              │
│ DATABASE QUERY:                                             │
│ SELECT                                                      │
│   m.nim, u.name,                                          │
│   COUNT(IF(p.status='Hadir',1,NULL)) as total_hadir,    │
│   COUNT(IF(p.status='Izin',1,NULL)) as total_izin,      │
│   COUNT(IF(p.status='Sakit',1,NULL)) as total_sakit,    │
│   COUNT(IF(p.status='Alpa',1,NULL)) as total_alpa        │
│ FROM mahasiswa m                                          │
│ JOIN users u ON m.user_id = u.id                         │
│ LEFT JOIN presensi p ON p.mahasiswa_nim = m.nim          │
│ WHERE m.kelas_id = 1                                      │
│ GROUP BY m.nim                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ TABEL DATABASE & RELASI

### Tabel Utama

```sql
╔═══════════════════════════════════════════════════════════════╗
║ JADWAL - Jadwal Perkuliahan                                   ║
╠═══════════════════════════════════════════════════════════════╣
║ id                 INT PRIMARY KEY                            ║
║ kelas_id           INT FK → kelas.id                          ║
║ matakuliah_id      INT FK → matakuliah.id                     ║
║ dosen_nidn         VARCHAR FK → dosen.nidn                    ║
║ hari               VARCHAR (Senin, Selasa, ...)              ║
║ jam_mulai          TIME (16:25)                               ║
║ jam_selesai        TIME (17:00)                               ║
║ ruangan_id         INT FK → ruangan.id                        ║
║ is_open            BOOLEAN (0=tutup, 1=terbuka)              ║
║ opened_at          DATETIME (timestamp buka session)          ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ PRESENSI - Record Absensi Mahasiswa                           ║
╠═══════════════════════════════════════════════════════════════╣
║ id                 INT PRIMARY KEY                            ║
║ jadwal_id          INT FK → jadwal.id                         ║
║ mahasiswa_nim      VARCHAR FK → mahasiswa.nim                 ║
║ status             VARCHAR (Hadir, Izin, Sakit, Alpa)        ║
║ latitude           DECIMAL (geolocation)                      ║
║ longitude          DECIMAL (geolocation)                      ║
║ timestamp          DATETIME (waktu submit/auto-mark)          ║
║ is_late            BOOLEAN (0=tepat waktu, 1=terlambat)      ║
║ keterangan         TEXT (alasan izin/sakit)                  ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ MAHASISWA - Data Mahasiswa                                    ║
╠═══════════════════════════════════════════════════════════════╣
║ nim                VARCHAR PRIMARY KEY                        ║
║ user_id            INT FK → users.id                          ║
║ name               VARCHAR                                    ║
║ kelas_id           INT FK → kelas.id                          ║
║ foto_url           VARCHAR                                    ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ KELAS - Data Kelas                                            ║
╠═══════════════════════════════════════════════════════════════╣
║ id                 INT PRIMARY KEY                            ║
║ name               VARCHAR (PTIK D, TI 1A, ...)              ║
║ semester           INT                                        ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ RUANGAN - Data Ruangan/Lokasi                                 ║
╠═══════════════════════════════════════════════════════════════╣
║ id                 INT PRIMARY KEY                            ║
║ name               VARCHAR (Ruang 101, Lab 2, ...)           ║
║ location           VARCHAR (Gedung A lantai 2, ...)          ║
║ latitude           DECIMAL (koordinat GPS)                    ║
║ longitude          DECIMAL (koordinat GPS)                    ║
║ radius_meters      INT (jarak toleransi, default 50m)        ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 3️⃣ API ENDPOINTS

### Presensi Routes

```javascript
// ════════════════════════════════════════════════════════════
// DOSEN: Manage Session (Open/Close)
// ════════════════════════════════════════════════════════════

GET /api/presensi/sessions
└─ Ambil semua jadwal dengan is_open = 1
└─ Return: Array[session]

POST /api/presensi/toggle/:jadwalId
├─ Body: { action: "open" | "close" }
├─ Update: jadwal.is_open, jadwal.opened_at
└─ Return: { success, message, session }

GET /api/presensi/sessions/detail/:jadwalId
└─ Detail session + daftar mahasiswa + status absensi
└─ Return: { session, students: [{nim, name, status}] }

// ════════════════════════════════════════════════════════════
// MAHASISWA: Submit Absensi & View Sessions
// ════════════════════════════════════════════════════════════

GET /api/presensi/sessions/mahasiswa/:nim
├─ Ambil jadwal yang terbuka & sesuai kelas mahasiswa
├─ Include: status absensi mahasiswa di setiap jadwal
└─ Return: Array[session + attendance_status]

POST /api/presensi/submit/:jadwalId
├─ Body: { nim, status, latitude?, longitude? }
├─ Validate: geolocation (jika status="Hadir")
├─ Insert: record ke tabel presensi
└─ Return: { success, status, is_late, timestamp }

// ════════════════════════════════════════════════════════════
// DOSEN: View & Export Rekap
// ════════════════════════════════════════════════════════════

GET /api/presensi/recap/:kelasId
├─ Ambil summary absensi semua mahasiswa di kelas
├─ Return: [{nim, name, total_hadir, total_izin, total_sakit, total_alpa}]
└─ Used by: ViewRecap component

GET /api/presensi/export-pdf/:kelasId
├─ Generate PDF dari data recap
├─ Headers: Content-Disposition: attachment
└─ Return: PDF file (download)

// ════════════════════════════════════════════════════════════
// INTERNAL: Auto-Mark Alpa (Cron)
// ════════════════════════════════════════════════════════════

POST /api/presensi/auto-mark-alpa
├─ Trigger: node-cron setiap 1 menit
├─ Logic: Mark Alpa untuk mahasiswa yang belum absen
└─ Called by: server.ts (background job)
```

---

## 4️⃣ KONDISI & VALIDATION

### Kapan Jadwal Tampil di "Kirim Absensi"?

```javascript
✅ HARUS MEMENUHI SEMUA SYARAT:
  1. Jadwal harus adalah_open = 1 (sudah dibuka dosen)
  2. Mahasiswa harus terdaftar di kelas jadwal tersebut
  3. Belum ada record presensi mahasiswa hari ini
  4. Jadwal belum selesai (jam_selesai > waktu sekarang)

❌ TIDAK AKAN TAMPIL JIKA:
  1. is_open = 0 (dosen belum buka session)
  2. Mahasiswa tidak ada di kelas
  3. Sudah mengabsen hari ini
  4. Jadwal sudah selesai
```

### Validasi Submit Absensi

```javascript
if (status === "Hadir") {
  ✅ WAJIB:
    - Aktifkan GPS (latitude & longitude)
    - Pastikan dalam radius ruangan (default 50 meter)
    
  ❌ ERROR JIKA:
    - GPS belum diaktifkan
    - Koordinat ruangan belum diatur admin
    - Jarak > radius ruangan
}

if (status === "Izin" || status === "Sakit") {
  ✅ OPSIONAL:
    - Bisa langsung submit tanpa GPS
    - Bisa submit dengan keterangan/bukti
}
```

### Logika Terlambat (is_late)

```javascript
// Saat submit absensi, cek:
const submitTime = new Date();
const jamMulai = parse(jadwal.jam_mulai); // 16:25

if (submitTime > jamMulai) {
  is_late = 1; // ⏰ Terlambat
} else {
  is_late = 0; // ✅ Tepat waktu
}

// Note: Batas keterlambatan default 15 menit
// Dari kelas_settings.batas_keterlambatan
```

---

## 5️⃣ FLOW DIAGRAM LENGKAP

```
START
  │
  ├─→ ADMIN BUAT JADWAL
  │   └─→ INSERT jadwal (is_open=0)
  │       │
  │       └─→ JADWAL DIBUAT
  │
  ├─→ DOSEN LOGIN
  │   └─→ Menu "Kelola Presensi"
  │       │
  │       ├─→ LIHAT STATUS:
  │       │   ✅ Terbuka (is_open=1)
  │       │   ❌ Tertutup (is_open=0)
  │       │
  │       └─→ KLIK "BUKA SESI"
  │           └─→ UPDATE jadwal SET is_open=1, opened_at=NOW()
  │               │
  │               └─→ ✅ SESSION TERBUKA
  │
  ├─→ MAHASISWA LOGIN
  │   └─→ Menu "Kirim Absensi"
  │       │
  │       └─→ QUERY: Jadwal dengan is_open=1 + terdaftar di kelas
  │           │
  │           ├─→ JKA JADWAL DITEMUKAN:
  │           │   ✅ Tampilkan di list
  │           │   └─→ Pilih & klik untuk buka form
  │           │
  │           └─→ JKA TIDAK DITEMUKAN:
  │               ❌ "Tidak ada sesi yang tersedia"
  │
  ├─→ MAHASISWA SUBMIT ABSENSI
  │   ├─→ Pilih status: Hadir / Izin / Sakit
  │   │
  │   ├─→ JKA "HADIR":
  │   │   ├─→ Aktifkan GPS
  │   │   ├─→ Validate: dalam radius ruangan?
  │   │   │   ├─→ YA: Lanjut ke submit
  │   │   │   └─→ TIDAK: ERROR "Jauh dari ruangan"
  │   │   └─→ POST /api/presensi/submit/jadwalId
  │   │
  │   ├─→ JKA "IZIN" / "SAKIT":
  │   │   └─→ POST /api/presensi/submit/jadwalId
  │   │
  │   └─→ SERVER:
  │       ├─→ Hitung is_late (apakah terlambat?)
  │       ├─→ INSERT INTO presensi
  │       └─→ RESPONSE: { success, status, timestamp }
  │           │
  │           └─→ UI BERUBAH:
  │               ✅ "Sudah Absen" (biru)
  │               Tombol DISABLED
  │
  ├─→ CRON JOB (setiap 1 menit)
  │   └─→ Cek jadwal yang:
  │       ├─→ opened_at = hari ini
  │       ├─→ jam_selesai sudah lewat
  │       └─→ Mahasiswa belum absen
  │           │
  │           └─→ AUTO INSERT Alpa ke tabel presensi
  │               │
  │               └─→ ✅ ALPA TERCATAT
  │
  ├─→ DOSEN LIHAT REKAP
  │   ├─→ Menu "Lihat Rekap"
  │   ├─→ QUERY recap dari database:
  │   │   SELECT nim, nama, count(Hadir), count(Izin), ...
  │   │   FROM presensi GROUP BY mahasiswa_nim
  │   │
  │   ├─→ TAMPILKAN TABEL:
  │   │   Nama | NIM | Hadir | Izin | Sakit | Alpa
  │   │
  │   └─→ TOMBOL "EXPORT PDF":
  │       ├─→ POST /api/presensi/export-pdf/:kelasId
  │       ├─→ Server generate PDF dengan pdfkit
  │       └─→ DOWNLOAD file PDF ke komputer dosen
  │
  ├─→ MAHASISWA LIHAT RIWAYAT
  │   ├─→ Menu "Riwayat Absensi"
  │   ├─→ Lihat status absensi mereka:
  │   │   ✅ Hadir (3x), ⏰ Terlambat (2x), 🟢 Izin (1x), 🔴 Alpa (1x)
  │   └─→ Detail: timestamp, geolocation, keterangan
  │
  └─→ END
```

---

## 6️⃣ DIAGRAM TIMELINE

```
TIMELINE JAM 16:25 - 17:00

16:20  ┌─────────────────────────────────────────┐
       │ Jadwal belum dibuka                     │
       │ is_open = 0                            │
       │ Mahasiswa: ❌ Tidak bisa absen        │
       └─────────────────────────────────────────┘

16:24  ┌─────────────────────────────────────────┐
       │ Dosen membuka session                  │
       │ Klik "Buka Sesi"                       │
       └─────────────────────────────────────────┘
              ↓
              UPDATE jadwal
              SET is_open = 1
              SET opened_at = 16:24:30

16:25  ┌─────────────────────────────────────────┐
       │ ✅ SESSION TERBUKA                     │
       │ is_open = 1                            │
       │ Mahasiswa: ✅ Bisa absen              │
       │ Status: "Belum Absen" (kuning)        │
       └─────────────────────────────────────────┘

16:28  ┌─────────────────────────────────────────┐
       │ Mahasiswa mulai submit absensi        │
       │ Naila: Submit Hadir                   │
       │ Putri: Submit Hadir                   │
       │ (Reski, Laksamana: belum)            │
       └─────────────────────────────────────────┘

16:35  ┌─────────────────────────────────────────┐
       │ CRON JOB berjalan                     │
       │ Cek: Jadwal sudah selesai?           │
       │ Masih berlangsung (jam_selesai=17:00) │
       │ Action: TIDAK auto-mark Alpa         │
       └─────────────────────────────────────────┘

17:00  ┌─────────────────────────────────────────┐
       │ ⏰ JADWAL SELESAI                      │
       │ jam_selesai = 17:00                   │
       │ Sesi ditutup otomatis                 │
       │ Belum ada Alpa (mungkin ada di    │
       │ CRON berikutnya pada 17:01)          │
       └─────────────────────────────────────────┘

17:01  ┌─────────────────────────────────────────┐
       │ CRON JOB berjalan lagi                │
       │ Cek: Jadwal sudah selesai?           │
       │ YA! (17:01 > jam_selesai 17:00)     │
       │ Mahasiswa belum absen: Reski, Laksa  │
       │ Action: INSERT Alpa untuk mereka     │
       └─────────────────────────────────────────┘
              ↓
              INSERT INTO presensi VALUES
              (NULL, 34, '240209501011', 'Alpa', NOW(), 0, NULL)
              (NULL, 34, '240209501071', 'Alpa', NOW(), 0, NULL)

SETELAH  ┌─────────────────────────────────────────┐
         │ REKAP FINAL:                           │
         │ Naila: Hadir ✅                        │
         │ Putri: Hadir ✅                        │
         │ Reski: Alpa ❌                         │
         │ Laksamana: Alpa ❌                     │
         └─────────────────────────────────────────┘
```

---

## 7️⃣ RINGKASAN FLOW

| Tahap | Aktor | Action | Database | Status |
|-------|-------|--------|----------|--------|
| 1 | Admin | Buat jadwal | INSERT jadwal (is_open=0) | ❌ Tertutup |
| 2 | Dosen | Buka sesi | UPDATE jadwal (is_open=1) | ✅ Terbuka |
| 3 | Mahasiswa | Lihat jadwal | SELECT dengan is_open=1 | 👀 Terlihat |
| 4 | Mahasiswa | Submit absensi | INSERT presensi | ✅ Tercatat |
| 5 | Sistem (Cron) | Auto-mark Alpa | INSERT presensi (Alpa) | 🔴 Alpa |
| 6 | Dosen | Lihat rekap | SELECT + COUNT presensi | 📊 Rekap |
| 7 | Dosen | Export PDF | Generate file PDF | 📄 File |

---

## 📞 KESIMPULAN

**Sistem Presensi bekerja dengan 3 tahap utama:**

1. **OPEN** → Dosen buka session (is_open=1)
2. **SUBMIT** → Mahasiswa submit absensi (INSERT presensi)
3. **AUTO-MARK** → Sistem auto-mark Alpa untuk yang tidak absen (Cron)

**Key Point:**
- Mahasiswa HANYA bisa absen jika **dosen sudah membuka session**
- Alpa otomatis tercatat setelah jadwal selesai (via Cron)
- Semua tercatat di database dengan timestamp untuk audit trail

---

