ALTER TABLE `kelas_settings` ADD COLUMN IF NOT EXISTS `matakuliah_id` INT;

ALTER TABLE `kelas_settings` ADD CONSTRAINT IF NOT EXISTS `fk_kelas_settings_matakuliah` 
  FOREIGN KEY (`matakuliah_id`) REFERENCES `matakuliah`(`id`) ON DELETE CASCADE;
