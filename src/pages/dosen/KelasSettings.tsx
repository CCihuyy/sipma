import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import { Edit2, Save, X, AlertCircle, BookOpen, Settings } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';

type KelasSettings = {
  id: number;
  kelas_id: number;
  matakuliah_id: number;
  dosen_nidn: string;
  batas_keterlambatan: number;
  kontrak_kuliah: string;
  kelas_name: string;
  dosen_name: string;
  matakuliah_name: string;
  matakuliah_code: string;
};

type Kelas = {
  id: number;
  name: string;
};

type Matakuliah = {
  id: number;
  code: string;
  name: string;
};

type JadwalInfo = {
  kelas_id: number;
  kelas_name: string;
  matakuliah_id: number;
  matakuliah_name: string;
  matakuliah_code: string;
};

export const DosenKelasSettings = () => {
  const auth = useContext(AuthContext);
  const [settingsList, setSettingsList] = useState<KelasSettings[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [matakuliahList, setMatakuliahList] = useState<Matakuliah[]>([]);
  const [dosenKelasInfo, setDosenKelasInfo] = useState<JadwalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    kelas_id: '',
    matakuliah_id: '',
    batas_keterlambatan: 15,
    kontrak_kuliah: '',
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load class settings for this dosen
      const settingsRes = await api.get(`/kelas-settings/dosen/${auth?.user?.reference_id}`);
      setSettingsList(settingsRes.data);

      // Load all classes and matakuliah
      const [kelasRes, mkRes] = await Promise.all([
        api.get(`/kelas`),
        api.get(`/matakuliah`)
      ]);
      setKelasList(kelasRes.data);
      setMatakuliahList(mkRes.data);

      // Load jadwal untuk see which (kelas + matakuliah) combinations this dosen teaches
      try {
        const jadwalRes = await api.get(`/jadwal/dosen/${auth?.user?.reference_id}`);
        // Extract unique (kelas_id, kelas_name, matakuliah_id, matakuliah_name) combinations
        const uniqueInfo = new Map<string, JadwalInfo>();
        jadwalRes.data.forEach((j: any) => {
          const key = `${j.kelas_id}-${j.matakuliah_id}`;
          if (!uniqueInfo.has(key)) {
            uniqueInfo.set(key, {
              kelas_id: j.kelas_id,
              kelas_name: j.kelas_name,
              matakuliah_id: j.matakuliah_id,
              matakuliah_name: j.matakuliah_name,
              matakuliah_code: j.matakuliah_code,
            });
          }
        });
        setDosenKelasInfo(Array.from(uniqueInfo.values()));
      } catch (err) {
        console.error('Error loading jadwal:', err);
        // If jadwal endpoint doesn't exist, that's okay - just won't filter
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (settings: KelasSettings) => {
    setEditingId(settings.id);
    setFormData({
      kelas_id: settings.kelas_id.toString(),
      matakuliah_id: settings.matakuliah_id.toString(),
      batas_keterlambatan: settings.batas_keterlambatan,
      kontrak_kuliah: settings.kontrak_kuliah || '',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      kelas_id: '',
      matakuliah_id: '',
      batas_keterlambatan: 15,
      kontrak_kuliah: '',
    });
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!formData.kelas_id || !formData.matakuliah_id) {
      alert('Pilih matakuliah dan kelas terlebih dahulu');
      return;
    }

    try {
      await api.put(`/kelas-settings/${formData.kelas_id}`, {
        dosen_nidn: auth?.user?.reference_id,
        matakuliah_id: parseInt(formData.matakuliah_id),
        batas_keterlambatan: parseInt(formData.batas_keterlambatan.toString()),
        kontrak_kuliah: formData.kontrak_kuliah,
      });

      await loadData();
      handleCancel();
      alert('Pengaturan kelas berhasil disimpan');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      if (error.response?.status === 409) {
        alert('Pengaturan untuk kombinasi matakuliah + kelas ini sudah ada');
      } else {
        alert('Gagal menyimpan pengaturan kelas');
      }
    }
  };

  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      kelas_id: '',
      matakuliah_id: '',
      batas_keterlambatan: 15,
      kontrak_kuliah: '',
    });
    setShowForm(true);
  };

  // Get available kelas for selected matakuliah
  const getAvailableKelas = () => {
    if (!formData.matakuliah_id) return [];
    const mkId = parseInt(formData.matakuliah_id);
    return dosenKelasInfo.filter(info => info.matakuliah_id === mkId);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Pengaturan Kelas" subtitle="Kelola pengaturan batas keterlambatan dan kontrak kuliah" icon={Settings} />
      <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">Pengaturan Kelas</h1>
        {!showForm && (
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Buat Pengaturan Baru
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 mb-8">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            {editingId ? 'Edit' : 'Buat'} Pengaturan Kelas
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Matakuliah *
              </label>
              <select
                value={formData.matakuliah_id}
                onChange={(e) => {
                  setFormData({ ...formData, matakuliah_id: e.target.value, kelas_id: '' });
                }}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={editingId !== null}
              >
                <option value="">Pilih Matakuliah</option>
                {Array.from(
                  new Map(
                    dosenKelasInfo.map(info => [
                      info.matakuliah_id,
                      {
                        id: info.matakuliah_id,
                        code: info.matakuliah_code,
                        name: info.matakuliah_name
                      }
                    ])
                  ).values()
                ).map((mk) => (
                  <option key={mk.id} value={mk.id}>
                    {mk.code} - {mk.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Kelas *
              </label>
              <select
                value={formData.kelas_id}
                onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                disabled={editingId !== null || !formData.matakuliah_id}
              >
                <option value="">Pilih Kelas</option>
                {getAvailableKelas().length === 0 ? (
                  <option disabled>Pilih matakuliah terlebih dahulu</option>
                ) : (
                  getAvailableKelas().map((info) => (
                    <option key={info.kelas_id} value={info.kelas_id}>
                      {info.kelas_name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Batas Keterlambatan (menit) *
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={formData.batas_keterlambatan}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    batas_keterlambatan: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Mahasiswa yang submit absensi setelah batas ini akan dinyatakan terlambat
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Kontrak Perkuliahan
              </label>
              <textarea
                value={formData.kontrak_kuliah}
                onChange={(e) =>
                  setFormData({ ...formData, kontrak_kuliah: e.target.value })
                }
                placeholder="Jelaskan aturan dan harapan untuk kelas ini..."
                rows={6}
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Simpan
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {settingsList.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700 text-sm">
              Belum ada pengaturan kelas. Buat pengaturan baru untuk memulai.
            </p>
          </div>
        ) : (
          settingsList.map((settings) => (
            <div
              key={settings.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">
                        {settings.matakuliah_code} - {settings.matakuliah_name}
                      </h3>
                      <p className="text-sm text-zinc-600">Kelas: {settings.kelas_name}</p>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 mt-3">
                    Batas keterlambatan: <span className="font-medium text-zinc-700">{settings.batas_keterlambatan} menit</span>
                  </p>
                </div>
                <button
                  onClick={() => handleEdit(settings)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              {settings.kontrak_kuliah && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mt-4">
                  <p className="text-xs font-semibold text-amber-900 uppercase mb-2 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    Kontrak Perkuliahan
                  </p>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">
                    {settings.kontrak_kuliah}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
};
