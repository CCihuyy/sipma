import { User, Upload, AlertCircle } from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

interface MahasiswaProfile {
  nim: string;
  name: string;
  email: string;
  semester: number;
  kelas_id: number;
  kelas_name?: string;
  foto_url?: string;
}

export const MahasiswaProfile = () => {
  const auth = useContext(AuthContext);
  const [profile, setProfile] = useState<MahasiswaProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const nim = auth?.user?.id;
      const res = await api.get(`/mahasiswa/${nim}`);
      setProfile(res.data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat profil');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran foto maksimal 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData);

      const fotoUrl = res.data.url;

      // Update mahasiswa dengan foto baru
      const nim = auth?.user?.id;
      await api.put(`/mahasiswa/${nim}`, { foto_url: fotoUrl });

      // Refetch profile untuk confirm update berhasil
      await fetchProfile();
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal upload foto');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-zinc-500">Memuat profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-red-600">Profil tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Profil Saya" subtitle="Kelola informasi profil dan foto" icon={User} />
      <div className="p-6">

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Foto & Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="flex flex-col items-center">
            <div className="w-40 h-40 rounded-lg bg-zinc-100 flex items-center justify-center mb-4 overflow-hidden">
              {profile.foto_url ? (
                <img
                  src={profile.foto_url}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-20 h-20 text-zinc-400" />
              )}
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={uploading}
                className="sr-only"
              />
              <button
                type="button"
                onClick={(e) => e.currentTarget.parentElement?.querySelector('input')?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Mengunggah...' : 'Ubah Foto'}
              </button>
            </label>

            <p className="text-xs text-zinc-500 mt-2">Maks 5MB, format: JPG, PNG</p>
          </div>
        </div>

        {/* Profil Data (Read-Only) */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <div className="flex items-start gap-3 mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              Data profil Anda diatur oleh admin. Hubungi admin jika ada data yang perlu diubah.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">NIM</label>
              <div className="px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900 font-medium">
                {profile.nim}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Nama Lengkap</label>
              <div className="px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900">
                {profile.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <div className="px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900">
                {profile.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Semester</label>
              <div className="px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900">
                {profile.semester}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Kelas</label>
              <div className="px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-lg text-zinc-900">
                {profile.kelas_name || 'Belum ditentukan'}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
