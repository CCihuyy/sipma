import { Request, Response } from 'express';
import db from '../config/db';

export const getStats = async (req: Request, res: Response) => {
  try {
    const [mahasiswaCount]: any = await db.query('SELECT COUNT(*) as count FROM mahasiswa');
    const [dosenCount]: any = await db.query('SELECT COUNT(*) as count FROM dosen');
    const [kelasCount]: any = await db.query('SELECT COUNT(*) as count FROM kelas');
    const [activeSessions]: any = await db.query('SELECT COUNT(*) as count FROM jadwal WHERE is_open = 1');

    const [statusRows]: any = await db.query(
      `
      SELECT status, COUNT(*) AS total
      FROM presensi
      WHERE DATE(timestamp) = CURDATE()
      GROUP BY status
      `
    );

    const statusMap: Record<string, number> = {
      Hadir: 0,
      Izin: 0,
      Sakit: 0,
      Alpa: 0,
    };

    statusRows.forEach((row: any) => {
      if (statusMap[row.status] !== undefined) {
        statusMap[row.status] = Number(row.total) || 0;
      }
    });

    const [kelasRows]: any = await db.query(
      `
      SELECT
        k.id,
        k.name,
        COUNT(p.id) AS total_presensi,
        SUM(CASE WHEN p.status = 'Hadir' THEN 1 ELSE 0 END) AS total_hadir
      FROM kelas k
      LEFT JOIN jadwal j ON j.kelas_id = k.id
      LEFT JOIN presensi p
        ON p.jadwal_id = j.id
       AND DATE(p.timestamp) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY k.id, k.name
      ORDER BY k.name ASC
      `
    );

    const kelasAttendance = kelasRows.map((row: any) => {
      const total = Number(row.total_presensi) || 0;
      const hadir = Number(row.total_hadir) || 0;
      const persentase = total > 0 ? Math.round((hadir / total) * 100) : 0;
      return {
        id: row.id,
        name: row.name,
        hadir,
        total,
        persentase,
      };
    });

    res.json({
      mahasiswa: mahasiswaCount[0].count,
      dosen: dosenCount[0].count,
      kelas: kelasCount[0].count,
      activeSessions: activeSessions[0].count,
      statusHariIni: statusMap,
      grafikKelas7Hari: kelasAttendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};