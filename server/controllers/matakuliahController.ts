import { Request, Response } from 'express';
import db from '../config/db.js';

export const getMataKuliah = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT id, code, name, sks, semester FROM matakuliah ORDER BY semester, name');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const createMataKuliah = async (req: Request, res: Response) => {
  const { code, name, sks, semester = 1 } = req.body;
  console.log(`[CREATE] code=${code}, name=${name}, sks=${sks}, semester=${semester}`);
  try {
    await db.query('INSERT INTO matakuliah (code, name, sks, semester) VALUES (?, ?, ?, ?)', [code, name, sks, semester]);
    res.status(201).json({ message: 'Mata Kuliah created successfully' });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Code already exists' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
};

export const updateMataKuliah = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, name, sks, semester = 1 } = req.body;
  console.log(`[UPDATE] id=${id}, code=${code}, name=${name}, sks=${sks}, semester=${semester}`);
  try {
    await db.query('UPDATE matakuliah SET code = ?, name = ?, sks = ?, semester = ? WHERE id = ?', [code, name, sks, semester, id]);
    res.json({ message: 'Mata Kuliah updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const deleteMataKuliah = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM matakuliah WHERE id = ?', [id]);
    res.json({ message: 'Mata Kuliah deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};
