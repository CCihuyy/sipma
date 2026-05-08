
ALTER TABLE `kelas` ADD COLUMN `semester` INT DEFAULT 1 AFTER `name`;

ALTER TABLE `kelas` ADD COLUMN `is_active` TINYINT(1) DEFAULT 1 AFTER `semester`;

ALTER TABLE `kelas` ADD INDEX `idx_semester` (`semester`);
