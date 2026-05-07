import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Users, Calendar, ChevronDown } from 'lucide-react';
import axios from 'axios';

interface Mahasiswa {
  nim: string;
  name: string;
  email: string;
  is_active?: number;
  semester?: number;
  kelas_id?: number;
}

interface Kelas {
  id: number;
  name: string;
  semester?: number;
}

export const ManageMahasiswa = () => {
  const [data, setData] = useState<Mahasiswa[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ nim: '', name: '', email: '', password: '', semester: '1', kelas_id: '', is_active: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [selectedSemesters, setSelectedSemesters] = useState<number[]>([]);

  const fetchMahasiswa = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/mahasiswa', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      setData(response.data);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKelas = async () => {
    try {
      const response = await axios.get('/api/kelas', {
        headers: { 'Cache-Control': 'no-cache' }
      });
      setKelas(response.data);
    } catch (error) {
      console.error('Gagal mengambil data kelas:', error);
      setKelas([]);
    }
  };

  useEffect(() => {
    fetchMahasiswa();
    fetchKelas();
  }, []);

  // Group mahasiswa by semester
  const groupMahasiswaBySemester = () => {
    const grouped: { [key: number]: Mahasiswa[] } = {};
    
    data.forEach(mhs => {
      const semester = mhs.semester || 1;
      if (!grouped[semester]) {
        grouped[semester] = [];
      }
      grouped[semester].push(mhs);
    });
    
    return grouped;
  };

  const groupedData = groupMahasiswaBySemester();
  const semesters = Object.keys(groupedData)
    .map(Number)
    .sort((a, b) => a - b);

  // Initialize selected semesters
  useEffect(() => {
    if (selectedSemesters.length === 0 && semesters.length > 0) {
      setSelectedSemesters(semesters);
    }
  }, [semesters, selectedSemesters.length]);

  const handleOpenModal = (mhs?: Mahasiswa) => {
    if (mhs) {
      setFormData({
        nim: mhs.nim,
        name: mhs.name,
        email: mhs.email,
        password: '',
        semester: String(mhs.semester || 1),
        kelas_id: String(mhs.kelas_id || ''),
        is_active: mhs.is_active || 1
      });
      setIsEditing(true);
    } else {
      setFormData({
        nim: '',
        name: '',
        email: '',
        password: '',
        semester: '1',
        kelas_id: '',
        is_active: 1
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (nim: string) => {
    if (window.confirm('Yakin ingin menghapus data ini?')) {
      try {
        await axios.delete(`/api/mahasiswa/${nim}`);
        fetchMahasiswa();
      } catch (error) {
        console.error('Gagal menghapus data:', error);
        alert('Gagal menghapus data.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`/api/mahasiswa/${formData.nim}`, {
          name: formData.name,
          email: formData.email,
          semester: parseInt(formData.semester),
          kelas_id: formData.kelas_id ? parseInt(formData.kelas_id) : null,
          is_active: formData.is_active
        });
      } else {
        await axios.post('/api/mahasiswa', {
          nim: formData.nim,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          semester: parseInt(formData.semester),
          kelas_id: formData.kelas_id ? parseInt(formData.kelas_id) : null,
          is_active: formData.is_active
        });
      }
      setIsModalOpen(false);
      fetchMahasiswa();
    } catch (error: any) {
      console.error('Gagal menyimpan data:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96 text-slate-400">
        Memuat data...
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-4xl font-bold text-white">Data Mahasiswa</h1>
            <p className="text-slate-400 mt-1">Kelola data mahasiswa per semester</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all border border-indigo-500"
        >
          <Plus className="w-5 h-5" />
          Tambah Mahasiswa
        </button>
      </div>

      {/* Semester Filter */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowSemesterFilter(!showSemesterFilter)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all border border-slate-600"
          >
            <Calendar className="w-4 h-4" />
            {selectedSemesters.length === 0 ? 'Filter Semester' : `Sem ${selectedSemesters.join(', ')}`}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showSemesterFilter ? 'rotate-180' : ''}`}
            />
          </button>

          {showSemesterFilter && (
            <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-max">
              {semesters.map(semester => (
                <button
                  key={semester}
                  onClick={() => {
                    if (selectedSemesters.includes(semester)) {
                      setSelectedSemesters(selectedSemesters.filter(s => s !== semester));
                    } else {
                      setSelectedSemesters([...selectedSemesters, semester].sort((a, b) => a - b));
                    }
                  }}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0 ${
                    selectedSemesters.includes(semester) ? 'bg-indigo-600 text-white' : 'text-slate-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedSemesters.includes(semester)
                        ? 'bg-indigo-500 border-indigo-400'
                        : 'border-slate-500'
                    }`}
                  >
                    {selectedSemesters.includes(semester) && (
                      <span className="text-white text-sm font-bold">✓</span>
                    )}
                  </div>
                  <span className="font-semibold">Semester {semester}</span>
                  <span className="ml-auto text-xs px-2 py-1 bg-slate-700 rounded-full">
                    {groupedData[semester]?.length || 0} mhs
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSemesters.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 bg-opacity-50 rounded-lg border border-slate-600">
            <span className="text-slate-200 font-semibold text-sm">Total:</span>
            <span className="text-indigo-300 font-bold text-lg">
              {selectedSemesters.reduce((sum, sem) => sum + (groupedData[sem]?.length || 0), 0)}
            </span>
            <span className="text-slate-200 text-sm">mahasiswa</span>
          </div>
        )}
      </div>

      {/* Data Display */}
      {data.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          Tidak ada data mahasiswa
        </div>
      ) : selectedSemesters.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          Silakan pilih minimal satu semester
        </div>
      ) : (
        <div className="space-y-6">
          {selectedSemesters.map(semester => (
            <div key={semester} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
              {/* Semester Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-indigo-200" />
                  <span className="font-bold text-white text-lg">Semester {semester}</span>
                  <span className="text-indigo-200 font-semibold">
                    ({groupedData[semester]?.length || 0} mahasiswa)
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700 border-b border-slate-600">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">NIM</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Nama</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Kelas</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Status</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {groupedData[semester]?.map((mhs, index) => {
                      const kelasDari = kelas.find(k => k.id === mhs.kelas_id);
                      return (
                        <tr
                          key={mhs.nim}
                          className={`hover:bg-slate-700/50 transition-colors ${
                            index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'
                          }`}
                        >
                          <td className="px-6 py-4 text-sm font-semibold text-slate-100">{mhs.nim}</td>
                          <td className="px-6 py-4 text-sm text-slate-100 font-medium">{mhs.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">{mhs.email}</td>
                          <td className="px-6 py-4 text-sm">
                            {kelasDari ? (
                              <span className="px-3 py-1 bg-indigo-900 text-indigo-200 rounded-full font-medium">
                                {kelasDari.name}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {mhs.is_active ? (
                              <span className="px-3 py-1 bg-green-900/40 text-green-300 rounded-full font-medium text-xs">
                                ✓ Aktif
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-red-900/40 text-red-300 rounded-full font-medium text-xs">
                                ✗ Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-right space-x-2">
                            <button
                              onClick={() => handleOpenModal(mhs)}
                              className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors inline-block"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(mhs.nim)}
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
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Ubah Mahasiswa' : 'Tambah Mahasiswa'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">NIM</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={formData.nim}
                  onChange={e => setFormData({ ...formData, nim: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                  placeholder="Masukkan NIM"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Masukkan email"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Semester</label>
                <select
                  value={formData.semester}
                  onChange={e => setFormData({ ...formData, semester: e.target.value, kelas_id: '' })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Kelas</label>
                <select
                  value={formData.kelas_id}
                  onChange={e => setFormData({ ...formData, kelas_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Pilih Kelas (Opsional)</option>
                  {kelas
                    .filter(k => (k.semester || 1) === Number(formData.semester))
                    .map(k => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                </select>
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Masukkan password"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">Status</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-all border border-slate-600">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.is_active === 1}
                      onChange={() => setFormData({ ...formData, is_active: 1 })}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-100 font-medium">✓ Aktif</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-all border border-slate-600">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.is_active === 0}
                      onChange={() => setFormData({ ...formData, is_active: 0 })}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-100 font-medium">✗ Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold rounded-lg transition-all border border-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all border border-indigo-500"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
