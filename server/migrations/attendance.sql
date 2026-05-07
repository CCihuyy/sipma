-- migration script for attendance feature

-- add flag to jadwal table to indicate whether the session is currently open
ALTER TABLE jadwal
  ADD COLUMN is_open TINYINT(1) NOT NULL DEFAULT 0;

-- table to store individual attendance records
CREATE TABLE presensi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jadwal_id INT NOT NULL,
  mahasiswa_nim VARCHAR(50) NOT NULL,
  status ENUM('Hadir','Izin','Sakit','Alpa') NOT NULL,
  timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_student_date (jadwal_id, mahasiswa_nim),
  FOREIGN KEY (jadwal_id) REFERENCES jadwal(id) ON DELETE CASCADE,
  FOREIGN KEY (mahasiswa_nim) REFERENCES mahasiswa(nim) ON DELETE CASCADE
);
