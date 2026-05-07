-- Add semester support to kelas and jadwal tables
-- Allows organizing schedules by semester/academic year

-- Add semester column to kelas table
ALTER TABLE `kelas` ADD COLUMN `semester` INT DEFAULT 1 AFTER `name`;

-- Add status column to kelas for easier management
ALTER TABLE `kelas` ADD COLUMN `is_active` TINYINT(1) DEFAULT 1 AFTER `semester`;

-- Create index for faster queries by semester
ALTER TABLE `kelas` ADD INDEX `idx_semester` (`semester`);
