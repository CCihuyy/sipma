
ALTER TABLE `presensi` 
MODIFY COLUMN `status` ENUM('Hadir','Terlambat','Izin','Sakit','Alpa') NOT NULL;

ALTER TABLE `presensi` 
ADD COLUMN IF NOT EXISTS `waktu_submit` DATETIME;
