import { Request, Response } from 'express';
import db from '../config/db.js';

// Get class settings
export const getKelasSettings = async (req: Request, res: Response) => {
  try {
    const { kelas_id } = req.params;
    const [rows]: any = await db.query(
      `SELECT ks.*, k.name as kelas_name, d.name as dosen_name, m.name as matakuliah_name, m.code as matakuliah_code
       FROM kelas_settings ks
       LEFT JOIN kelas k ON ks.kelas_id = k.id
       LEFT JOIN dosen d ON ks.dosen_nidn = d.nidn
       LEFT JOIN matakuliah m ON ks.matakuliah_id = m.id
       WHERE ks.kelas_id = ?`,
      [kelas_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Kelas settings not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

// Get all settings by dosen
export const getKelasSettingsByDosen = async (req: Request, res: Response) => {
  try {
    const { dosen_nidn } = req.params;
    const [rows] = await db.query(
      `SELECT ks.*, k.name as kelas_name, d.name as dosen_name, m.name as matakuliah_name, m.code as matakuliah_code
       FROM kelas_settings ks
       LEFT JOIN kelas k ON ks.kelas_id = k.id
       LEFT JOIN dosen d ON ks.dosen_nidn = d.nidn
       LEFT JOIN matakuliah m ON ks.matakuliah_id = m.id
       WHERE ks.dosen_nidn = ?
       ORDER BY m.name, k.name`,
      [dosen_nidn]
    );
    
    res.json(rows || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

// Create or update class settings
export const updateKelasSettings = async (req: Request, res: Response) => {
  const { kelas_id } = req.params;
  const { dosen_nidn, matakuliah_id, batas_keterlambatan, kontrak_kuliah } = req.body;

  try {
    // Check if exists (by dosen_nidn + kelas_id + matakuliah_id)
    const [existing]: any = await db.query(
      'SELECT id FROM kelas_settings WHERE kelas_id = ? AND dosen_nidn = ? AND matakuliah_id = ?',
      [kelas_id, dosen_nidn, matakuliah_id]
    );

    if (existing.length > 0) {
      // Update
      await db.query(
        `UPDATE kelas_settings 
         SET batas_keterlambatan = ?, kontrak_kuliah = ?
         WHERE kelas_id = ? AND dosen_nidn = ? AND matakuliah_id = ?`,
        [batas_keterlambatan || 15, kontrak_kuliah, kelas_id, dosen_nidn, matakuliah_id]
      );
      res.json({ message: 'Kelas settings updated successfully' });
    } else {
      // Insert - will check unique constraint (dosen_nidn, kelas_id, matakuliah_id)
      await db.query(
        `INSERT INTO kelas_settings (kelas_id, dosen_nidn, matakuliah_id, batas_keterlambatan, kontrak_kuliah)
         VALUES (?, ?, ?, ?, ?)`,
        [kelas_id, dosen_nidn, matakuliah_id, batas_keterlambatan || 15, kontrak_kuliah]
      );
      res.status(201).json({ message: 'Kelas settings created successfully' });
    }
  } catch (error) {
    console.error(error);
    if ((error as any).code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        message: 'Settings untuk kombinasi Dosen + Kelas + Matakuliah sudah ada' 
      });
    }
    res.status(500).json({ message: 'Database error' });
  }
};

// Delete class settings
export const deleteKelasSettings = async (req: Request, res: Response) => {
  const { kelas_id } = req.params;

  try {
    await db.query(
      'DELETE FROM kelas_settings WHERE kelas_id = ?',
      [kelas_id]
    );
    res.json({ message: 'Kelas settings deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};
