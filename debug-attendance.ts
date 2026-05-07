import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debug() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'siakad_db',
  });

  try {
    console.log('\n📋 JADWAL TERBARU (5 terakhir):');
    const [jadwals]: any = await connection.query(
      'SELECT id, jam_mulai, jam_selesai, is_open, opened_at, kelas_id, dosen_nidn FROM jadwal ORDER BY id DESC LIMIT 5'
    );
    console.table(jadwals);

    console.log('\n👥 MAHASISWA TERDAFTAR:');
    const [mahasiswas]: any = await connection.query(
      'SELECT nim, name, kelas_id FROM mahasiswa LIMIT 5'
    );
    console.table(mahasiswas);

    console.log('\n🔗 JADWAL & KELAS INFO:');
    const [info]: any = await connection.query(`
      SELECT j.id as jadwal_id, j.jam_mulai, j.jam_selesai, j.is_open, j.opened_at,
             k.name as kelas_name, k.id as kelas_id, m.name as matakuliah_name,
             (SELECT COUNT(*) FROM mahasiswa WHERE kelas_id = k.id) as jumlah_mahasiswa
      FROM jadwal j
      JOIN kelas k ON j.kelas_id = k.id
      JOIN matakuliah m ON j.matakuliah_id = m.id
      ORDER BY j.id DESC LIMIT 3
    `);
    console.table(info);

    console.log('\n✅ CEK: Session dibuka?');
    const [openSessions]: any = await connection.query(
      'SELECT COUNT(*) as open_count FROM jadwal WHERE is_open = 1'
    );
    console.log(`Total session terbuka: ${openSessions[0].open_count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debug();
