import { Request, Response } from 'express';
import db from '../config/db.js';
import bcrypt from 'bcrypt';

export const getMahasiswa = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT nim, name, email, is_active, semester, foto_url, kelas_id FROM mahasiswa');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const getMahasiswaByNim = async (req: Request, res: Response) => {
  const { nim } = req.params;
  try {
    const [rows]: any = await db.query(`
      SELECT m.nim, m.name, m.email, m.semester, m.foto_url, k.name as kelas_name
      FROM mahasiswa m
      LEFT JOIN kelas k ON m.kelas_id = k.id
      WHERE m.nim = ?
    `, [nim]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Mahasiswa not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const createMahasiswa = async (req: Request, res: Response) => {
  const { nim, name, email, semester, kelas_id, foto_url, password, is_active } = req.body;
  console.log('Creating mahasiswa:', { nim, name, email, semester, kelas_id, foto_url, password });
  try {
    await db.query('INSERT INTO mahasiswa (nim, name, email, is_active, semester, kelas_id, foto_url) VALUES (?, ?, ?, ?, ?, ?, ?)', [nim, name, email, is_active !== undefined ? is_active : 1, semester || 1, kelas_id, foto_url || null]);
    // Also create user
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (email, password, role, reference_id) VALUES (?, ?, ?, ?)', [email, hashedPassword, 'mahasiswa', nim]);
    res.status(201).json({ message: 'Mahasiswa created successfully' });
  } catch (error: any) {
    console.error('Error creating mahasiswa:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'NIM or email already exists' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
};

export const updateMahasiswa = async (req: Request, res: Response) => {
  const { nim } = req.params;
  const { name, email, semester, kelas_id, foto_url, is_active } = req.body;
  try {
    // Build dynamic UPDATE query - hanya update field yang dikirim
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (semester !== undefined) {
      updates.push('semester = ?');
      values.push(semester);
    }
    if (kelas_id !== undefined) {
      updates.push('kelas_id = ?');
      values.push(kelas_id);
    }
    if (foto_url !== undefined) {
      updates.push('foto_url = ?');
      values.push(foto_url);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    // Jika tidak ada field yang diupdate
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(nim);
    const query = `UPDATE mahasiswa SET ${updates.join(', ')} WHERE nim = ?`;
    await db.query(query, values);
    res.json({ message: 'Mahasiswa updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const deleteMahasiswa = async (req: Request, res: Response) => {
  const { nim } = req.params;
  try {
    // Get email first
    const [rows]: any = await db.query('SELECT email FROM mahasiswa WHERE nim = ?', [nim]);
    if (rows.length > 0) {
      await db.query('DELETE FROM users WHERE email = ?', [rows[0].email]);
    }
    await db.query('DELETE FROM mahasiswa WHERE nim = ?', [nim]);
    res.json({ message: 'Mahasiswa deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};
