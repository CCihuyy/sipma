-- Add foto_url column to dosen table if not exists
ALTER TABLE dosen ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255) DEFAULT NULL;
