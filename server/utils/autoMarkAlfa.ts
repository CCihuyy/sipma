import db from '../config/db.js';

export const autoMarkAlfa = async () => {
  try {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayNum = now.getDay();
    const currentTime = currentHour * 60 + currentMinute;

    const HARI_MAP: { [key: string]: number } = {
      'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3,
      'Kamis': 4, 'Jumat': 5, 'Sabtu': 6,
    };

    // Get all jadwal entries
    const [jadwalRows]: any = await db.query('SELECT id, kelas_id, hari, jam_selesai, opened_at FROM jadwal');

    for (const jadwal of jadwalRows) {
      const sessionDayNum = HARI_MAP[jadwal.hari] ?? -1;
      const [sessionEndHour, sessionEndMinute] = (jadwal.jam_selesai || '').split(':').map(Number);
      const sessionEndTime = sessionEndHour * 60 + sessionEndMinute;

      // Check if session has ended
      const isSessionEnded =
        sessionDayNum < currentDayNum ||
        (sessionDayNum === currentDayNum && currentTime >= sessionEndTime);

      if (!isSessionEnded) {
        continue; // Session hasn't ended yet, skip
      }

      // Only mark Alfa if the lecturer opened the session on the same day.
      const openedAt = jadwal.opened_at ? new Date(jadwal.opened_at) : null;
      const openedAtKey = openedAt && !Number.isNaN(openedAt.getTime()) ? openedAt.toISOString().slice(0, 10) : null;
      const wasOpenedToday = openedAtKey === todayKey;

      if (!wasOpenedToday) {
        continue; // No session opened today -> treated as no class, no alfa.
      }

      // Get all students in the class
      const [classStudents]: any = await db.query(
        'SELECT nim FROM mahasiswa WHERE kelas_id = ?',
        [jadwal.kelas_id]
      );

      // Get students who already submitted attendance today for this jadwal
      const [attendedStudents]: any = await db.query(
        `SELECT DISTINCT mahasiswa_nim FROM presensi 
         WHERE jadwal_id = ? AND DATE(timestamp) = CURDATE()`,
        [jadwal.id]
      );

      const attendedNims = attendedStudents.map((row: any) => row.mahasiswa_nim);

      // Find students who didn't attend
      const studentsToMarkAlfa = classStudents.filter(
        (student: any) => !attendedNims.includes(student.nim)
      );

      // Insert alfa records for students who didn't submit
      for (const student of studentsToMarkAlfa) {
        try {
          await db.query(
            `INSERT INTO presensi (jadwal_id, mahasiswa_nim, status, timestamp)
             VALUES (?, ?, 'Alpa', NOW())
             ON DUPLICATE KEY UPDATE status = 'Alpa', timestamp = NOW()`,
            [jadwal.id, student.nim]
          );
        } catch (error: any) {
          // Ignore duplicate key errors
          if (error.code !== 'ER_DUP_ENTRY') {
            console.error(`Error marking alfa for student ${student.nim}:`, error);
          }
        }
      }

      if (studentsToMarkAlfa.length > 0) {
        console.log(
          `[AUTO-MARK-ALFA] Marked ${studentsToMarkAlfa.length} students as Alpa for jadwal_id=${jadwal.id}`
        );
      }
    }
  } catch (error) {
    console.error('[AUTO-MARK-ALFA] Error:', error);
  }
};
