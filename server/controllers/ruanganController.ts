import { Request, Response } from 'express';
import db from '../config/db';

const normalizeNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

export const getRuangan = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query('SELECT * FROM ruangan ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

export const createRuangan = async (req: Request, res: Response) => {
  const { name, location, latitude, longitude, radius_meters } = req.body;
  const normalizedLatitude = normalizeNumber(latitude);
  const normalizedLongitude = normalizeNumber(longitude);
  const normalizedRadius = normalizeNumber(radius_meters) ?? 50;

  if (!name || !location || normalizedLatitude === null || normalizedLongitude === null) {
    return res.status(400).json({
      message: 'Nama, lokasi, latitude, dan longitude ruangan wajib diisi',
    });
  }

  if (normalizedRadius <= 0) {
    return res.status(400).json({
      message: 'Radius absensi harus lebih besar dari 0 meter',
    });
  }

  try {
    await db.query(
      'INSERT INTO ruangan (name, location, latitude, longitude, radius_meters) VALUES (?, ?, ?, ?, ?)',
      [name, location, normalizedLatitude, normalizedLongitude, normalizedRadius]
    );
    res.status(201).json({ message: 'Ruangan created successfully' });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Ruangan name already exists' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
};

export const updateRuangan = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location, latitude, longitude, radius_meters } = req.body;

  try {
    // If only name is provided (from map edit), fetch existing data and merge
    if (name && !location && latitude === undefined && longitude === undefined) {
      const [rows] = await db.query('SELECT * FROM ruangan WHERE id = ?', [id]);
      const existingRoom = (rows as any[])[0];
      
      if (!existingRoom) {
        return res.status(404).json({ message: 'Ruangan not found' });
      }

      // Update only the name
      await db.query(
        'UPDATE ruangan SET name = ? WHERE id = ?',
        [name, id]
      );
      return res.json({ message: 'Ruangan updated successfully' });
    }

    // Full update - requires all fields
    const normalizedLatitude = normalizeNumber(latitude);
    const normalizedLongitude = normalizeNumber(longitude);
    const normalizedRadius = normalizeNumber(radius_meters) ?? 50;

    if (!name || !location || normalizedLatitude === null || normalizedLongitude === null) {
      return res.status(400).json({
        message: 'Nama, lokasi, latitude, dan longitude ruangan wajib diisi',
      });
    }

    if (normalizedRadius <= 0) {
      return res.status(400).json({
        message: 'Radius absensi harus lebih besar dari 0 meter',
      });
    }

    await db.query(
      'UPDATE ruangan SET name = ?, location = ?, latitude = ?, longitude = ?, radius_meters = ? WHERE id = ?',
      [name, location, normalizedLatitude, normalizedLongitude, normalizedRadius, id]
    );
    res.json({ message: 'Ruangan updated successfully' });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Ruangan name already exists' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
};

export const deleteRuangan = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM ruangan WHERE id = ?', [id]);
    res.json({ message: 'Ruangan deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};