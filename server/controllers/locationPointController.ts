import { Request, Response } from 'express';
import db from '../config/db.js';

const normalizeNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

export const getLocationPoint = async (req: Request, res: Response) => {
  const latitude = req.query.latitude as string;
  const longitude = req.query.longitude as string;
  
  const lat = normalizeNumber(latitude);
  const lon = normalizeNumber(longitude);
  
  if (lat === null || lon === null) {
    return res.status(400).json({ message: 'Latitude dan longitude harus valid' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM location_points WHERE latitude = ? AND longitude = ?',
      [lat, lon]
    );
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Location point not found' });
    }

    res.json((rows as any[])[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const createLocationPoint = async (req: Request, res: Response) => {
  const { latitude, longitude, name } = req.body;
  
  const lat = normalizeNumber(latitude);
  const lon = normalizeNumber(longitude);
  
  if (lat === null || lon === null || !name || !name.trim()) {
    return res.status(400).json({ message: 'Latitude, longitude, dan nama titik harus diisi' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO location_points (latitude, longitude, name) VALUES (?, ?, ?)',
      [lat, lon, name.trim()]
    );

    res.status(201).json({ 
      message: 'Location point created successfully',
      id: (result as any).insertId
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Titik dengan koordinat ini sudah ada' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
};

export const updateLocationPoint = async (req: Request, res: Response) => {
  const latitude = req.query.latitude as string;
  const longitude = req.query.longitude as string;
  const { name } = req.body;
  
  const lat = normalizeNumber(latitude);
  const lon = normalizeNumber(longitude);
  
  if (lat === null || lon === null || !name || !name.trim()) {
    return res.status(400).json({ message: 'Latitude, longitude, dan nama titik harus valid' });
  }

  try {
    const [result] = await db.query(
      'UPDATE location_points SET name = ? WHERE latitude = ? AND longitude = ?',
      [name.trim(), lat, lon]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Location point not found' });
    }

    res.json({ message: 'Location point updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const deleteLocationPoint = async (req: Request, res: Response) => {
  const latitude = req.query.latitude as string;
  const longitude = req.query.longitude as string;
  
  const lat = normalizeNumber(latitude);
  const lon = normalizeNumber(longitude);
  
  if (lat === null || lon === null) {
    return res.status(400).json({ message: 'Latitude dan longitude harus valid' });
  }

  try {
    await db.query(
      'DELETE FROM location_points WHERE latitude = ? AND longitude = ?',
      [lat, lon]
    );
    res.json({ message: 'Location point deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};
