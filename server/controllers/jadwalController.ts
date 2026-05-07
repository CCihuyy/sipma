import { Request, Response } from 'express';
import db from '../config/db.js';

export const getJadwal = async (req: Request, res: Response) => {
  try {
    let query = `
          SELECT j.id, j.kelas_id, j.matakuliah_id, j.dosen_nidn, j.hari, j.jam_mulai, j.jam_selesai, j.is_open, j.ruangan_id,
            k.name as kelas_name, k.semester as kelas_semester, 
            m.name as matakuliah_name, m.semester as matakuliah_semester, m.code as matakuliah_code, 
            d.name as dosen_name, r.name as ruangan_name, r.location as ruangan_location,
            r.latitude as ruangan_latitude, r.longitude as ruangan_longitude, r.radius_meters as ruangan_radius_meters
      FROM jadwal j
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      JOIN dosen d ON j.dosen_nidn = d.nidn
      LEFT JOIN ruangan r ON j.ruangan_id = r.id
      ORDER BY m.semester, j.hari
    `;
    const params: any[] = [];
    
    if (req.query.dosen_nidn) {
      query = query.replace('ORDER BY', 'WHERE j.dosen_nidn = ? ORDER BY');
      params.push(req.query.dosen_nidn);
      console.log(`[getJadwal] Querying with dosen_nidn=${req.query.dosen_nidn}`);
    } else {
      console.log(`[getJadwal] Querying all jadwal (no filter)`);
    }
    
    const [rows] = await db.query(query, params);
    console.log(`[getJadwal] Found ${(rows as any[]).length} results`);
    res.json(rows);
  } catch (error) {
    console.error('[getJadwal] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const createJadwal = async (req: Request, res: Response) => {
  const { kelas_id, matakuliah_id, dosen_nidn, hari, jam_mulai, jam_selesai, ruangan_id } = req.body;
  try {
    await db.query(
      'INSERT INTO jadwal (kelas_id, matakuliah_id, dosen_nidn, hari, jam_mulai, jam_selesai, ruangan_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [kelas_id, matakuliah_id, dosen_nidn, hari, jam_mulai, jam_selesai, ruangan_id]
    );
    res.status(201).json({ message: 'Jadwal created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const updateJadwal = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { kelas_id, matakuliah_id, dosen_nidn, hari, jam_mulai, jam_selesai, ruangan_id } = req.body;
  try {
    await db.query(
      'UPDATE jadwal SET kelas_id = ?, matakuliah_id = ?, dosen_nidn = ?, hari = ?, jam_mulai = ?, jam_selesai = ?, ruangan_id = ? WHERE id = ?',
      [kelas_id, matakuliah_id, dosen_nidn, hari, jam_mulai, jam_selesai, ruangan_id, id]
    );
    res.json({ message: 'Jadwal updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const deleteJadwal = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM jadwal WHERE id = ?', [id]);
    res.json({ message: 'Jadwal deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const getJadwalMahasiswa = async (req: Request, res: Response) => {
  const { nim } = req.params;
  const { hari } = req.query;
  try {
    let query = `
          SELECT j.id, j.kelas_id, j.matakuliah_id, j.dosen_nidn, j.hari, j.jam_mulai, j.jam_selesai, j.is_open, j.ruangan_id,
            k.name as kelas_name, k.semester as kelas_semester, 
            m.name as matakuliah_name, m.semester as matakuliah_semester, m.code as matakuliah_code,
            d.name as dosen_name, r.name as ruangan_name, r.location as ruangan_location,
            r.latitude as ruangan_latitude, r.longitude as ruangan_longitude, r.radius_meters as ruangan_radius_meters
      FROM jadwal j
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      JOIN dosen d ON j.dosen_nidn = d.nidn
      LEFT JOIN ruangan r ON j.ruangan_id = r.id
      WHERE j.kelas_id = (SELECT kelas_id FROM mahasiswa WHERE nim = ?)
    `;
    const params: any[] = [nim];
    
    if (hari) {
      query += ' AND j.hari = ?';
      params.push(hari);
      console.log(`[getJadwalMahasiswa] Querying with nim=${nim}, hari=${hari}`);
    } else {
      console.log(`[getJadwalMahasiswa] Querying with nim=${nim}`);
    }
    
    query += ' ORDER BY m.semester, j.jam_mulai ASC';
    const [rows] = await db.query(query, params);
    console.log(`[getJadwalMahasiswa] Found ${(rows as any[]).length} results`);
    res.json(rows);
  } catch (error) {
    console.error('[getJadwalMahasiswa] Error:', error);
    res.status(500).json({ message: 'Database error' });
  }
};
