-- System Settings and Dosen Presensi Rules
-- Add these tables to track global system settings and per-class attendance rules for dosen

CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tahun_akademik` VARCHAR(10) NOT NULL DEFAULT '2024/2025',
  `semester` ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
  `tanggal_mulai` DATE,
  `tanggal_selesai` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_akademik_semester` (`tahun_akademik`, `semester`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `libur_akademik` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(255) NOT NULL,
  `tanggal_mulai` DATE NOT NULL,
  `tanggal_selesai` DATE NOT NULL,
  `keterangan` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `presensi_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `dosen_nidn` VARCHAR(50) NOT NULL,
  `kelas_id` INT NOT NULL,
  `jadwal_id` INT NOT NULL,
  `toleransi_keterlambatan_menit` INT DEFAULT 10,
  `poin_hadir` INT DEFAULT 10,
  `poin_izin` INT DEFAULT 0,
  `poin_sakit` INT DEFAULT 5,
  `poin_alpa` INT DEFAULT -20,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`dosen_nidn`) REFERENCES `dosen`(`nidn`) ON DELETE CASCADE,
  FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_dosen_kelas_jadwal` (`dosen_nidn`, `kelas_id`, `jadwal_id`)
) ENGINE=InnoDB;

-- Insert default system settings if not exists
INSERT IGNORE INTO `system_settings` (`tahun_akademik`, `semester`, `tanggal_mulai`, `tanggal_selesai`)
VALUES ('2024/2025', 'Ganjil', '2024-09-01', '2025-01-31');
