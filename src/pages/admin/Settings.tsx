import { useState, useEffect } from 'react';
import api from '../../services/api';
import { AcademicCalendarPanel } from '../../components/AcademicCalendarPanel';
import { X } from 'lucide-react';

type SystemSettings = {
  id: number;
  tahun_akademik: string;
  semester: 'Ganjil' | 'Genap';
  tanggal_mulai: string;
  tanggal_selesai: string;
};

type LiburAkademik = {
  id: number;
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan?: string;
};

export const AdminSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSettings, setEditingSettings] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingLiburId, setEditingLiburId] = useState<number | null>(null);
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState('');
  const [formSettings, setFormSettings] = useState({
    tahun_akademik: '',
    semester: 'Ganjil' as 'Ganjil' | 'Genap',
    tanggal_mulai: '',
    tanggal_selesai: '',
  });
  const [formLibur, setFormLibur] = useState({
    nama: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    keterangan: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings/system');
      setSettings(res.data);
      if (res.data) {
        setFormSettings({
          tahun_akademik: res.data.tahun_akademik,
          semester: res.data.semester,
          tanggal_mulai: res.data.tanggal_mulai?.split('T')[0] || '',
          tanggal_selesai: res.data.tanggal_selesai?.split('T')[0] || '',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/settings/system', formSettings);
      await loadSettings();
      setEditingSettings(false);
      alert('Pengaturan sistem berhasil diperbarui');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Gagal menyimpan pengaturan');
    }
  };

  const resetLiburForm = () => {
    setIsHolidayModalOpen(false);
    setEditingLiburId(null);
    setSelectedHolidayDate('');
    setFormLibur({ nama: '', tanggal_mulai: '', tanggal_selesai: '', keterangan: '' });
  };

  const handleSaveLibur = async () => {
    if (!formLibur.nama || !formLibur.tanggal_mulai || !formLibur.tanggal_selesai) {
      alert('Harap isi semua field');
      return;
    }

    try {
      if (editingLiburId !== null) {
        await api.put(`/settings/libur/${editingLiburId}`, formLibur);
      } else {
        await api.post('/settings/libur', formLibur);
      }

      setCalendarVersion((value) => value + 1);
      resetLiburForm();
      alert(editingLiburId !== null ? 'Hari libur berhasil diperbarui' : 'Hari libur berhasil ditambahkan');
    } catch (error) {
      console.error('Error saving libur:', error);
      alert(editingLiburId !== null ? 'Gagal memperbarui hari libur' : 'Gagal menambahkan hari libur');
    }
  };

  const handleCalendarDateClick = (date: string) => {
    setEditingLiburId(null);
    setSelectedHolidayDate(date);
    setIsHolidayModalOpen(true);
    setFormLibur((previous) => ({
      ...previous,
      nama: '',
      tanggal_mulai: date,
      tanggal_selesai: date,
      keterangan: '',
    }));
  };

  const handleCalendarHolidayClick = (holiday: LiburAkademik) => {
    setEditingLiburId(holiday.id);
    setSelectedHolidayDate(holiday.tanggal_mulai.slice(0, 10));
    setIsHolidayModalOpen(true);
    setFormLibur({
      nama: holiday.nama,
      tanggal_mulai: holiday.tanggal_mulai.slice(0, 10),
      tanggal_selesai: holiday.tanggal_selesai.slice(0, 10),
      keterangan: holiday.keterangan || '',
    });
  };

  const handleStartEditFromList = (holiday: LiburAkademik) => {
    handleCalendarHolidayClick(holiday);
  };

  const handleDeleteEditingHoliday = async () => {
    if (editingLiburId === null) {
      return;
    }

    if (!confirm('Yakin hapus hari libur ini?')) {
      return;
    }

    try {
      await api.delete(`/settings/libur/${editingLiburId}`);
      setCalendarVersion((value) => value + 1);
      resetLiburForm();
      alert('Hari libur berhasil dihapus');
    } catch (error) {
      console.error('Error deleting libur:', error);
      alert('Gagal menghapus hari libur');
    }
  };

  if (loading) {
    return <div className="text-center text-zinc-600">Memuat...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-zinc-900 mb-6">Pengaturan Sistem</h1>

      {/* Tahun Akademik & Semester */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Tahun Akademik & Semester</h2>
            <p className="text-sm text-zinc-600 mt-1">Tentukan tahun akademik dan semester yang aktif</p>
          </div>
          {!editingSettings && (
            <button
              onClick={() => setEditingSettings(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Edit
            </button>
          )}
        </div>

        {editingSettings ? (
          <div className="space-y-4 bg-zinc-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Tahun Akademik</label>
                <input
                  type="text"
                  value={formSettings.tahun_akademik}
                  onChange={(e) => setFormSettings({ ...formSettings, tahun_akademik: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  placeholder="2024/2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Semester</label>
                <select
                  value={formSettings.semester}
                  onChange={(e) => setFormSettings({ ...formSettings, semester: e.target.value as 'Ganjil' | 'Genap' })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Tanggal Mulai</label>
                <input
                  type="date"
                  value={formSettings.tanggal_mulai}
                  onChange={(e) => setFormSettings({ ...formSettings, tanggal_mulai: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Tanggal Selesai</label>
                <input
                  type="date"
                  value={formSettings.tanggal_selesai}
                  onChange={(e) => setFormSettings({ ...formSettings, tanggal_selesai: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={() => setEditingSettings(false)}
                className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Simpan
              </button>
            </div>
          </div>
        ) : settings ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="text-xs text-zinc-600">Tahun Akademik</p>
              <p className="text-lg font-semibold text-indigo-600">{settings.tahun_akademik}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-zinc-600">Semester</p>
              <p className="text-lg font-semibold text-blue-600">{settings.semester}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-xs text-zinc-600">Tanggal Mulai</p>
              <p className="text-lg font-semibold text-purple-600">{settings.tanggal_mulai}</p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <p className="text-xs text-zinc-600">Tanggal Selesai</p>
              <p className="text-lg font-semibold text-pink-600">{settings.tanggal_selesai}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Hari Libur Akademik */}
      <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">Hari Libur Akademik</h2>
            <p className="text-sm text-zinc-600 mt-1">Klik tanggal kalender untuk menambah, melihat deskripsi, atau mengedit libur</p>
          </div>
        </div>

        <div className="mb-6">
          <AcademicCalendarPanel
            title="Kalender Libur Akademik"
            subtitle="Semua hari libur dikelola langsung dari klik tanggal pada kalender ini dan otomatis tersinkron ke dosen dan mahasiswa."
            showHolidayList={false}
            hideWorldSection
            dataVersion={calendarVersion}
            onDateClick={handleCalendarDateClick}
            onHolidayClick={handleCalendarHolidayClick}
          />
        </div>
      </div>

      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900">
                {editingLiburId !== null ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
              </h3>
              <button
                type="button"
                onClick={resetLiburForm}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-sm text-zinc-600">
              {editingLiburId !== null ? 'Perbarui informasi libur pada tanggal yang dipilih.' : 'Isi detail libur untuk tanggal yang dipilih di kalender.'}
            </p>

            <div className="mt-4 space-y-4">
              {selectedHolidayDate && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                  Tanggal referensi: <span className="font-semibold">{selectedHolidayDate}</span>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Nama Libur</label>
                <input
                  type="text"
                  value={formLibur.nama}
                  onChange={(e) => setFormLibur({ ...formLibur, nama: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  placeholder="Cth: Cuti Bersama Idul Fitri"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={formLibur.tanggal_mulai}
                    onChange={(e) => setFormLibur({ ...formLibur, tanggal_mulai: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={formLibur.tanggal_selesai}
                    onChange={(e) => setFormLibur({ ...formLibur, tanggal_selesai: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Deskripsi Libur</label>
                <textarea
                  value={formLibur.keterangan}
                  onChange={(e) => setFormLibur({ ...formLibur, keterangan: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  rows={3}
                  placeholder="Deskripsi atau catatan libur"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              {editingLiburId !== null && (
                <button
                  type="button"
                  onClick={handleDeleteEditingHoliday}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Hapus
                </button>
              )}
              <button
                type="button"
                onClick={resetLiburForm}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveLibur}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                {editingLiburId !== null ? 'Simpan Perubahan' : 'Simpan Libur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
