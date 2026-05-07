import express from 'express';
import {
  getActiveSessions,
  getStudentSessions,
  toggleSession,
  getSessionAttendanceDetail,
  submitAttendance,
  getStudentHistory,
  exportAttendancePDF,
  getRecapData,
} from '../controllers/presensiController.js';

const router = express.Router();

// sessions that are currently open (all users)
router.get('/sessions', getActiveSessions);

// student gets sessions with their attendance status
router.get('/sessions/mahasiswa/:nim', getStudentSessions);

// teacher toggles session open/close
router.put('/sessions/:jadwalId/toggle', toggleSession);

// teacher sees today's attendance detail for selected session
router.get('/sessions/:jadwalId/attendance', getSessionAttendanceDetail);

// student submits attendance for a given jadwal/session
router.post('/submit/:jadwalId', submitAttendance);

// student retrieves their attendance history
router.get('/history/:nim', getStudentHistory);

// export recap PDF (teacher/admin)
router.get('/export/:kelasId', exportAttendancePDF);

// return recap data as JSON (used by frontend to render table)
router.get('/recap/:kelasId', async (req, res) => {
  try {
    const { kelasId } = req.params;
    const { matakuliahId } = req.query;
    const data = await getRecapData(Number(kelasId), matakuliahId ? Number(matakuliahId) : undefined);
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
});

export default router;
