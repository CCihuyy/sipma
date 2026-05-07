-- Migration for enhanced features: login, rooms, student/dosen details

-- Add table for rooms
CREATE TABLE IF NOT EXISTS ruangan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  radius_meters INT NOT NULL DEFAULT 50
);

ALTER TABLE ruangan
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS radius_meters INT NOT NULL DEFAULT 50;

-- Add room_id to jadwal
ALTER TABLE jadwal
  ADD COLUMN IF NOT EXISTS ruangan_id INT;

-- Add foreign key for ruangan_id if not exists
ALTER TABLE jadwal ADD CONSTRAINT fk_jadwal_ruangan FOREIGN KEY (ruangan_id) REFERENCES ruangan(id) ON DELETE SET NULL;

-- Add columns to mahasiswa
ALTER TABLE mahasiswa
  ADD COLUMN IF NOT EXISTS semester INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS kelas_id INT;

-- Add foreign key for kelas_id if not exists
ALTER TABLE mahasiswa ADD CONSTRAINT fk_mahasiswa_kelas FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE SET NULL;

-- Add columns to dosen
ALTER TABLE dosen
  ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Drop and recreate users table for authentication (to avoid conflicts)
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'dosen', 'mahasiswa') NOT NULL,
  reference_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO users (email, password, role) VALUES ('admin@siakad.com', '$2b$10$KixonQWAiwiqRhCLBYt6pOa9EW9zXC6xUF5mqF9wTzIQJtqVwmYuS', 'admin');

-- Note: Passwords should be hashed using bcrypt