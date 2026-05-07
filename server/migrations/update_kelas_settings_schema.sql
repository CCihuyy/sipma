-- Update kelas_settings to support multiple dosen per class with matakuliah context
-- Remove UNIQUE(kelas_id) and add matakuliah_id for proper multi-dosen support

-- Step 1: Drop the foreign key constraint first
ALTER TABLE `kelas_settings` DROP FOREIGN KEY `kelas_settings_ibfk_1`;

-- Step 2: Drop old UNIQUE constraint on kelas_id
ALTER TABLE `kelas_settings` DROP INDEX `kelas_id`;

-- Step 3: Recreate foreign key for kelas_id (without requiring uniqueness on kelas_id alone)
ALTER TABLE `kelas_settings` ADD CONSTRAINT `kelas_settings_ibfk_1` 
  FOREIGN KEY (`kelas_id`) REFERENCES `kelas`(`id`) ON DELETE CASCADE;

-- Step 4: Add new composite UNIQUE key (dosen_nidn, kelas_id, matakuliah_id)
ALTER TABLE `kelas_settings` ADD UNIQUE KEY `uk_dosen_kelas_matakuliah` 
  (`dosen_nidn`, `kelas_id`, `matakuliah_id`);

-- Step 5: Populate matakuliah_id from jadwal table for existing records that don't have it
UPDATE kelas_settings ks
SET ks.matakuliah_id = (
  SELECT DISTINCT j.matakuliah_id FROM jadwal j
  WHERE j.dosen_nidn = ks.dosen_nidn AND j.kelas_id = ks.kelas_id
  LIMIT 1
)
WHERE ks.matakuliah_id IS NULL;


