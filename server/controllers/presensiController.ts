import { Request, Response } from 'express';
import db from '../config/db.js';

// helper: make sure jadwal has an `is_open` column - migration instructions should be
// added in README or SQL script later.

// GET /api/presensi/sessions
// return all jadwal rows with is_open = 1 and some joined info
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT j.id as jadwal_id,
              j.ruangan_id,
             j.kelas_id,
             j.matakuliah_id,
             j.dosen_nidn,
             j.hari,
             j.jam_mulai,
             j.jam_selesai,
             j.opened_at,
             k.name AS kelas_name,
             m.name AS matakuliah_name,
             d.name AS dosen_name,
             r.name AS ruangan_name,
             r.location AS ruangan_location,
             r.latitude AS ruangan_latitude,
             r.longitude AS ruangan_longitude,
             r.radius_meters AS ruangan_radius_meters,
             ks.batas_keterlambatan,
             ks.kontrak_kuliah,
             IF(ks.kontrak_kuliah IS NOT NULL AND ks.kontrak_kuliah != '', 1, 0) AS has_kontrak_kuliah
      FROM jadwal j
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      JOIN dosen d ON j.dosen_nidn = d.nidn
      LEFT JOIN ruangan r ON j.ruangan_id = r.id
      LEFT JOIN kelas_settings ks ON j.kelas_id = ks.kelas_id 
        AND j.dosen_nidn = ks.dosen_nidn 
        AND j.matakuliah_id = ks.matakuliah_id
      WHERE j.is_open = 1
    `;
    const [rows]: any = await db.query(query);
    
    // Add status for each session
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayNum = now.getDay();
    const currentTime = currentHour * 60 + currentMinute;
    
    const HARI_MAP: { [key: string]: number } = {
      'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3,
      'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };
    
    const sessionsWithStatus = rows.map((session: any) => {
      const sessionDayNum = HARI_MAP[session.hari] ?? -1;
      const [sessionEndHour, sessionEndMinute] = (session.jam_selesai || '').split(':').map(Number);
      const sessionEndTime = sessionEndHour * 60 + sessionEndMinute;
      
      const isSessionEnded = 
        sessionDayNum < currentDayNum || 
        (sessionDayNum === currentDayNum && currentTime >= sessionEndTime);
      
      const status = isSessionEnded ? 'closed' : 'recording';
      
      return {
        ...session,
        status,
        batas_keterlambatan: session.batas_keterlambatan || 15
      };
    });
    
    res.json(sessionsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

// GET /api/presensi/sessions/mahasiswa/:nim
// return all sessions with student's attendance status for each
export const getStudentSessions = async (req: Request, res: Response) => {
  const { nim } = req.params;
  try {
    const query = `
      SELECT j.id as jadwal_id,
              j.ruangan_id,
             j.kelas_id,
             j.matakuliah_id,
             j.dosen_nidn,
             j.hari,
             j.jam_mulai,
             j.jam_selesai,
             j.opened_at,
             k.name AS kelas_name,
             m.name AS matakuliah_name,
             d.name AS dosen_name,
             r.name AS ruangan_name,
             r.location AS ruangan_location,
             r.latitude AS ruangan_latitude,
             r.longitude AS ruangan_longitude,
             r.radius_meters AS ruangan_radius_meters,
             ks.batas_keterlambatan,
             ks.kontrak_kuliah,
             IF(ks.kontrak_kuliah IS NOT NULL AND ks.kontrak_kuliah != '', 1, 0) AS has_kontrak_kuliah,
             p.status as attendance_status,
             p.is_late,
             p.timestamp as attendance_timestamp
      FROM jadwal j
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      JOIN dosen d ON j.dosen_nidn = d.nidn
      LEFT JOIN ruangan r ON j.ruangan_id = r.id
      LEFT JOIN kelas_settings ks ON j.kelas_id = ks.kelas_id 
        AND j.dosen_nidn = ks.dosen_nidn 
        AND j.matakuliah_id = ks.matakuliah_id
      LEFT JOIN presensi p ON j.id = p.jadwal_id AND p.mahasiswa_nim = ? AND DATE(p.timestamp) = CURDATE()
      WHERE j.is_open = 1 
      AND j.kelas_id = (SELECT kelas_id FROM mahasiswa WHERE nim = ?)
      ORDER BY j.hari, j.jam_mulai
    `;
    const [rows]: any = await db.query(query, [nim, nim]);
    
    // Add status for each session
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayNum = now.getDay();
    const currentTime = currentHour * 60 + currentMinute;
    
    const HARI_MAP: { [key: string]: number } = {
      'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3,
      'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };
    
    const sessionsWithStatus = rows.map((session: any) => {
      const sessionDayNum = HARI_MAP[session.hari] ?? -1;
      const [sessionEndHour, sessionEndMinute] = (session.jam_selesai || '').split(':').map(Number);
      const sessionEndTime = sessionEndHour * 60 + sessionEndMinute;
      
      const isSessionEnded = 
        sessionDayNum < currentDayNum || 
        (sessionDayNum === currentDayNum && currentTime >= sessionEndTime);
      
      const sessionStatus = isSessionEnded ? 'closed' : 'recording';
      const hasSubmitted = !!session.attendance_status;
      
      return {
        ...session,
        sessionStatus,
        hasSubmitted,
        batas_keterlambatan: session.batas_keterlambatan || 15,
        kontrak_kuliah: session.kontrak_kuliah || '',
      };
    });
    
    res.json(sessionsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

// PUT /api/presensi/sessions/:jadwalId/toggle
// switch the open/closed status of a jadwal (lecture session)
// Validate that lecturer can only open session during scheduled time (±45 minutes from jam_mulai)
export const toggleSession = async (req: Request, res: Response) => {
  const { jadwalId } = req.params;
  try {
    // read current value and jadwal info
    const [[current]]: any = await db.query(
      'SELECT is_open, hari, jam_mulai, jam_selesai, opened_at FROM jadwal WHERE id = ?',
      [jadwalId]
    );
    if (!current) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const now = new Date();
    const HARI_MAP: { [key: string]: number } = {
      'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3,
      'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };
    
    // Check if today is the correct day for this class
    const currentDayNum = now.getDay();
    const scheduledDayNum = HARI_MAP[current.hari] ?? -1;
    
    if (scheduledDayNum !== currentDayNum) {
      return res.status(400).json({ 
        message: `Cannot open session. This class is scheduled for ${current.hari}. Today is not the correct day.` 
      });
    }

    // Parse scheduled time
    const jamMulaiParts = (current.jam_mulai || '').split(':');
    const jamMulaiHour = parseInt(jamMulaiParts[0], 10);
    const jamMulaiMinute = parseInt(jamMulaiParts[1], 10);
    const scheduledStartTime = jamMulaiHour * 60 + jamMulaiMinute;
    
    // Get current time in minutes
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // Dosen can open session 5 minutes BEFORE scheduled time (for preparation)
    // Up to 45 minutes AFTER scheduled time
    const WINDOW_BEFORE = 5;   // minutes before scheduled time (5 = can open 5 min early)
    const WINDOW_AFTER = 45;   // minutes after scheduled time
    const earliestTime = scheduledStartTime - WINDOW_BEFORE;
    const latestTime = scheduledStartTime + WINDOW_AFTER;
    
    // Validate time window
    if (currentTime < earliestTime || currentTime > latestTime) {
      // Format times properly for error message
      const startTimeStr = `${String(jamMulaiHour).padStart(2, '0')}:${String(jamMulaiMinute).padStart(2, '0')}`;
      
      // Calculate earliest time (can be negative, handle properly)
      let earliestHour = Math.floor(earliestTime / 60);
      let earliestMinute = earliestTime % 60;
      if (earliestHour < 0) earliestHour = 0;
      if (earliestHour >= 24) earliestHour = 23;
      if (earliestMinute < 0) earliestMinute = 0;
      const earliestStr = `${String(earliestHour).padStart(2, '0')}:${String(earliestMinute).padStart(2, '0')}`;
      
      // Calculate latest time
      let latestHour = Math.floor(latestTime / 60);
      let latestMinute = latestTime % 60;
      if (latestHour >= 24) latestHour = 23;
      if (latestMinute >= 60) {
        latestHour += Math.floor(latestMinute / 60);
        latestMinute = latestMinute % 60;
      }
      if (latestHour >= 24) latestHour = 23;
      const latestStr = `${String(latestHour).padStart(2, '0')}:${String(latestMinute).padStart(2, '0')}`;
      
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      
      return res.status(400).json({ 
        message: `Sesi hanya dapat dibuka dalam window waktu ${earliestStr} - ${latestStr} (5 menit sebelum hingga 45 menit sesudah jam ${startTimeStr}). Waktu saat ini: ${currentTimeStr}` 
      });
    }
    
    const newVal = current.is_open ? 0 : 1;
    
    if (newVal === 1) {
      await db.query(
        'UPDATE jadwal SET is_open = ?, opened_at = NOW() WHERE id = ?',
        [newVal, jadwalId]
      );
    } else {
      await db.query(
        'UPDATE jadwal SET is_open = ? WHERE id = ?',
        [newVal, jadwalId]
      );
    }
    
    const [[updated]]: any = await db.query('SELECT opened_at FROM jadwal WHERE id = ?', [jadwalId]);

    res.json({
      message: `Session ${newVal ? 'opened' : 'closed'}`,
      opened_at: updated?.opened_at || null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

// POST /api/presensi/submit/:jadwalId
// body: { nim, status }
export const submitAttendance = async (req: Request, res: Response) => {
  const { jadwalId } = req.params;
  const { nim, status, latitude, longitude } = req.body;
  try {
    // Check if student is active
    const [[student]]: any = await db.query(
      'SELECT is_active FROM mahasiswa WHERE nim = ?',
      [nim]
    );
    if (!student || !student.is_active) {
      return res.status(403).json({ message: 'Student is inactive and cannot submit attendance' });
    }

    // check that session is open and get all needed info
    const [[session]]: any = await db.query(
      `SELECT j.is_open, j.kelas_id, j.matakuliah_id, j.dosen_nidn, j.jam_mulai, j.jam_selesai, j.hari, j.opened_at,
              r.name AS ruangan_name, r.location AS ruangan_location,
              r.latitude AS ruangan_latitude, r.longitude AS ruangan_longitude,
              r.radius_meters AS ruangan_radius_meters
       FROM jadwal j
       LEFT JOIN ruangan r ON j.ruangan_id = r.id
       WHERE j.id = ?`, 
      [jadwalId]
    );
    if (!session || !session.is_open) {
      return res.status(400).json({ message: 'Attendance session is not open' });
    }

    // ⭐ AUTHORIZATION: Check if student is enrolled in this class
    const [[studentClass]]: any = await db.query(
      'SELECT kelas_id FROM mahasiswa WHERE nim = ?',
      [nim]
    );
    if (!studentClass || studentClass.kelas_id !== session.kelas_id) {
      return res.status(403).json({ message: 'You are not enrolled in this class. Unauthorized access.' });
    }

    // Check if session has ended (cannot submit after session ends)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayNum = now.getDay();
    const currentTime = currentHour * 60 + currentMinute;
    
    const HARI_MAP: { [key: string]: number } = {
      'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3,
      'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };
    const sessionDayNum = HARI_MAP[session.hari] ?? -1;
    const [sessionEndHour, sessionEndMinute] = (session.jam_selesai || '').split(':').map(Number);
    const sessionEndTime = sessionEndHour * 60 + sessionEndMinute;
    
    const isSessionEnded = 
      sessionDayNum < currentDayNum || 
      (sessionDayNum === currentDayNum && currentTime >= sessionEndTime);

    if (isSessionEnded) {
      return res.status(400).json({ message: 'Attendance session has ended. You can no longer submit attendance.' });
    }
    const [jamMulaiHour, jamMulaiMinute] = (session.jam_mulai || '').split(':').map(Number);
    const scheduledStartTime = jamMulaiHour * 60 + jamMulaiMinute;
    
    if (currentTime < scheduledStartTime) {
      const jamMulaiStr = `${String(jamMulaiHour).padStart(2, '0')}:${String(jamMulaiMinute).padStart(2, '0')}`;
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
      return res.status(400).json({ 
        message: `Absensi belum dibuka. Silakan coba lagi pada jam ${jamMulaiStr}. Waktu saat ini: ${currentTimeStr}` 
      });
    }

    const requiresLocationCheck = status === 'Hadir';
    const roomLatitude = normalizeNumber(session.ruangan_latitude);
    const roomLongitude = normalizeNumber(session.ruangan_longitude);
    const roomRadiusMeters = Math.max(1, normalizeNumber(session.ruangan_radius_meters) ?? 50);

    let distanceMeters: number | null = null;
    if (requiresLocationCheck) {
      if (roomLatitude === null || roomLongitude === null) {
        return res.status(400).json({
          message: 'Lokasi ruangan belum diatur. Admin perlu menentukan titik peta dan radius absensi terlebih dahulu.',
        });
      }

      const studentLatitude = normalizeNumber(latitude);
      const studentLongitude = normalizeNumber(longitude);

      if (studentLatitude === null || studentLongitude === null) {
        return res.status(400).json({
          message: 'Aktifkan izin lokasi perangkat Anda sebelum mengirim absensi Hadir.',
        });
      }

      distanceMeters = calculateDistanceMeters(
        studentLatitude,
        studentLongitude,
        roomLatitude,
        roomLongitude
      );

      if (distanceMeters > roomRadiusMeters) {
        return res.status(403).json({
          message: `Anda berada di luar radius absensi. Jarak Anda ${Math.round(distanceMeters)} meter dari titik ruangan, sedangkan batasnya ${roomRadiusMeters} meter.`,
        });
      }
    }

    // prevent duplicate for same day
    const [existing]: any = await db.query(
      'SELECT id FROM presensi WHERE jadwal_id = ? AND mahasiswa_nim = ? AND DATE(timestamp) = CURDATE()',
      [jadwalId, nim]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Attendance already submitted for today' });
    }

    // Get class settings to check tardiness limit (by dosen + kelas + matakuliah combination)
    const [[klasSettings]]: any = await db.query(
      `SELECT batas_keterlambatan, kontrak_kuliah FROM kelas_settings 
       WHERE kelas_id = ? AND dosen_nidn = ? AND matakuliah_id = ?`,
      [session.kelas_id, session.dosen_nidn, session.matakuliah_id]
    );
    
    console.log(`[PRESENSI] Fetching kelas_settings: kelas_id=${session.kelas_id}, dosen_nidn=${session.dosen_nidn}, matakuliah_id=${session.matakuliah_id}`);
    console.log(`[PRESENSI] klasSettings result:`, klasSettings);
    
    // Only calculate tardiness if kontrak_kuliah is set (not empty)
    const hasKontrakKuliah = klasSettings && klasSettings.kontrak_kuliah && klasSettings.kontrak_kuliah.trim() !== '';
    const batasKeterlambatan = klasSettings?.batas_keterlambatan || 15;
    
    console.log(`[PRESENSI] hasKontrakKuliah=${hasKontrakKuliah}, batasKeterlambatan=${batasKeterlambatan}`);
    
    // Check if student is late and determine final status
    // Tardiness is calculated from when the session was opened by the lecturer, not from jam_mulai
    // But only if kontrak_kuliah is already set for this class-subject-lecturer combination
    let isLate = 0;
    let finalStatus = status;
    
    if (status === 'Hadir' && session.opened_at && hasKontrakKuliah) {
      // Parse the opened_at timestamp and calculate minutes passed since session was opened
      const sessionOpenedDate = new Date(session.opened_at);
      const nowDate = new Date();
      
      // Calculate difference in milliseconds and convert to minutes
      const timeDiffMs = nowDate.getTime() - sessionOpenedDate.getTime();
      const minutesPassedSinceOpen = Math.floor(timeDiffMs / (1000 * 60));
      
      console.log(`[PRESENSI] opened_at=${session.opened_at}, now=${nowDate.toISOString()}, minutesPassedSinceOpen=${minutesPassedSinceOpen}`);
      
      if (minutesPassedSinceOpen > batasKeterlambatan) {
        isLate = 1;
        // Change status to Terlambat if exceeds tardiness limit
        finalStatus = 'Terlambat';
        console.log(`[PRESENSI] Student is LATE: ${minutesPassedSinceOpen} > ${batasKeterlambatan}`);
      } else {
        console.log(`[PRESENSI] Student is ON TIME: ${minutesPassedSinceOpen} <= ${batasKeterlambatan}`);
      }
    } else {
      console.log(`[PRESENSI] Tardiness not calculated: status=${status}, opened_at=${session.opened_at}, hasKontrakKuliah=${hasKontrakKuliah}`);
    }

    await db.query(
      `INSERT INTO presensi (jadwal_id, mahasiswa_nim, status, is_late, waktu_submit)
       VALUES (?, ?, ?, ?, NOW())`,
      [jadwalId, nim, finalStatus, isLate]
    );
    res.status(201).json({ 
      message: 'Attendance recorded',
      status: finalStatus,
      is_late: isLate ? true : false,
      // Debug info
      debug: {
        has_kontrak_kuliah: hasKontrakKuliah,
        batas_keterlambatan: batasKeterlambatan,
        opened_at: session.opened_at,
        calculated_tardiness: isLate,
        location_check: requiresLocationCheck
          ? {
              room_radius_meters: roomRadiusMeters,
              distance_meters: distanceMeters,
              within_radius: distanceMeters !== null ? distanceMeters <= roomRadiusMeters : false,
            }
          : null,
      }
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

// GET /api/presensi/sessions/:jadwalId/attendance
// return attendance detail for students in the class of selected jadwal for today
export const getSessionAttendanceDetail = async (req: Request, res: Response) => {
  const { jadwalId } = req.params;
  try {
    const [[session]]: any = await db.query(
      `
      SELECT j.id, j.is_open, j.kelas_id, j.hari, j.jam_selesai, j.opened_at,
             k.name AS kelas_name, m.name AS matakuliah_name, ks.kontrak_kuliah,
             r.name AS ruangan_name, r.location AS ruangan_location,
             r.latitude AS ruangan_latitude, r.longitude AS ruangan_longitude,
             r.radius_meters AS ruangan_radius_meters
      FROM jadwal j
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      LEFT JOIN ruangan r ON j.ruangan_id = r.id
      LEFT JOIN kelas_settings ks ON j.kelas_id = ks.kelas_id AND j.dosen_nidn = ks.dosen_nidn AND j.matakuliah_id = ks.matakuliah_id
      WHERE j.id = ?
      `,
      [jadwalId]
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if session has ended
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayNum = now.getDay();
    
    const HARI_MAP: { [key: string]: number } = {
      'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3,
      'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };
    const sessionDayNum = HARI_MAP[session.hari] ?? -1;
    const [sessionEndHour, sessionEndMinute] = (session.jam_selesai || '').split(':').map(Number);
    
    const isSessionEnded = 
      sessionDayNum < currentDayNum || 
      (sessionDayNum === currentDayNum && (currentHour * 60 + currentMinute >= sessionEndHour * 60 + sessionEndMinute));

    const todayKey = now.toISOString().slice(0, 10);
    const openedAt = session.opened_at ? new Date(session.opened_at) : null;
    const openedAtKey = openedAt && !Number.isNaN(openedAt.getTime()) ? openedAt.toISOString().slice(0, 10) : null;
    const wasOpenedToday = openedAtKey === todayKey;

    // If session has ended and it was opened today, auto-insert Alpa for students who haven't submitted.
    if (isSessionEnded && wasOpenedToday) {
      const [studentsToMarkAlfa]: any = await db.query(
        `
        SELECT m.nim
        FROM mahasiswa m
        WHERE m.kelas_id = ?
        AND m.nim NOT IN (
          SELECT p.mahasiswa_nim
          FROM presensi p
          WHERE p.jadwal_id = ? AND DATE(p.timestamp) = CURDATE()
        )
        `,
        [session.kelas_id, jadwalId]
      );

      // Insert Alpa records for students who didn't submit
      for (const student of studentsToMarkAlfa) {
        await db.query(
          `INSERT INTO presensi (jadwal_id, mahasiswa_nim, status, timestamp) 
           VALUES (?, ?, 'Alpa', NOW())
           ON DUPLICATE KEY UPDATE status = 'Alpa'`,
          [jadwalId, student.nim]
        );
      }
    }

    const [rows]: any = await db.query(
      `
      SELECT
        mh.nim,
        mh.name,
        att.status,
        att.is_late,
        att.timestamp
      FROM mahasiswa mh
      JOIN jadwal j ON j.kelas_id = mh.kelas_id
      LEFT JOIN (
        SELECT p1.mahasiswa_nim, p1.status, p1.is_late, p1.timestamp
        FROM presensi p1
        JOIN (
          SELECT mahasiswa_nim, MAX(timestamp) AS latest_timestamp
          FROM presensi
          WHERE jadwal_id = ? AND DATE(timestamp) = CURDATE()
          GROUP BY mahasiswa_nim
        ) last_att ON last_att.mahasiswa_nim = p1.mahasiswa_nim AND last_att.latest_timestamp = p1.timestamp
        WHERE p1.jadwal_id = ? AND DATE(p1.timestamp) = CURDATE()
      ) att ON att.mahasiswa_nim = mh.nim
      WHERE j.id = ?
      ORDER BY mh.name ASC
      `,
      [jadwalId, jadwalId, jadwalId]
    );

    const summary = rows.reduce(
      (acc: any, row: any) => {
        acc.total += 1;
        if (!row.status) {
          acc.belum_absen += 1;
          return acc;
        }

        if (row.status === 'Hadir') acc.hadir += 1;
        if (row.status === 'Izin') acc.izin += 1;
        if (row.status === 'Sakit') acc.sakit += 1;
        if (row.status === 'Alpa') acc.alpa += 1;
        return acc;
      },
      { total: 0, hadir: 0, izin: 0, sakit: 0, alpa: 0, belum_absen: 0 }
    );

    res.json({
      session: {
        id: session.id,
        is_open: session.is_open,
        kelas_id: session.kelas_id,
        kelas_name: session.kelas_name,
        matakuliah_name: session.matakuliah_name,
        opened_at: session.opened_at,
        kontrak_kuliah: session.kontrak_kuliah,
        ruangan_name: session.ruangan_name,
        ruangan_location: session.ruangan_location,
        ruangan_latitude: session.ruangan_latitude,
        ruangan_longitude: session.ruangan_longitude,
        ruangan_radius_meters: session.ruangan_radius_meters,
        isSessionEnded,
      },
      summary,
      students: rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

// GET /api/presensi/history/:nim
export const getStudentHistory = async (req: Request, res: Response) => {
  const { nim } = req.params;
  try {
    const query = `
      SELECT p.id, p.jadwal_id, p.status, p.is_late, p.timestamp,
             j.hari, j.jam_mulai, j.jam_selesai,
             k.name as kelas_name, m.name as matakuliah_name, d.name as dosen_name
      FROM presensi p
      JOIN jadwal j ON p.jadwal_id = j.id
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      JOIN dosen d ON j.dosen_nidn = d.nidn
      WHERE p.mahasiswa_nim = ?
      ORDER BY p.timestamp DESC
    `;
    const [rows] = await db.query(query, [nim]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
};

const EARTH_RADIUS_METERS = 6371000;

const normalizeNumber = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

const calculateDistanceMeters = (
  originLatitude: number,
  originLongitude: number,
  targetLatitude: number,
  targetLongitude: number
) => {
  const deltaLatitude = (targetLatitude - originLatitude) * (Math.PI / 180);
  const deltaLongitude = (targetLongitude - originLongitude) * (Math.PI / 180);
  const latitudeOne = originLatitude * (Math.PI / 180);
  const latitudeTwo = targetLatitude * (Math.PI / 180);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2) *
      Math.cos(latitudeOne) * Math.cos(latitudeTwo);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
};

// helper function used by PDF report; export directly if needed
export const getRecapData = async (kelasId: number, matakuliahId?: number) => {
  // get ALL students in the class, with their attendance (including 0 for those with no attendance)
  // Use subquery to filter presensi by mata kuliah (if provided) before joining
  let presensiSubquery = `
    SELECT p.mahasiswa_nim, p.status, p.is_late, p.timestamp
    FROM presensi p
    LEFT JOIN jadwal j ON p.jadwal_id = j.id
    WHERE j.kelas_id = ?
  `;
  
  const subParams: any[] = [kelasId];
  
  if (matakuliahId !== undefined && matakuliahId !== null) {
    presensiSubquery += ` AND j.matakuliah_id = ?`;
    subParams.push(matakuliahId);
  }
  
  let query = `
    SELECT m.nim, m.name AS nama_mahasiswa,
           COALESCE(SUM(CASE WHEN p.status = 'Hadir' AND p.is_late = 0 THEN 1 ELSE 0 END), 0) AS total_hadir,
           COALESCE(SUM(CASE WHEN p.status = 'Hadir' AND p.is_late = 1 THEN 1 ELSE 0 END), 0) AS total_terlambat,
           COALESCE(SUM(CASE WHEN p.status = 'Izin' THEN 1 ELSE 0 END), 0) AS total_izin,
           COALESCE(SUM(CASE WHEN p.status = 'Sakit' THEN 1 ELSE 0 END), 0) AS total_sakit,
           COALESCE(SUM(CASE WHEN p.status = 'Alpa' THEN 1 ELSE 0 END), 0) AS total_alpa,
           COALESCE(COUNT(DISTINCT DATE(p.timestamp)), 0) AS total_sessions
    FROM mahasiswa m
    LEFT JOIN (${presensiSubquery}) p ON p.mahasiswa_nim = m.nim
    WHERE m.kelas_id = ?
    GROUP BY m.nim, m.name
    ORDER BY m.nim
  `;
  
  const params = [...subParams, kelasId];
  
  const [rows]: any = await db.query(query, params);
  return rows;
};

export const exportAttendancePDF = async (req: Request, res: Response) => {
  const { kelasId } = req.params;
  const { matakuliahId } = req.query;
  try {
    // fetch class info (name, subject, lecturer)
    let infoQuery = `
      SELECT k.name AS kelas_name,
             m.name AS matakuliah_name,
             d.name AS dosen_name
      FROM jadwal j
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      JOIN dosen d ON j.dosen_nidn = d.nidn
      WHERE j.kelas_id = ?
    `;

    const infoParams: any[] = [kelasId];

    if (matakuliahId) {
      infoQuery += ` AND j.matakuliah_id = ?`;
      infoParams.push(Number(matakuliahId));
    }

    infoQuery += ' ORDER BY j.id DESC LIMIT 1';

    const [[info]]: any = await db.query(infoQuery, infoParams);

    if (!info || !info.kelas_name) {
      return res.status(404).json({ message: 'Class data not found' });
    }

    // fetch total meetings separately to avoid ONLY_FULL_GROUP_BY SQL mode issues
    let totalMeetingsQuery = `
      SELECT COUNT(DISTINCT DATE(p.timestamp)) AS total_meetings
      FROM presensi p
      JOIN jadwal j ON p.jadwal_id = j.id
      WHERE j.kelas_id = ?
    `;
    const totalMeetingsParams: any[] = [kelasId];

    if (matakuliahId) {
      totalMeetingsQuery += ' AND j.matakuliah_id = ?';
      totalMeetingsParams.push(Number(matakuliahId));
    }

    const [[meetingsInfo]]: any = await db.query(totalMeetingsQuery, totalMeetingsParams);
    const totalMeetings = Number(meetingsInfo?.total_meetings || 0);

    // get recap rows using helper
    const recapRows = await getRecapData(Number(kelasId), matakuliahId ? Number(matakuliahId) : undefined);

    // Use ESM-compatible dynamic import for pdfkit.
    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-disposition', `attachment; filename="Attendance_Recap_${info.kelas_name}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(20).text('Student Attendance Recap', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Class: ${info.kelas_name}`);
    doc.text(`Subject: ${info.matakuliah_name}`);
    doc.text(`Lecturer: ${info.dosen_name}`);
    doc.text(`Total Meetings: ${totalMeetings}`);
    doc.moveDown(2);

    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('NIM', 50, tableTop);
    doc.text('Name', 150, tableTop);
    doc.text('Hadir', 350, tableTop);
    doc.text('Izin/Sakit', 400, tableTop);
    doc.text('Alpa', 470, tableTop);
    doc.text('%', 510, tableTop);
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.font('Helvetica');

    let y = tableTop + 25;
    recapRows.forEach((row: any) => {
      doc.text(row.nim, 50, y);
      doc.text(row.nama_mahasiswa, 150, y);
      doc.text(row.total_hadir?.toString() || '0', 350, y);
      doc.text(((row.total_izin || 0) + (row.total_sakit || 0)).toString(), 400, y);
      doc.text(row.total_alpa?.toString() || '0', 470, y);
      const percent = totalMeetings ? ((row.total_hadir / totalMeetings) * 100).toFixed(2) : '0';
      doc.text(`${percent}%`, 510, y);
      y += 20;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    doc.end();
  } catch (error) {
    console.error('PDF Generation Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating PDF report' });
    }
  }
};

