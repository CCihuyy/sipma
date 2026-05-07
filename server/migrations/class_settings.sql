-- Add class settings table for managing class rules
CREATE TABLE IF NOT EXISTS `kelas_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kelas_id` INT NOT NULL UNIQUE,
  `dosen_nidn` VARCHAR(50) NOT NULL,
  `batas_keterlambatan` INT NOT NULL DEFAULT 15 COMMENT '(dalam menit)',
  `kontrak_kuliah` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dosen_nidn`) REFERENCES `dosen`(`nidn`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Add is_late column to presensi table
ALTER TABLE `presensi` ADD COLUMN `is_late` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `presensi` ADD COLUMN `waktu_submit` DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Update jadwal to add opened_at and closed_at
ALTER TABLE `jadwal` ADD COLUMN `opened_at` DATETIME DEFAULT NULL;
ALTER TABLE `jadwal` ADD COLUMN `closed_at` DATETIME DEFAULT NULL;
