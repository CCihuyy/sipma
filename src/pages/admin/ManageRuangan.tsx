import { useEffect, useState, FormEvent } from 'react';
import { Plus, Edit, Trash2, MapPin, Locate } from 'lucide-react';
import api from '../../services/api';
import { RoomMap, RoomMapPoint } from '../../components/RoomMap';

interface Ruangan {
  id: number;
  name: string;
  location: string;
  latitude: number | string | null;
  longitude: number | string | null;
  radius_meters: number | string | null;
}

interface FormData {
  name: string;
  location: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  location: '',
  latitude: '',
  longitude: '',
  radius_meters: '50',
};

const parseNumber = (value: string) => {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCoordinate = (value: number | string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(6) : 'Belum diatur';
};

const isCoordinateReady = (value: number | string | null) => Number.isFinite(Number(value));

export const ManageRuangan = () => {
  const [ruangan, setRuangan] = useState<Ruangan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ruangan | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const fetchRuangan = () => {
    api.get('/ruangan')
      .then((res) => setRuangan(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchRuangan();
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setFormError(null);
    setGeoError(null);
    setEditing(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const latitude = parseNumber(form.latitude);
    const longitude = parseNumber(form.longitude);
    const radiusMeters = parseNumber(form.radius_meters) ?? 50;

    if (latitude === null || longitude === null) {
      setFormError('Koordinat ruangan wajib diisi. Klik peta untuk menentukan titik lokasi.');
      return;
    }

    if (radiusMeters <= 0) {
      setFormError('Radius absensi harus lebih besar dari 0 meter.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      latitude,
      longitude,
      radius_meters: radiusMeters,
    };

    try {
      setIsSaving(true);
      if (editing) {
        await api.put(`/ruangan/${editing.id}`, payload);
      } else {
        await api.post('/ruangan', payload);
      }

      setShowForm(false);
      resetForm();
      fetchRuangan();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Gagal menyimpan data ruangan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: Ruangan) => {
    setEditing(item);
    setForm({
      name: item.name,
      location: item.location,
      latitude: item.latitude !== null && item.latitude !== undefined ? String(item.latitude) : '',
      longitude: item.longitude !== null && item.longitude !== undefined ? String(item.longitude) : '',
      radius_meters: item.radius_meters !== null && item.radius_meters !== undefined ? String(item.radius_meters) : '50',
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data ini?')) {
      return;
    }

    try {
      await api.delete(`/ruangan/${id}`);
      fetchRuangan();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMapPick = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
    setFormError(null);
  };

  const handleGetCurrentLocation = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Browser Anda tidak mendukung geolocation.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setGeoError(null);
        setIsGettingLocation(false);
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
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const existingRoomPoints = ruangan.reduce<RoomMapPoint[]>((groups, room) => {
    const latitude = Number(room.latitude);
    const longitude = Number(room.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return groups;
    }

    const key = `${latitude.toFixed(6)}:${longitude.toFixed(6)}`;
    const existing = groups.find((group) => group.id === key);

    if (existing) {
      const roomNames = existing.roomNames ?? [];
      if (!roomNames.includes(room.name)) {
        existing.roomNames = [...roomNames, room.name];
      }
      existing.radiusMeters = Math.max(Number(existing.radiusMeters) || 1, Number(room.radius_meters) || 50);
      existing.location = existing.roomNames?.join(', ');
      return groups;
    }

    groups.push({
      id: key,
      title: room.location || room.name || 'Titik lokasi',
      location: room.name,
      latitude,
      longitude,
      radiusMeters: Math.max(1, Number(room.radius_meters) || 50),
      roomNames: [room.name],
    });

    return groups;
  }, []);

  const selectedLatitude = parseNumber(form.latitude);
  const selectedLongitude = parseNumber(form.longitude);
  const selectedRadius = parseNumber(form.radius_meters) ?? 50;

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-4xl font-bold text-white">Data Ruangan</h1>
            <p className="text-slate-400 mt-1">Kelola ruangan, titik peta, dan radius absensi</p>
          </div>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all border border-indigo-500"
        >
          <Plus className="w-5 h-5" />
          Tambah Ruangan
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6 shadow-xl">
          <div className="flex items-start gap-3 mb-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-indigo-100">
            <MapPin className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">
              Klik titik pada peta untuk menentukan lokasi ruangan. Siswa harus berada di dalam radius yang Anda set agar bisa absen Hadir.
            </p>
          </div>

          <h2 className="text-xl font-bold text-white mb-4">{editing ? 'Ubah' : 'Tambah'} Ruangan</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Nama Ruangan</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="LAB PEMROGRAMAN"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Lokasi Ruangan</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Lamacca Lantai 2"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Latitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="-5.123456"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Longitude</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="119.876543"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Radius Absensi (meter)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.radius_meters}
                  onChange={(e) => setForm({ ...form, radius_meters: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isGettingLocation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all border border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Locate className="w-4 h-4" />
                {isGettingLocation ? 'Mendeteksi Lokasi...' : 'Ambil Lokasi Saat Ini'}
              </button>
              {geoError && (
                <p className="text-sm text-red-300 flex-1">{geoError}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-200">Peta Ruangan</label>
                <span className="text-xs text-slate-400">
                  {selectedLatitude !== null && selectedLongitude !== null
                    ? `${selectedLatitude.toFixed(6)}, ${selectedLongitude.toFixed(6)}`
                    : 'Klik peta untuk memilih titik'}
                </span>
              </div>
              <RoomMap
                editable
                latitude={selectedLatitude}
                longitude={selectedLongitude}
                radiusMeters={selectedRadius}
                onSelectLocation={handleMapPick}
                roomPoints={existingRoomPoints}
                height="360px"
              />
              <p className="text-xs text-slate-400">
                Titik yang sudah tersimpan di peta bisa diklik lagi untuk memakai koordinat yang sama.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <span className="rounded-full border border-slate-600 bg-slate-700 px-3 py-1">
                Koordinat: {formatCoordinate(selectedLatitude)} / {formatCoordinate(selectedLongitude)}
              </span>
              <span className="rounded-full border border-slate-600 bg-slate-700 px-3 py-1">
                Radius: {selectedRadius} meter
              </span>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {formError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all border border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Menyimpan...' : editing ? 'Perbarui' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2.5 bg-slate-700 text-slate-100 font-semibold rounded-lg hover:bg-slate-600 transition-all border border-slate-600"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700 border-b border-slate-600">
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Nama</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Lokasi</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Koordinat</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Radius</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {ruangan.map((item: Ruangan, index) => {
              const latitude = Number(item.latitude);
              const longitude = Number(item.longitude);
              const radiusMeters = Number(item.radius_meters) || 50;
              const hasMapLocation = isCoordinateReady(item.latitude) && isCoordinateReady(item.longitude);

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-700/50 transition-colors ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}`}
                >
                  <td className="px-6 py-4 text-sm font-semibold text-slate-100">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{item.location}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    <div>
                      {formatCoordinate(item.latitude)} / {formatCoordinate(item.longitude)}
                    </div>
                    {hasMapLocation && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                      >
                        Buka peta
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{radiusMeters} m</td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors inline-block"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors inline-block"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};