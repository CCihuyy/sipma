# 📚 Dokumentasi Flow Sistem Presensi & Keterlambatan

## 1. SETUP AWAL (Admin/Dosen)

### Langkah 1: Buat Jadwal Kuliah
**Menu**: Admin → Manage Jadwal
- Pilih Semester (misal: Semester 4)
- Pilih Kelas (misal: PTIK D)
- Pilih Matakuliah yang sesuai semester (filter otomatis)
- Pilih Dosen
- Pilih Hari & Jam (misal: Senin 15:10 - 16:00)
- Pilih Ruangan
- **Submit**

Result: Jadwal tersimpan dengan status `is_open = 0` dan `session_opened_at = NULL`

---

### Langkah 2: Atur Kontrak Kuliah (WAJIB untuk aktifkan keterlambatan)
**Menu**: Dosen → Pengaturan Kelas
- Pilih Kelas & Matakuliah
- **Batas Keterlambatan**: Misal 15 menit
- **Kontrak Kuliah**: Isi deskripsi (misal: "Keterlambatan lebih dari 15 menit akan dicatat sebagai terlambat")
- **Simpan**

Result: Record di `kelas_settings` dibuat dengan:
- `kontrak_kuliah` = terisi (tidak kosong)
- `batas_keterlambatan` = 15 menit

**⚠️ PENTING**: Jika kontrak kuliah TIDAK diisi, sistem TIDAK akan hitung keterlambatan!

---

## 2. HARI JADWAL (Saat Kuliah Berlangsung)

### Langkah 3: Dosen Membuka Sesi
**Menu**: Dosen → Kelola Absensi
- Klik "Buka Sesi" pada jadwal yang sesuai

**Validasi Sistem:**
1. ✅ Apakah hari ini adalah hari jadwal? (Senin untuk jadwal Senin)
2. ✅ Apakah jam saat ini dalam window ±45 menit dari jam_mulai?
   - Jadwal 15:10 → Window: **14:25 - 15:55**
   - Bisa buka sesi hanya di range ini

**Jika Valid:**
```
UPDATE jadwal 
SET is_open = 1, session_opened_at = NOW() 
WHERE id = ?
```
- `session_opened_at` = Waktu eksak saat dosen buka sesi (misal: 15:14:30)
- Status button berubah menjadi "Tutup Sesi"

**Jika Tidak Valid:**
```
Error: "Sesi hanya dapat dibuka dalam window waktu 14:25 - 15:55 
(±45 menit dari jam 15:10). Waktu saat ini: 14:20"
```

---

### Langkah 4: Mahasiswa Submit Absensi
**Menu**: Mahasiswa → Submit Absensi

**Flow:**
1. Sistem fetch semua sesi yang `is_open = 1`
2. Mahasiswa pilih sesi dan klik "Kirim Absensi"
3. Pilih status: Hadir / Izin / Sakit
4. **Klik "Kirim Absensi"**

**Backend Process (`submitAttendance`):**

```
[STEP 1] Cek apakah session terbuka
├─ SELECT is_open FROM jadwal WHERE id = ?
└─ Jika is_open = 0 → ERROR

[STEP 2] Cek authorized (student di kelas ini)
├─ SELECT kelas_id FROM mahasiswa WHERE nim = ?
├─ Bandingkan dengan session.kelas_id
└─ Jika tidak cocok → ERROR

[STEP 3] Cek sudah absen hari ini?
├─ SELECT FROM presensi WHERE jadwal_id = ? AND nim = ? AND DATE(timestamp) = TODAY
└─ Jika ada → ERROR "Attendance already submitted"

[STEP 4] PENTING: Fetch kontrak kuliah
├─ SELECT batas_keterlambatan, kontrak_kuliah FROM kelas_settings
│  WHERE kelas_id = ? AND dosen_nidn = ? AND matakuliah_id = ?
├─ Jika tidak ada record → hasKontrakKuliah = false
├─ Jika ada tapi kontrak_kuliah kosong → hasKontrakKuliah = false
└─ Jika ada dan kontrak_kuliah terisi → hasKontrakKuliah = true

[STEP 5] Hitung keterlambatan (HANYA jika kontrak_kuliah ada)
├─ IF status = 'Hadir' AND session_opened_at EXISTS AND hasKontrakKuliah:
│  ├─ session_opened_at = 15:14:30
│  ├─ current_time = 15:47 (waktu mahasiswa submit)
│  ├─ minutes_passed = 33 menit
│  ├─ IF minutes_passed > batas_keterlambatan (15):
│  │  ├─ is_late = 1
│  │  └─ finalStatus = 'Terlambat'
│  └─ ELSE:
│     ├─ is_late = 0
│     └─ finalStatus = 'Hadir'
└─ ELSE (no kontrak or not Hadir):
   ├─ is_late = 0
   └─ finalStatus = status_yang_dipilih

[STEP 6] Simpan ke database
└─ INSERT INTO presensi 
   (jadwal_id, mahasiswa_nim, status, is_late, timestamp)
   VALUES (?, ?, finalStatus, is_late, NOW())

[STEP 7] Return response dengan debug info
└─ {
     "status": "Hadir" / "Terlambat" / "Izin" / "Sakit",
     "is_late": 1 / 0,
     "debug": {
       "has_kontrak_kuliah": true/false,
       "batas_keterlambatan": 15,
       "session_opened_at": "2026-04-20 15:14:30",
       "calculated_tardiness": 1/0
     }
   }
```

---

## 3. SKENARIO CONTOH

### Skenario A: Dengan Kontrak Kuliah ✅

**Setup:**
- Jadwal: Senin 15:10 - 16:00
- Kontrak Kuliah: ✅ SUDAH DIATUR (batas = 15 menit)

**Timeline:**
- 14:25 - 15:55: Window pembukaan sesi
- 15:14: Dosen buka sesi → `session_opened_at = 15:14:00`
- 15:29: Laksamana submit Hadir
  - Minutes passed: 15 menit (15:14 → 15:29)
  - 15 ≤ 15 ✅ → Status: **HADIR** ✓
- 15:30: Naila submit Hadir
  - Minutes passed: 16 menit (15:14 → 15:30)
  - 16 > 15 ❌ → Status: **TERLAMBAT** ⏰

---

### Skenario B: TANPA Kontrak Kuliah ❌

**Setup:**
- Jadwal: Senin 15:10 - 16:00
- Kontrak Kuliah: ❌ BELUM DIATUR (kosong)

**Timeline:**
- 15:14: Dosen buka sesi → `session_opened_at = 15:14:00`
- 15:29: Laksamana submit Hadir
  - `hasKontrakKuliah = false` (kontrak kosong)
  - Status: **HADIR** ✓ (keterlambatan TIDAK dihitung)
- 15:30: Naila submit Hadir
  - `hasKontrakKuliah = false`
  - Status: **HADIR** ✓ (keterlambatan TIDAK dihitung)

⚠️ **Keduanya tetap "Hadir" karena kontrak belum diatur!**

---

### Skenario C: Coba Buka Sesi di Luar Window ❌

**Setup:**
- Jadwal: Senin 15:10 - 16:00
- Window: 14:25 - 15:55

**Timeline:**
- 14:20 (belum masuk window): Dosen coba buka sesi
  - ERROR: "Sesi hanya dapat dibuka dalam window 14:25 - 15:55. Waktu saat ini: 14:20"
  - Sesi TIDAK dibuka
  
- 16:00 (sudah lewat window): Dosen coba buka sesi
  - ERROR: "Sesi hanya dapat dibuka dalam window 14:25 - 15:55. Waktu saat ini: 16:00"
  - Sesi TIDAK dibuka

---

## 4. FITUR LAIN

### Dosen Lihat Detail Absensi
**Menu**: Dosen → Kelola Absensi → Klik "Lihat Detail"

Tampilkan:
- ✅ Total Hadir / Izin / Sakit / Alpa / Belum Absen
- ✅ Daftar mahasiswa dengan status
- ✅ Badge "⏰ Terlambat" hanya jika:
  - `is_late = 1` AND `status = 'Hadir'`
  - (Bukan saat `status = 'Terlambat'` untuk menghindari double badge)

### Mahasiswa Lihat History Absensi
**Menu**: Mahasiswa → Attendance History

Tampilkan:
- Tanggal, Matakuliah, Status
- Badge "Terlambat" jika terlambat

---

## 5. SUMMARY ATURAN KETERLAMBATAN

| Kondisi | Hasil |
|---------|-------|
| Kontrak Kuliah kosong | Keterlambatan TIDAK dihitung |
| Kontrak Kuliah diisi | Keterlambatan dihitung dari session_opened_at |
| Minutes ≤ batas | Status = Hadir (is_late = 0) |
| Minutes > batas | Status = Terlambat (is_late = 1) |
| Bukan "Hadir" (Izin/Sakit) | is_late = 0 (tidak dihitung terlambat) |
| Sesi belum dibuka | Absensi tidak bisa disubmit |
| Sesi sudah ditutup | Absensi tidak bisa disubmit |

---

## 6. DEBUGGING TIPS

Jika ada issue, cek:

### 1. Database Check
```sql
-- Cek jadwal
SELECT id, hari, jam_mulai, is_open, session_opened_at 
FROM jadwal WHERE id = 123;

-- Cek kontrak kuliah
SELECT * FROM kelas_settings 
WHERE kelas_id = ? AND dosen_nidn = ? AND matakuliah_id = ?;

-- Cek presensi records
SELECT * FROM presensi 
WHERE jadwal_id = 123 AND DATE(timestamp) = CURDATE();
```

### 2. Server Console
Cek log dengan prefix `[PRESENSI]` di server console untuk melihat:
- klasSettings result
- hasKontrakKuliah value
- minutesPassedSinceOpen calculation

### 3. Browser Response
Cek Network tab → XHR/Fetch → Response:
```json
{
  "debug": {
    "has_kontrak_kuliah": true/false,
    "batas_keterlambatan": 15,
    "session_opened_at": "...",
    "calculated_tardiness": 1/0
  }
}
```

---

## 7. QUICK CHECKLIST

- [ ] Jadwal sudah dibuat?
- [ ] **Kontrak Kuliah sudah diatur?** (WAJIB untuk hitung keterlambatan)
- [ ] Dosen buka sesi dalam window ±45 menit?
- [ ] Mahasiswa submit absensi saat sesi terbuka?
- [ ] Cek database `kelas_settings.kontrak_kuliah` terisi?
- [ ] Cek debug log di server console?

---

**Catatan Penting:**
- Keterlambatan **HANYA** dihitung jika kontrak kuliah sudah diatur oleh dosen
- Jika Anda ingin semua mahasiswa dihitung terlambat tanpa perlu setup kontrak, silakan beri tahu agar saya ubah logiknya
