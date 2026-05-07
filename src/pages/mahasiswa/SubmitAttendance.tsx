import React, { useState, useContext, useEffect } from 'react';
import { BookOpen, CheckSquare, CheckCircle2, AlertCircle, LocateFixed, MapPin } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { RoomMap, RoomCoordinates } from '../../components/RoomMap';

const DEFAULT_RADIUS_METERS = 50;

const normalizeNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
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

  return 6371000 * c;
};

const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }

  return `${Math.round(meters)} m`;
};

export const SubmitAttendance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const session = location.state?.session;
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState('Hadir');
  const [submittedStatus, setSubmittedStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(session || null);
  const [currentPosition, setCurrentPosition] = useState<RoomCoordinates | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      fetchActiveSessions();
    }
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const nim = auth?.user?.id?.toString() || '';
      const res = await api.get(`/presensi/sessions/mahasiswa/${nim}`);
      setSessions(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch active sessions');
    }
  };

  const currentSession = selectedSession || session;
  const roomLatitude = normalizeNumber(currentSession?.ruangan_latitude);
  const roomLongitude = normalizeNumber(currentSession?.ruangan_longitude);
  const roomRadiusMeters = normalizeNumber(currentSession?.ruangan_radius_meters) ?? DEFAULT_RADIUS_METERS;
  const roomHasCoordinates = roomLatitude !== null && roomLongitude !== null;
  const studentHasLocation = currentPosition !== null;
  const distanceMeters = roomHasCoordinates && studentHasLocation
    ? calculateDistanceMeters(
        currentPosition.latitude,
        currentPosition.longitude,
        roomLatitude,
        roomLongitude
      )
    : null;
  const isWithinRadius = distanceMeters !== null ? distanceMeters <= roomRadiusMeters : false;
  const requiresLocationCheck = status === 'Hadir';

  const handleActivateLocation = () => {
    setGeoError(null);
    setGeoMessage(null);

    if (!navigator.geolocation) {
      setGeoError('Browser Anda tidak mendukung geolocation.');
      return;
    }

    setIsRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoMessage('Lokasi berhasil aktif. Pastikan Anda berada di area ruangan yang sesuai.');
        setIsRequestingLocation(false);
      },
      (positionError) => {
        if (positionError.code === 1) {
          setGeoError('Izin lokasi ditolak. Aktifkan akses lokasi di browser Anda.');
        } else if (positionError.code === 2) {
          setGeoError('Lokasi perangkat belum tersedia. Pastikan GPS aktif.');
        } else if (positionError.code === 3) {
          setGeoError('Permintaan lokasi melebihi batas waktu. Coba lagi.');
        } else {
          setGeoError('Tidak dapat membaca lokasi perangkat.');
        }
        setIsRequestingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const attendanceSession = selectedSession || session;
    if (!attendanceSession) {
      return;
    }

    if (requiresLocationCheck) {
      if (!roomHasCoordinates) {
        setError('Lokasi ruangan belum diatur oleh admin.');
        return;
      }

      if (!studentHasLocation) {
        setError('Aktifkan lokasi perangkat Anda sebelum mengirim absensi Hadir.');
        return;
      }

      if (distanceMeters !== null && !isWithinRadius) {
        setError(
          `Anda berada ${formatDistance(distanceMeters)} dari titik ruangan. Masuk ke radius ${roomRadiusMeters} meter terlebih dahulu.`
        );
        return;
      }
    }

    try {
      const nim = auth?.user?.id?.toString() || '';
      const payload: Record<string, unknown> = { nim, status };

      if (requiresLocationCheck && currentPosition) {
        payload.latitude = currentPosition.latitude;
        payload.longitude = currentPosition.longitude;
      }

      const res = await api.post(`/presensi/submit/${attendanceSession.jadwal_id}`, payload);
      setSubmitted(true);
      setSubmittedStatus(res.data?.status || status);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit attendance');
    }
  };

  const handleSelectSession = (item: any) => {
    setSelectedSession(item);
    setSubmitted(false);
    setSubmittedStatus('');
    setError(null);
    setGeoError(null);
    setGeoMessage(null);
  };

  const handleBackToList = () => {
    setSelectedSession(null);
    setSubmitted(false);
    setSubmittedStatus('');
    setError(null);
    setGeoError(null);
    setGeoMessage(null);
  };

  if (!selectedSession) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Kirim Absensi" subtitle="Mengabsen kehadiran Anda di sesi yang sedang berlangsung" icon={CheckSquare} />
        <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <h3 className="text-base md:text-lg font-semibold text-zinc-800 mb-4">Sesi Absensi Tersedia</h3>
          {sessions.length === 0 && (
            <p className="text-zinc-500">
              Tidak ada sesi absensi yang tersedia saat ini.
            </p>
          )}
          {sessions.map((item) => {
            const hasMapLocation = roomHasCoordinates || (normalizeNumber(item.ruangan_latitude) !== null && normalizeNumber(item.ruangan_longitude) !== null);
            const latitude = normalizeNumber(item.ruangan_latitude);
            const longitude = normalizeNumber(item.ruangan_longitude);
            const radiusMeters = normalizeNumber(item.ruangan_radius_meters) ?? DEFAULT_RADIUS_METERS;

            return (
              <div key={item.jadwal_id} className="mb-4">
                <button
                  onClick={() => handleSelectSession(item)}
                  className="w-full text-left p-4 border rounded-lg transition-all hover:border-indigo-400"
                  style={{
                    backgroundColor: item.hasSubmitted ? '#f0f9ff' : '#f0fdf4',
                    borderColor: item.hasSubmitted ? '#bfdbfe' : '#bbf7d0',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold" style={{ color: item.hasSubmitted ? '#1e40af' : '#166534' }}>
                          {item.matakuliah_name}
                        </p>
                        {item.hasSubmitted && (
                          <span className="px-2.5 py-0.5 bg-blue-200 text-blue-800 text-xs font-semibold rounded-full">
                            ✓ Sudah Absen
                          </span>
                        )}
                        {!item.hasSubmitted && (
                          <span className="px-2.5 py-0.5 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                            ⏳ Belum Absen
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: item.hasSubmitted ? '#1e3a8a' : '#15803d' }}>
                        {item.dosen_name} • {item.hari} {item.jam_mulai} - {item.jam_selesai}
                      </p>
                      <p className="text-xs mt-1" style={{ color: item.hasSubmitted ? '#1e40af' : '#166534' }}>
                        {item.ruangan_name} ({item.ruangan_location || 'Lokasi TBA'})
                      </p>
                      {hasMapLocation ? (
                        <p className="text-xs mt-1" style={{ color: item.hasSubmitted ? '#1e40af' : '#166534' }}>
                          Radius absensi: {radiusMeters} m •{' '}
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            Buka peta
                          </a>
                        </p>
                      ) : (
                        <p className="text-xs mt-1" style={{ color: item.hasSubmitted ? '#1e40af' : '#166534' }}>
                          Koordinat ruangan belum diatur
                        </p>
                      )}
                      {item.hasSubmitted && (
                        <p className="text-xs mt-2" style={{ color: '#0284c7' }}>
                          Status: <span className="font-semibold">{item.attendance_status}</span>
                          {item.is_late === 1 && item.attendance_status === 'Hadir' && <span className="ml-1">⏰ Terlambat</span>}
                        </p>
                      )}
                    </div>
                    <span className="text-lg ml-2">›</span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    );
  }

  if (!session && !selectedSession) {
    return (
      <div>
        <p className="text-red-600">No attendance session selected.</p>
        <button onClick={() => navigate('/mahasiswa')} className="mt-4 underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div>
        <p className="text-red-600">No attendance session selected.</p>
        <button onClick={() => navigate('/mahasiswa')} className="mt-4 underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Kirim Absensi" subtitle="Mengabsen kehadiran Anda di sesi yang sedang berlangsung" icon={CheckSquare} />
      <div className="p-6">

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <div className="max-w-2xl bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 border-b border-zinc-200">
              <h2 className="text-lg md:text-xl font-semibold text-zinc-900">
                {currentSession.matakuliah_name}
              </h2>
              <p className="text-zinc-600 mt-2">
                {currentSession.dosen_name} • {currentSession.kelas_name} • {currentSession.hari}{' '}
                {currentSession.jam_mulai} - {currentSession.jam_selesai}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {currentSession.ruangan_name} ({currentSession.ruangan_location})
              </p>
            </div>

            <div className="p-6">
              {currentSession.kontrak_kuliah && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900">Kontrak Kuliah</h4>
                      <p className="text-sm text-amber-700 mt-1 whitespace-pre-wrap leading-relaxed">
                        {currentSession.kontrak_kuliah}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!currentSession.kontrak_kuliah && !currentSession.hasSubmitted && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Kontrak Kuliah Belum Diatur</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Dosen belum mengatur kontrak kuliah untuk mata kuliah ini. Saat ini, keterlambatan belum akan dihitung meski Anda absen setelah jam dimulai.
                    </p>
                  </div>
                </div>
              )}

              {currentSession.hasSubmitted && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Anda sudah mengabsen untuk sesi ini</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Status: <span className="font-semibold">{currentSession.attendance_status}</span>
                      {currentSession.is_late === 1 && <span className="ml-1">⏰ Terlambat</span>}
                    </p>
                  </div>
                </div>
              )}

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                    submittedStatus === 'Terlambat'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">Absensi Berhasil Dikirim!</h3>
                  <p className="text-zinc-500 mt-2">
                    Status Anda: <span className={`font-semibold ${
                      submittedStatus === 'Terlambat'
                        ? 'text-orange-600'
                        : 'text-emerald-600'
                    }`}>
                      {submittedStatus}
                    </span>
                  </p>
                  {submittedStatus === 'Terlambat' && (
                    <p className="text-sm text-orange-600 mt-2">⏰ Anda absen melebihi batas keterlambatan</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {!currentSession.hasSubmitted && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-zinc-700 mb-3">
                        Pilih Status Kehadiran
                      </label>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {['Hadir', 'Izin', 'Sakit'].map((opt) => (
                          <label
                            key={opt}
                            className={`flex items-center justify-center p-4 border rounded-xl cursor-pointer transition-all text-center font-medium ${
                              status === opt
                                ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 text-indigo-900'
                                : 'border-zinc-200 hover:border-indigo-300 text-zinc-700'
                            }`}
                          >
                            <input
                              type="radio"
                              name="status"
                              value={opt}
                              checked={status === opt}
                              onChange={(e) => {
                                setStatus(e.target.value);
                                setError(null);
                              }}
                              className="sr-only"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      {requiresLocationCheck && (
                        <p className="mt-3 text-xs text-zinc-500">
                          Status Hadir wajib mengaktifkan lokasi dan berada di dalam radius ruangan.
                        </p>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  {!currentSession.hasSubmitted && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="submit"
                        disabled={requiresLocationCheck && (!roomHasCoordinates || !studentHasLocation || (distanceMeters !== null && !isWithinRadius))}
                        className="flex-1 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm md:text-base"
                      >
                        Kirim Absensi
                      </button>
                      {selectedSession && !session && (
                        <button
                          type="button"
                          onClick={handleBackToList}
                          className="flex-1 py-3 bg-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-300 transition-colors text-sm md:text-base"
                        >
                          Kembali
                        </button>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-zinc-800">Peta Ruangan</h3>
            </div>
            <div className="p-4 space-y-3">
              {roomHasCoordinates ? (
                <>
                  <RoomMap
                    latitude={roomLatitude}
                    longitude={roomLongitude}
                    radiusMeters={roomRadiusMeters}
                    studentPosition={currentPosition}
                    height="280px"
                  />
                  <p className="text-sm text-zinc-500">
                    Titik biru menunjukkan posisi Anda. Area ungu adalah radius absensi ruangan.
                  </p>
                </>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Lokasi ruangan belum diatur. Absen Hadir tidak bisa dilakukan sampai admin mengisi koordinat ruangan.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center gap-2">
              <LocateFixed className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-zinc-800">Lokasi Perangkat</h3>
            </div>
            <div className="p-4 space-y-3">
              <button
                type="button"
                onClick={handleActivateLocation}
                disabled={isRequestingLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <LocateFixed className="w-4 h-4" />
                {isRequestingLocation
                  ? 'Mendeteksi lokasi...'
                  : currentPosition
                    ? 'Perbarui Lokasi'
                    : 'Aktifkan Lokasi'}
              </button>

              {geoError && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                  {geoError}
                </div>
              )}

              {geoMessage && (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
                  {geoMessage}
                </div>
              )}

              {currentPosition ? (
                <div className="space-y-2 text-sm text-zinc-600">
                  <p>
                    Latitude: <span className="font-medium text-zinc-900">{currentPosition.latitude.toFixed(6)}</span>
                  </p>
                  <p>
                    Longitude: <span className="font-medium text-zinc-900">{currentPosition.longitude.toFixed(6)}</span>
                  </p>
                  {roomHasCoordinates && distanceMeters !== null && (
                    <>
                      <p>
                        Jarak ke ruangan: <span className="font-medium text-zinc-900">{formatDistance(distanceMeters)}</span>
                      </p>
                      <p>
                        Radius absensi: <span className="font-medium text-zinc-900">{roomRadiusMeters} m</span>
                      </p>
                      <p className={`font-medium ${isWithinRadius ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isWithinRadius ? 'Anda berada di dalam radius absensi.' : 'Anda masih di luar radius absensi.'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Aktifkan lokasi perangkat sebelum mengirim absensi Hadir.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-zinc-800">Aturan Singkat</h3>
            </div>
            <ul className="space-y-2 text-sm text-zinc-600 leading-relaxed">
              <li>Status Hadir harus memakai GPS aktif.</li>
              <li>Posisi Anda harus masuk radius ruangan.</li>
              <li>Status Izin dan Sakit tetap bisa dikirim tanpa radius lokasi.</li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};