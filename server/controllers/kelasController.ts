import { Request, Response } from 'express';
import db from '../config/db.js';

export const getKelas = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT id, name, semester, is_active FROM kelas');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const createKelas = async (req: Request, res: Response) => {
  const { name, semester, is_active } = req.body;
  try {
    await db.query('INSERT INTO kelas (name, semester, is_active) VALUES (?, ?, ?)', [name, semester || 4, is_active !== undefined ? is_active : 1]);
    res.status(201).json({ message: 'Kelas created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const updateKelas = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, semester, is_active } = req.body;
  try {
    await db.query('UPDATE kelas SET name = ?, semester = ?, is_active = ? WHERE id = ?', [name, semester, is_active, id]);
    res.json({ message: 'Kelas updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const deleteKelas = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM kelas WHERE id = ?', [id]);
    res.json({ message: 'Kelas deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};
