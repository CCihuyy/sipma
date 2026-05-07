import { Request, Response } from 'express';
import db from '../config/db.js';
import bcrypt from 'bcrypt';

export const getDosen = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT nidn, name, email, foto_url FROM dosen');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const getDosenByNidn = async (req: Request, res: Response) => {
  const { nidn } = req.params;
  try {
    const [rows]: any = await db.query('SELECT nidn, name, email, foto_url FROM dosen WHERE nidn = ?', [nidn]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Dosen not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const createDosen = async (req: Request, res: Response) => {
  const { nidn, name, email, password } = req.body;
  try {
    await db.query('INSERT INTO dosen (nidn, name, email) VALUES (?, ?, ?)', [nidn, name, email]);
    // Also create user
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (email, password, role, reference_id) VALUES (?, ?, ?, ?)', [email, hashedPassword, 'dosen', nidn]);
    res.status(201).json({ message: 'Dosen created successfully' });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'NIDN or email already exists' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
};

export const updateDosen = async (req: Request, res: Response) => {
  const { nidn } = req.params;
  const { name, email, foto_url } = req.body;
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
    if (foto_url !== undefined) {
      updates.push('foto_url = ?');
      values.push(foto_url);
    }

    // Jika tidak ada field yang diupdate
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(nidn);
    const query = `UPDATE dosen SET ${updates.join(', ')} WHERE nidn = ?`;
    await db.query(query, values);
    res.json({ message: 'Dosen updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const deleteDosen = async (req: Request, res: Response) => {
  const { nidn } = req.params;
  try {
    // Get email first
    const [rows]: any = await db.query('SELECT email FROM dosen WHERE nidn = ?', [nidn]);
    if (rows.length > 0) {
      await db.query('DELETE FROM users WHERE email = ?', [rows[0].email]);
    }
    await db.query('DELETE FROM dosen WHERE nidn = ?', [nidn]);
    res.json({ message: 'Dosen deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};
