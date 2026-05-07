import { useState, useEffect, useContext } from 'react';
import { AlertCircle, Loader2, Calendar, Clock, LayoutDashboard } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const HARI_MAP: { [key: string]: number } = {
  Minggu: 0,
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
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

      return classDayNum > todayDayNum;
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

export const DosenDashboard = () => {
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useContext(AuthContext);
  const nidn = auth?.user?.reference_id || '';

  const fetchSchedules = async () => {
    if (!nidn) return setUpcomingClasses([]);
    try {
      setLoading(true);
      const res = await api.get(`/jadwal?dosen_nidn=${nidn}`);
      setUpcomingClasses(getUpcomingClasses(res.data || []));
    } catch (err) {
      console.error(err);
      setError('Gagal memuat jadwal. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [nidn]);

  return (
    <div className="min-h-screen">
      <PageHeader title="Dashboard Dosen" subtitle="Pantau jadwal sesi mengajar dan kelola absensi mahasiswa" icon={LayoutDashboard} />
      <div className="p-6">
        <div className="mb-6">
          <p className="text-sm text-zinc-500 mt-2">
            Login as: <span className="font-medium text-zinc-700">{auth?.user?.email}</span> (ID: {auth?.user?.id})
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200">
            <p className="text-sm text-zinc-500">Sesi Mendatang</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1">{upcomingClasses.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200">
            <p className="text-sm text-zinc-500">Sesi Berikutnya</p>
            <p className="text-base font-semibold text-zinc-900 mt-2">
              {upcomingClasses[0] ? `${upcomingClasses[0].hari}, ${upcomingClasses[0].jam_mulai}` : '-'}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-zinc-200">
            <p className="text-sm text-zinc-500">Aksi Absensi</p>
            <p className="text-base font-semibold text-zinc-900 mt-2">Dikelola di halaman Manage Attendance</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-800">Jadwal Sesi Mendatang</h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">Read only</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Terjadi Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : upcomingClasses.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-zinc-500">Tidak ada jadwal mendatang minggu ini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingClasses.slice(0, 8).map((cls) => {
                const today = new Date();
                const classDayNum = HARI_MAP[cls.hari] ?? -1;
                const isToday = classDayNum === today.getDay();

                return (
                  <div key={cls.id} className={"flex items-center justify-between p-4 rounded-lg transition-colors " + (isToday ? 'border-2 border-amber-400 bg-amber-50' : 'border border-zinc-100 bg-zinc-50')}>
                    <div>
                      {isToday && (
                        <div className="inline-block mb-2 px-2.5 py-0.5 bg-amber-200 text-amber-800 text-xs font-semibold rounded-full">Hari Ini</div>
                      )}
                      <p className="font-semibold text-zinc-900">{cls.matakuliah_name} ({cls.kelas_name})</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-zinc-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {cls.hari} - {cls.jam_mulai} - {cls.jam_selesai}
                        </span>
                        <span>Ruangan: {cls.ruangan_name || '-'}</span>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-200 text-zinc-700 font-medium">Lihat detail di Manage Attendance</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
