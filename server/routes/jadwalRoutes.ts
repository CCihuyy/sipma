import express from 'express';
import { getJadwal, createJadwal, updateJadwal, deleteJadwal, getJadwalMahasiswa } from '../controllers/jadwalController.js';
import db from '../config/db.js';

const router = express.Router();

// Debug endpoint - MUST be before generic routes
router.get('/debug/all-data', async (_req: any, res: any) => {
  try {
    console.log('[Debug] START - Fetching all database info');
    
    // Get all dosen
    console.log('[Debug] Fetching all dosen...');
    const dosenResult = await db.query('SELECT nidn, name, email FROM dosen');
    const dosenRows = Array.isArray(dosenResult) ? dosenResult[0] : dosenResult;
    console.log('[Debug] Dosen rows:', dosenRows);
    
    // Get all jadwal (without join first to see raw data)
    console.log('[Debug] Fetching all jadwal...');
    const jadwalRawResult = await db.query('SELECT * FROM jadwal');
    const jadwalRaw = Array.isArray(jadwalRawResult) ? jadwalRawResult[0] : jadwalRawResult;
    console.log('[Debug] Jadwal raw data:', jadwalRaw);
    
    // Try joined query
    let jadwalJoined = [];
    try {
      const jadwalJoinedResult = await db.query(`
        SELECT j.id, j.dosen_nidn, j.hari, j.jam_mulai, j.jam_selesai,
               k.name as kelas_name, m.name as matakuliah_name, 
               d.name as dosen_name
        FROM jadwal j
        LEFT JOIN kelas k ON j.kelas_id = k.id
        LEFT JOIN matakuliah m ON j.matakuliah_id = m.id
        LEFT JOIN dosen d ON j.dosen_nidn = d.nidn
      `);
      jadwalJoined = (Array.isArray(jadwalJoinedResult) ? jadwalJoinedResult[0] : []) as any[];
    } catch (joinError) {
      console.error('[Debug] Join error (this is ok):', joinError);
    }
    
    // Get all users
    console.log('[Debug] Fetching all users...');
    const usersResult = await db.query('SELECT id, email, role, reference_id FROM users WHERE role = "dosen"');
    const usersRows = Array.isArray(usersResult) ? usersResult[0] : usersResult;
    console.log('[Debug] Users (dosen):', usersRows);
    
    console.log('[Debug] END - Sending response');
    res.json({
      success: true,
      dosen: dosenRows || [],
      jadwal_raw: jadwalRaw || [],
      jadwal_joined: jadwalJoined || [],
      users_dosen: usersRows || [],
      counts: {
        dosen_count: ((dosenRows as any[]) || []).length,
        jadwal_count: ((jadwalRaw as any[]) || []).length,
        users_dosen_count: ((usersRows as any[]) || []).length
      }
    });
  } catch (error) {
    console.error('[Debug] FATAL ERROR:', error);
    res.status(500).json({ 
      success: false,
      message: 'Database error',
      error: String(error)
    });
  }
});

router.get('/', getJadwal);
router.get('/dosen/:nidn', (req, res) => {
  // Redirect to getJadwal with dosen_nidn query param
  req.query.dosen_nidn = req.params.nidn;
  getJadwal(req, res);
});
router.get('/mahasiswa/:nim', getJadwalMahasiswa);
router.post('/', createJadwal);
router.put('/:id', updateJadwal);
router.delete('/:id', deleteJadwal);

export default router;
