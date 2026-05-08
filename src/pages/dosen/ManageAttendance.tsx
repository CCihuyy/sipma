import { useState, useEffect, useContext } from 'react';
import { Play, Square, AlertCircle, Loader2, Calendar, Users, RefreshCw, Eye, CheckSquare } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

// Map hari names to day of week numbers
const HARI_MAP: { [key: string]: number } = {
  'Minggu': 0,
  'Senin': 1,
  'Selasa': 2,
  'Rabu': 3,
  'Kamis': 4,
  'Jumat': 5,
  'Sabtu': 6,
};

const getUpcomingClasses = (classes: any[]) => {
  const today = new Date();
  const todayDayNum = today.getDay();
  const todayHours = today.getHours();
  const todayMinutes = today.getMinutes();
  
  return classes
    .filter((cls) => {
      const classDayNum = HARI_MAP[cls.hari] ?? -1;
      
      if (classDayNum === -1) return false;
      
      if (classDayNum === todayDayNum) {
        const [classHour, classMin] = cls.jam_mulai.split(':').map(Number);
        return classHour > todayHours || (classHour === todayHours && classMin >= todayMinutes);
      }
      
      if (classDayNum > todayDayNum) {
        return true;
      }
      
      return false;
    })
    .sort((a, b) => {
      const dayA = HARI_MAP[a.hari] ?? 7;
      const dayB = HARI_MAP[b.hari] ?? 7;
      
      if (dayA !== dayB) return dayA - dayB;
      
      const [hourA, minA] = a.jam_mulai.split(':').map(Number);
      const [hourB, minB] = b.jam_mulai.split(':').map(Number);
      
      return hourA * 60 + minA - (hourB * 60 + minB);
    });
};

const isSessionEnded = (session: any) => {
  const today = new Date();
  const todayDayNum = today.getDay();
  const classDayNum = HARI_MAP[session.hari] ?? -1;
  
  // If it's a past day, session has ended
  if (classDayNum < todayDayNum) return true;
  
  // If it's a future day, session hasn't ended yet
  if (classDayNum > todayDayNum) return false;
  
  // Same day - check if current time is past session end time
  const todayHours = today.getHours();
  const todayMinutes = today.getMinutes();
  const [endHour, endMin] = session.jam_selesai.split(':').map(Number);
  
  const currentTimeInMinutes = todayHours * 60 + todayMinutes;
  const sessionEndTimeInMinutes = endHour * 60 + endMin;
  
  return currentTimeInMinutes >= sessionEndTimeInMinutes;
};

export const ManageAttendance = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [attendanceDetail, setAttendanceDetail] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);
  const auth = useContext(AuthContext);
  const nidn = auth?.user?.reference_id || '';

  const fetchSessions = () => {
    if (!nidn) {
      setSessions([]);
      setAllSessions([]);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get(`/jadwal?dosen_nidn=${nidn}`)
      .then((res) => {
        const allData = res.data || [];
        const filtered = getUpcomingClasses(allData);
        setAllSessions(allData);
        setSessions(filtered);
      })
      .catch((err) => {
        console.error(err);
        setError('Gagal memuat jadwal. Silakan refresh halaman.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, [nidn]);

  const fetchAttendanceDetail = async (jadwalId: number) => {
    try {
      setDetailLoading(true);
      setError(null);
      const res = await api.get(`/presensi/sessions/${jadwalId}/attendance`);
      setAttendanceDetail(res.data);
      setSelectedSessionId(jadwalId);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat detail absensi sesi.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Auto-refresh attendance detail every 5 seconds when a session is selected
  useEffect(() => {
    if (!selectedSessionId) return;

    const interval = setInterval(() => {
      api
        .get(`/presensi/sessions/${selectedSessionId}/attendance`)
        .then((res) => {
          setAttendanceDetail(res.data);
        })
        .catch((err) => {
          console.error('[AUTO-REFRESH] Error fetching attendance detail:', err);
        });
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [selectedSessionId]);

  const toggleSession = async (jadwalId: number) => {
    try {
      setTogglingId(jadwalId);
      setToggleError(null);
      await api.put(`/presensi/sessions/${jadwalId}/toggle`);
      await fetchSessions();
      if (selectedSessionId === jadwalId) {
        await fetchAttendanceDetail(jadwalId);
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Gagal mengubah status sesi absensi.';
      setToggleError(errorMessage);
    } finally {
      setTogglingId(null);
    }
  };

  const activeRows = showUpcomingOnly ? sessions : allSessions;
  const studentRows = Array.isArray(attendanceDetail?.students) ? attendanceDetail.students : [];
  const summary = attendanceDetail?.summary || {
    total: 0,
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    belum_absen: 0,
  };
  const sessionInfo = attendanceDetail?.session || {
    matakuliah_name: '-',
    kelas_name: '-',
    is_open: 0,
  };

  return (
    <div className="min-h-screen">
      <div className="p-6">
          <PageHeader title="Kelola Absensi" subtitle="Buka sesi dan catat kehadiran mahasiswa secara real-time" icon={CheckSquare} />

          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-zinc-500 mt-2">
                Login as: <span className="font-medium text-zinc-700">{auth?.user?.email}</span> (ID: {auth?.user?.id})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpcomingOnly(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showUpcomingOnly
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                Mendatang ({sessions.length})
              </button>
              <button
                onClick={() => setShowUpcomingOnly(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !showUpcomingOnly
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                }`}
              >
                Semua ({allSessions.length})
              </button>
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">Total Sesi Tampil</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{activeRows.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">Sesi Sedang Open</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeRows.filter((row) => row.is_open).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">Panel Detail</p>
          <p className="text-base font-semibold text-zinc-900 mt-2">{selectedSessionId ? `Sesi #${selectedSessionId}` : 'Belum dipilih'}</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {toggleError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-medium mb-1">Gagal membuka sesi:</p>
            <p>{toggleError}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Mata Kuliah</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Kelas</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Ruangan</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Jam</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center gap-2 text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memuat...
                  </div>
                </td>
              </tr>
            ) : (showUpcomingOnly ? sessions.length === 0 : allSessions.length === 0) ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <Calendar className="w-8 h-8 text-zinc-300" />
                    <p>
                      {showUpcomingOnly 
                        ? 'Tidak ada jadwal mendatang minggu ini' 
                        : 'Belum ada jadwal'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              activeRows.map((session) => {
                const sessionId = session.id ?? session.jadwal_id;
                const today = new Date();
                const todayDayNum = today.getDay();
                const classDayNum = HARI_MAP[session.hari] ?? -1;
                const isToday = classDayNum === todayDayNum;
                
                return (
                  <tr key={sessionId} className={`transition-colors ${
                    isToday 
                      ? 'bg-amber-50 hover:bg-amber-100' 
                      : 'hover:bg-zinc-50'
                  }`}>
                    <td className={`px-6 py-4 text-sm font-medium ${isToday ? 'text-amber-900' : 'text-zinc-900'}`}>
                      {session.matakuliah_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">{session.kelas_name}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500">{session.ruangan_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {session.hari} {session.jam_mulai} - {session.jam_selesai}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          session.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {session.is_open ? 'Open' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => fetchAttendanceDetail(sessionId)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                        >
                          <Eye className="w-4 h-4" /> Lihat Detail
                        </button>
                        <button
                          onClick={() => toggleSession(sessionId)}
                          disabled={togglingId === sessionId || isSessionEnded(session)}
                          title={isSessionEnded(session) ? 'Sesi telah berakhir - tidak bisa ubah status' : ''}
                          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                            session.is_open
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 disabled:hover:bg-red-50'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600'
                          }`}
                        >
                          {togglingId === sessionId ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Memproses...
                            </>
                          ) : session.is_open ? (
                            <>
                              <Square className="w-4 h-4" /> Tutup Sesi
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" /> Buka Sesi
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">Detail Absensi Sesi</h2>
          {selectedSessionId && (
            <button
              onClick={() => fetchAttendanceDetail(selectedSessionId)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          )}
        </div>

        {!selectedSessionId ? (
          <p className="text-sm text-zinc-500">Pilih salah satu sesi lalu klik Detail untuk melihat siapa yang sudah absen hari ini.</p>
        ) : detailLoading ? (
          <div className="flex items-center gap-2 text-zinc-500 py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat detail absensi...
          </div>
        ) : attendanceDetail ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
                <p className="text-xs text-zinc-500">Total Mahasiswa</p>
                <p className="text-xl font-bold text-zinc-900">{summary.total}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs text-emerald-700">Hadir</p>
                <p className="text-xl font-bold text-emerald-700">{summary.hadir}</p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-700">Izin</p>
                <p className="text-xl font-bold text-blue-700">{summary.izin}</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-700">Sakit</p>
                <p className="text-xl font-bold text-amber-700">{summary.sakit}</p>
              </div>
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                <p className="text-xs text-rose-700">Alpa</p>
                <p className="text-xl font-bold text-rose-700">{summary.alpa}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-zinc-600 mb-3">
              <Users className="w-4 h-4" />
              <span>
                {sessionInfo.matakuliah_name} ({sessionInfo.kelas_name})
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  sessionInfo.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {sessionInfo.is_open ? 'Sesi Dibuka' : 'Sesi Ditutup'}
              </span>
              {sessionInfo.session_opened_at && (
                <span className="text-xs text-zinc-500 ml-auto">
                  Dibuka: {new Date(sessionInfo.session_opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {!sessionInfo.kontrak_kuliah && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">Kontrak Kuliah Belum Diatur</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Keterlambatan mahasiswa belum akan dihitung. Silakan atur kontrak kuliah di menu Pengaturan Kelas.
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-600">NIM</th>
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-600">Nama</th>
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-600">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-zinc-600">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {studentRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-sm text-zinc-500 text-center">
                        Belum ada data mahasiswa untuk sesi ini.
                      </td>
                    </tr>
                  ) : studentRows.map((student: any) => (
                    <tr key={student.nim} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-sm text-zinc-700">{student.nim}</td>
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">{student.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              !student.status
                                ? 'bg-zinc-200 text-zinc-700'
                                : student.status === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-700'
                                : student.status === 'Izin'
                                ? 'bg-blue-100 text-blue-700'
                                : student.status === 'Sakit'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {student.status || 'Belum absen'}
                          </span>
                          {student.is_late === 1 && student.status === 'Hadir' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              ⏰ Terlambat
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">{student.timestamp ? new Date(student.timestamp).toLocaleTimeString('id-ID') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Detail belum tersedia.</p>
        )}
      </div>
      </div>
    </div>
  );
};
