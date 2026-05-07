ALTER TABLE matakuliah ADD COLUMN semester INT DEFAULT 1 AFTER sks;
CREATE INDEX idx_semester ON matakuliah(semester);
