import { useEffect, useState } from 'react';
import api from '../../services/api';
import { RoomMap, RoomMapPoint, RoomMapPointItem } from '../../components/RoomMap';

type StatusHariIni = {
  Hadir: number;
  Izin: number;
  Sakit: number;
  Alpa: number;
};

type DashboardStats = {
  mahasiswa: number;
  dosen: number;
  kelas: number;
  activeSessions: number;
  statusHariIni: StatusHariIni;
};

type RuanganRow = {
  id: number;
  name: string;
  location: string;
  latitude: number | string | null;
  longitude: number | string | null;
  radius_meters: number | string | null;
};

type JadwalRow = {
  id: number;
  ruangan_id: number | null;
  kelas_name: string;
  matakuliah_name: string;
  dosen_name: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  is_open: number | boolean;
  ruangan_name: string;
  ruangan_location: string | null;
  ruangan_latitude: number | string | null;
  ruangan_longitude: number | string | null;
  ruangan_radius_meters: number | string | null;
};

type AreaGroup = {
  id: string;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  roomNames: Set<string>;
  rooms: Array<{id: number; name: string}>;
  classItems: RoomMapPointItem[];
};

const normalizeNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

const HARI_MAP: { [key: string]: number } = {
  Minggu: 0,
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
};

const isScheduleActiveNow = (schedule: JadwalRow, now: Date) => {
  // Check if hari matches
  const sessionDayNum = HARI_MAP[schedule.hari] ?? -1;
  if (sessionDayNum !== now.getDay()) {
    return false;
  }

  // Parse jam_mulai and jam_selesai
  const [startHour, startMinute] = (schedule.jam_mulai || '').split(':').map(Number);
  const [endHour, endMinute] = (schedule.jam_selesai || '').split(':').map(Number);
  
  // Validate parsing - if any is NaN, schedule is not active
  if (!Number.isFinite(startHour) || !Number.isFinite(startMinute) || 
      !Number.isFinite(endHour) || !Number.isFinite(endMinute)) {
    return false;
  }

  // Check if current time falls within schedule time window
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

export const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    mahasiswa: 0,
    dosen: 0,
    kelas: 0,
    activeSessions: 0,
    statusHariIni: { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 },
  });
  const [ruangan, setRuangan] = useState<RuanganRow[]>([]);
  const [jadwal, setJadwal] = useState<JadwalRow[]>([]);
  const [locationPoints, setLocationPoints] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(true);

  const totalStatus =
    stats.statusHariIni.Hadir +
    stats.statusHariIni.Izin +
    stats.statusHariIni.Sakit +
    stats.statusHariIni.Alpa;

  const hadirPct = totalStatus ? Math.round((stats.statusHariIni.Hadir / totalStatus) * 100) : 0;
  const izinPct = totalStatus ? Math.round((stats.statusHariIni.Izin / totalStatus) * 100) : 0;
  const sakitPct = totalStatus ? Math.round((stats.statusHariIni.Sakit / totalStatus) * 100) : 0;

  const donutStyle = {
    background: `conic-gradient(#16a34a 0% ${hadirPct}%, #2563eb ${hadirPct}% ${hadirPct + izinPct}%, #d97706 ${hadirPct + izinPct}% ${hadirPct + izinPct + sakitPct}%, #e11d48 ${hadirPct + izinPct + sakitPct}% 100%)`,
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [statsRes, ruanganRes, jadwalRes] = await Promise.all([
          api.get('/stats'),
          api.get('/ruangan'),
          api.get('/jadwal'),
        ]);

        if (!isMounted) {
          return;
        }

        setStats(statsRes.data);
        setRuangan(ruanganRes.data || []);
        setJadwal(jadwalRes.data || []);

        // Load location points (optional - not stored in DB yet for all points)
        const pointMap: {[key: string]: string} = {};
        if (ruanganRes.data) {
          for (const room of ruanganRes.data) {
            const lat = normalizeNumber(room.latitude);
            const lon = normalizeNumber(room.longitude);
            if (lat !== null && lon !== null) {
              const key = `${lat.toFixed(6)}:${lon.toFixed(6)}`;
              if (!pointMap[key]) {
                try {
                  const pointRes = await api.get('/location-point', {
                    params: { latitude: lat, longitude: lon }
                  });
                  pointMap[key] = pointRes.data.name;
                } catch (e) {
                  // Point doesn't exist in DB yet, skip
                }
              }
            }
          }
        }
        setLocationPoints(pointMap);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    const timer = setInterval(loadDashboard, 20000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const roomLookupById = new Map<number, RuanganRow>();
  ruangan.forEach((room) => {
    roomLookupById.set(room.id, room);
  });

  const scheduleLookupByRoom = new Map<number, JadwalRow[]>();
  jadwal.forEach((schedule) => {
    if (schedule.ruangan_id === null || schedule.ruangan_id === undefined) {
      return;
    }

    const roomId = Number(schedule.ruangan_id);
    if (!Number.isFinite(roomId)) {
      return;
    }

    const current = scheduleLookupByRoom.get(roomId) || [];
    current.push(schedule);
    scheduleLookupByRoom.set(roomId, current);
  });

  const areaGroups = new Map<string, AreaGroup>();
  let roomsWithoutCoordinates = 0;

  ruangan.forEach((room) => {
    const latitude = normalizeNumber(room.latitude);
    const longitude = normalizeNumber(room.longitude);

    if (latitude === null || longitude === null) {
      roomsWithoutCoordinates += 1;
      return;
    }

    const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    const existingGroup = areaGroups.get(key);
    const storedTitle = locationPoints[key];

    if (existingGroup) {
      existingGroup.roomNames.add(room.name);
      existingGroup.rooms.push({id: room.id, name: room.name});
      existingGroup.radiusMeters = Math.max(existingGroup.radiusMeters, normalizeNumber(room.radius_meters) ?? 50);
      return;
    }

    areaGroups.set(key, {
      id: key,
      title: storedTitle || room.location || room.name || 'Titik lokasi',
      location: storedTitle || room.location || room.name || 'Titik lokasi',
      latitude,
      longitude,
      radiusMeters: Math.max(1, normalizeNumber(room.radius_meters) ?? 50),
      roomNames: new Set([room.name]),
      rooms: [{id: room.id, name: room.name}],
      classItems: [],
    });
  });

  const currentTime = new Date();

  roomLookupById.forEach((room) => {
    const latitude = normalizeNumber(room.latitude);
    const longitude = normalizeNumber(room.longitude);
    if (latitude === null || longitude === null) {
      return;
    }

    const roomSchedules = scheduleLookupByRoom.get(room.id) || [];
    const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    const group = areaGroups.get(key);
    if (!group) {
      return;
    }

    roomSchedules.forEach((schedule) => {
      const isActive = isScheduleActiveNow(schedule, currentTime);
      group.classItems.push({
        id: schedule.id,
        title: `${schedule.matakuliah_name} (${schedule.kelas_name})`,
        subtitle: `${room.name} • ${schedule.hari} ${schedule.jam_mulai} - ${schedule.jam_selesai}`,
        status: isActive ? 'active' : 'inactive',
      });
    });
  });

  const roomPoints: RoomMapPoint[] = Array.from(areaGroups.values())
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((group) => ({
      id: group.id,
      title: group.title,
      location: Array.from(group.roomNames).join(', '),
      roomNames: Array.from(group.roomNames),
      rooms: group.rooms,
      latitude: group.latitude,
      longitude: group.longitude,
      radiusMeters: group.radiusMeters,
      items: group.classItems.sort((left, right) => {
        const leftPriority = left.status === 'active' ? 0 : 1;
        const rightPriority = right.status === 'active' ? 0 : 1;
        return leftPriority - rightPriority || left.title.localeCompare(right.title);
      }),
    }));

  const activeClassCount = roomPoints.reduce(
    (sum, point) => sum + (point.items?.filter((item) => item.status === 'active').length || 0),
    0
  );

  const inactiveClassCount = roomPoints.reduce(
    (sum, point) => sum + (point.items?.filter((item) => item.status === 'inactive').length || 0),
    0
  );

  const handleEditRoom = async (roomId: number, newName: string) => {
    try {
      await api.put(`/ruangan/${roomId}`, { name: newName });
      // Refresh dashboard to show updated name
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.reload();
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  };

  const handleEditPointTitle = async (latitude: number, longitude: number, newTitle: string) => {
    try {
      await api.put('/location-point', 
        { name: newTitle },
        { params: { latitude, longitude } }
      );
      // Update local state and refresh
      const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
      setLocationPoints(prev => ({...prev, [key]: newTitle}));
      await new Promise(resolve => setTimeout(resolve, 300));
      window.location.reload();
    } catch (error) {
      console.error('Error updating point title:', error);
      // Try to create if it doesn't exist
      try {
        await api.post('/location-point', { latitude, longitude, name: newTitle });
        const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
        setLocationPoints(prev => ({...prev, [key]: newTitle}));
        await new Promise(resolve => setTimeout(resolve, 300));
        window.location.reload();
      } catch (createError) {
        console.error('Error creating point title:', createError);
        throw createError;
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 mb-6">Dasbor Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-800">Total Mahasiswa</h3>
          <p className="text-4xl font-bold text-indigo-600 mt-2">{stats.mahasiswa}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-800">Total Dosen</h3>
          <p className="text-4xl font-bold text-indigo-600 mt-2">{stats.dosen}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-800">Total Kelas</h3>
          <p className="text-4xl font-bold text-indigo-600 mt-2">{stats.kelas}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <h3 className="text-lg font-semibold text-zinc-800">Sesi Aktif</h3>
          <p className="text-4xl font-bold text-indigo-600 mt-2">{stats.activeSessions}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-zinc-800">Komposisi Status Presensi Hari Ini</h3>
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
              {totalStatus} entri
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Memuat visualisasi...</p>
          ) : totalStatus === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada data presensi hari ini.</p>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="relative w-44 h-44 mx-auto" style={donutStyle}>
                <div className="absolute inset-5 bg-white rounded-full flex flex-col items-center justify-center border border-zinc-100">
                  <p className="text-xs text-zinc-500">Total Hari Ini</p>
                  <p className="text-2xl font-bold text-zinc-900">{totalStatus}</p>
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-zinc-700">
                    <span className="w-3 h-3 rounded-full bg-green-600" /> Hadir
                  </span>
                  <span className="font-semibold">{stats.statusHariIni.Hadir}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-zinc-700">
                    <span className="w-3 h-3 rounded-full bg-blue-600" /> Izin
                  </span>
                  <span className="font-semibold">{stats.statusHariIni.Izin}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-zinc-700">
                    <span className="w-3 h-3 rounded-full bg-amber-600" /> Sakit
                  </span>
                  <span className="font-semibold">{stats.statusHariIni.Sakit}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-zinc-700">
                    <span className="w-3 h-3 rounded-full bg-rose-600" /> Alpa
                  </span>
                  <span className="font-semibold">{stats.statusHariIni.Alpa}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200">
          <div className="flex items-center justify-between mb-5 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-800">Peta Titik Ruangan</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Klik titik untuk melihat daftar ruangan yang berada di lokasi itu.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
              {roomPoints.length} titik
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">Memuat peta ruangan...</p>
          ) : roomPoints.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Belum ada ruangan dengan koordinat peta. Silakan lengkapi titik lokasi di menu Data Ruangan.
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Titik area: {roomPoints.length}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Aktif: {activeClassCount}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  Tidak aktif: {inactiveClassCount}
                </span>
                {roomsWithoutCoordinates > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Tanpa titik: {roomsWithoutCoordinates}
                  </span>
                )}
              </div>

              <RoomMap roomPoints={roomPoints} onEditRoom={handleEditRoom} onEditPointTitle={handleEditPointTitle} height="460px" />

              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                <p className="font-medium text-zinc-800">Klik titik di peta untuk melihat kelas aktif dan tidak aktif pada area itu.</p>
                <p className="mt-1">
                  Setiap titik mewakili area lokasi yang dipakai bersama oleh beberapa ruangan.
                </p>
                {roomsWithoutCoordinates > 0 && (
                  <p className="mt-2 text-amber-700">
                    {roomsWithoutCoordinates} ruangan belum memiliki koordinat peta dan belum tampil di map.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};