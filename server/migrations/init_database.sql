-- SQL schema for the siakad_db application
-- Run this in phpMyAdmin or MySQL CLI to create the database and tables.

CREATE DATABASE IF NOT EXISTS `siakad_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `siakad_db`;

CREATE TABLE IF NOT EXISTS `kelas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `matakuliah` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) UNIQUE NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `sks` INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `dosen` (
  `nidn` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ruangan` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `latitude` DECIMAL(10,7) DEFAULT NULL,
  `longitude` DECIMAL(10,7) DEFAULT NULL,
  `radius_meters` INT NOT NULL DEFAULT 50
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `mahasiswa` (
  `nim` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `semester` INT NOT NULL DEFAULT 1,
  `kelas_id` INT,
  `foto_url` VARCHAR(255),
  `password` VARCHAR(255),
  FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `jadwal` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `kelas_id` INT NOT NULL,
  `matakuliah_id` INT NOT NULL,
  `dosen_nidn` VARCHAR(50) NOT NULL,
  `hari` VARCHAR(50) NOT NULL,
  `jam_mulai` TIME NOT NULL,
  `jam_selesai` TIME NOT NULL,
  `is_open` TINYINT(1) NOT NULL DEFAULT 0,
  `ruangan_id` INT DEFAULT NULL,
  FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`matakuliah_id`) REFERENCES `matakuliah`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dosen_nidn`) REFERENCES `dosen`(`nidn`) ON DELETE CASCADE,
  FOREIGN KEY (`ruangan_id`) REFERENCES `ruangan`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','dosen','mahasiswa') NOT NULL,
  `reference_id` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `presensi` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `jadwal_id` INT NOT NULL,
  `mahasiswa_nim` VARCHAR(50) NOT NULL,
  `status` ENUM('Hadir','Izin','Sakit','Alpa') NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_session_student_date` (`jadwal_id`, `mahasiswa_nim`),
  FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`mahasiswa_nim`) REFERENCES `mahasiswa`(`nim`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Password: admin123
INSERT INTO `users` (`email`, `password`, `role`)
VALUES ('admin@siakad.com', '$2b$10$s5iYf.1ORRVpQsPc5Cl7IuHXcATg.qqvawhieZiWiFgfJe8aZlO7q', 'admin')
ON DUPLICATE KEY UPDATE `password` = VALUES(`password`);
