import { Request, Response } from 'express';
import db from '../config/db.js';

// Get all attendance rules for a dosen's classes
export const getDosenPresensiRules = async (req: Request, res: Response) => {
  const { dosen_nidn } = req.params;
  try {
    const [rules] = await db.query(`
      SELECT pr.*, k.name as kelas_name, m.name as matakuliah_name, j.hari, j.jam_mulai, j.jam_selesai
      FROM presensi_rules pr
      JOIN kelas k ON pr.kelas_id = k.id
      JOIN jadwal j ON pr.jadwal_id = j.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      WHERE pr.dosen_nidn = ?
      ORDER BY k.name
    `, [dosen_nidn]) as any[];
    res.json(rules || []);
  } catch (error) {
    console.error('[getDosenPresensiRules] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};

// Get a specific presensi rule
export const getPresensiRule = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rule] = await db.query(`
      SELECT pr.*, k.name as kelas_name, m.name as matakuliah_name
      FROM presensi_rules pr
      JOIN kelas k ON pr.kelas_id = k.id
      JOIN jadwal j ON pr.jadwal_id = j.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      WHERE pr.id = ?
    `, [id]) as any[];
    res.json(rule?.[0] || null);
  } catch (error) {
    console.error('[getPresensiRule] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};

// Create or update attendance rules for a dosen's class
export const upsertPresensiRule = async (req: Request, res: Response) => {
  const { dosen_nidn, kelas_id, jadwal_id, toleransi_keterlambatan_menit, poin_hadir, poin_izin, poin_sakit, poin_alpa } = req.body;
  try {
    const [existing] = await db.query(
      'SELECT id FROM presensi_rules WHERE dosen_nidn = ? AND kelas_id = ? AND jadwal_id = ?',
      [dosen_nidn, kelas_id, jadwal_id]
    ) as any[];

    if (existing && (existing as any[]).length > 0) {
      // Update existing rule
      await db.query(
        `UPDATE presensi_rules 
         SET toleransi_keterlambatan_menit = ?, poin_hadir = ?, poin_izin = ?, poin_sakit = ?, poin_alpa = ?
         WHERE dosen_nidn = ? AND kelas_id = ? AND jadwal_id = ?`,
        [toleransi_keterlambatan_menit, poin_hadir, poin_izin, poin_sakit, poin_alpa, dosen_nidn, kelas_id, jadwal_id]
      );
      res.json({ message: 'Presensi rule updated successfully', id: (existing as any[])[0].id });
    } else {
      // Insert new rule
      const [result] = await db.query(
        `INSERT INTO presensi_rules (dosen_nidn, kelas_id, jadwal_id, toleransi_keterlambatan_menit, poin_hadir, poin_izin, poin_sakit, poin_alpa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [dosen_nidn, kelas_id, jadwal_id, toleransi_keterlambatan_menit, poin_hadir, poin_izin, poin_sakit, poin_alpa]
      ) as any;
      res.status(201).json({ message: 'Presensi rule created successfully', id: (result as any).insertId });
    }
  } catch (error) {
    console.error('[upsertPresensiRule] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};
