import { Request, Response } from 'express';
import db from '../config/db.js';

const initializeTables = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`system_settings\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`tahun_akademik\` VARCHAR(10) NOT NULL DEFAULT '2024/2025',
        \`semester\` ENUM('Ganjil', 'Genap') NOT NULL DEFAULT 'Ganjil',
        \`tanggal_mulai\` DATE,
        \`tanggal_selesai\` DATE,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`uq_akademik_semester\` (\`tahun_akademik\`, \`semester\`)
      ) ENGINE=InnoDB
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`libur_akademik\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nama\` VARCHAR(255) NOT NULL,
        \`tanggal_mulai\` DATE NOT NULL,
        \`tanggal_selesai\` DATE NOT NULL,
        \`keterangan\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS \`presensi_rules\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`dosen_nidn\` VARCHAR(50) NOT NULL,
        \`kelas_id\` INT NOT NULL,
        \`jadwal_id\` INT NOT NULL,
        \`toleransi_keterlambatan_menit\` INT DEFAULT 10,
        \`poin_hadir\` INT DEFAULT 10,
        \`poin_izin\` INT DEFAULT 0,
        \`poin_sakit\` INT DEFAULT 5,
        \`poin_alpa\` INT DEFAULT -20,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`dosen_nidn\`) REFERENCES \`dosen\`(\`nidn\`) ON DELETE CASCADE,
        FOREIGN KEY (\`kelas_id\`) REFERENCES \`kelas\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`jadwal_id\`) REFERENCES \`jadwal\`(\`id\`) ON DELETE CASCADE,
        UNIQUE KEY \`uq_dosen_kelas_jadwal\` (\`dosen_nidn\`, \`kelas_id\`, \`jadwal_id\`)
      ) ENGINE=InnoDB
    `);

    // Insert default settings if none exist
    const [existing] = await db.query('SELECT COUNT(*) as cnt FROM system_settings') as any[];
    if ((existing as any[])[0]?.cnt === 0) {
      await db.query(
        'INSERT INTO system_settings (tahun_akademik, semester, tanggal_mulai, tanggal_selesai) VALUES (?, ?, ?, ?)',
        ['2024/2025', 'Ganjil', '2024-09-01', '2025-01-31']
      );
    }

    console.log('[initializeTables] Tables initialized successfully');
  } catch (error) {
    console.error('[initializeTables] Error:', error);
  }
};

// Initialize tables on startup
await initializeTables();

// Get current system settings
export const getSystemSettings = async (_req: Request, res: Response) => {
  try {
    const [settings] = await db.query(
      'SELECT * FROM system_settings ORDER BY updated_at DESC LIMIT 1'
    ) as any[];
    
    // If no settings exist, return default
    if (!settings || (settings as any[]).length === 0) {
      return res.json({
        tahun_akademik: '2024/2025',
        semester: 'Ganjil',
        tanggal_mulai: '2024-09-01',
        tanggal_selesai: '2025-01-31'
      });
    }
    
    res.json((settings as any[])[0] || {});
  } catch (error) {
    console.error('[getSystemSettings] Error:', error);
    // Return default settings if table doesn't exist
    res.json({
      tahun_akademik: '2024/2025',
      semester: 'Ganjil',
      tanggal_mulai: '2024-09-01',
      tanggal_selesai: '2025-01-31'
    });
  }
};

// Update system settings
export const updateSystemSettings = async (req: Request, res: Response) => {
  const { tahun_akademik, semester, tanggal_mulai, tanggal_selesai } = req.body;
  try {
    // Update the first (and usually only) setting record
    const [result] = await db.query(
      `UPDATE system_settings 
       SET tahun_akademik = ?, semester = ?, tanggal_mulai = ?, tanggal_selesai = ?
       WHERE id = 1`,
      [tahun_akademik, semester, tanggal_mulai, tanggal_selesai]
    ) as any;
    
    if ((result as any).affectedRows === 0) {
      // If no record exists, insert one
      await db.query(
        'INSERT INTO system_settings (id, tahun_akademik, semester, tanggal_mulai, tanggal_selesai) VALUES (1, ?, ?, ?, ?)',
        [tahun_akademik, semester, tanggal_mulai, tanggal_selesai]
      );
    }
    
    res.json({ message: 'System settings updated successfully' });
  } catch (error) {
    console.error('[updateSystemSettings] Error:', error);
    res.status(500).json({ message: 'Database error', error: String(error) });
  }
};

// Get all hari libur akademik
export const getLiburAkademik = async (_req: Request, res: Response) => {
  try {
    const [libur] = await db.query(
      'SELECT * FROM libur_akademik ORDER BY tanggal_mulai DESC'
    ) as any[];
    res.json((libur as any[]) || []);
  } catch (error) {
    console.error('[getLiburAkademik] Error:', error);
    // Return empty array if table doesn't exist or error occurs
    res.json([]);
  }
};

// Add hari libur akademik
export const addLiburAkademik = async (req: Request, res: Response) => {
  const { nama, tanggal_mulai, tanggal_selesai, keterangan } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO libur_akademik (nama, tanggal_mulai, tanggal_selesai, keterangan)
       VALUES (?, ?, ?, ?)`,
      [nama, tanggal_mulai, tanggal_selesai, keterangan || null]
    ) as any;
    
    res.status(201).json({ message: 'Hari libur added successfully', id: (result as any).insertId });
  } catch (error) {
    console.error('[addLiburAkademik] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};

// Update hari libur akademik
export const updateLiburAkademik = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nama, tanggal_mulai, tanggal_selesai, keterangan } = req.body;

  if (!nama || !tanggal_mulai || !tanggal_selesai) {
    return res.status(400).json({ message: 'nama, tanggal_mulai, dan tanggal_selesai wajib diisi' });
  }

  try {
    const [result] = await db.query(
      `UPDATE libur_akademik
       SET nama = ?, tanggal_mulai = ?, tanggal_selesai = ?, keterangan = ?
       WHERE id = ?`,
      [nama, tanggal_mulai, tanggal_selesai, keterangan || null, id]
    ) as any;

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Hari libur tidak ditemukan' });
    }

    res.json({ message: 'Hari libur berhasil diperbarui' });
  } catch (error) {
    console.error('[updateLiburAkademik] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};

// Delete hari libur akademik
export const deleteLiburAkademik = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM libur_akademik WHERE id = ?', [id]);
    res.json({ message: 'Hari libur deleted successfully' });
  } catch (error) {
    console.error('[deleteLiburAkademik] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};
