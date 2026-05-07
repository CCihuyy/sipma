import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, BookOpen, Layers } from 'lucide-react';
import axios from 'axios';

export const ManageKelas = () => {
  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    semester: 1,
    is_active: 1
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSemester, setExpandedSemester] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/kelas');
      setData(res.data);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (kelas?: any) => {
    if (kelas) {
      setFormData({
        id: kelas.id,
        name: kelas.name,
        semester: kelas.semester || 4,
        is_active: kelas.is_active || 1
      });
      setIsEditing(true);
    } else {
      setFormData({
        id: 0,
        name: '',
        semester: 4,
        is_active: 1
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus kelas ini?')) {
      try {
        await axios.delete(`/api/kelas/${id}`);
        fetchData();
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
        await axios.put(`/api/kelas/${formData.id}`, formData);
      } else {
        await axios.post('/api/kelas', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Gagal menyimpan data:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  // Group kelas by semester
  const groupKelasBySemester = () => {
    const grouped: { [key: number]: any[] } = {};
    
    data.forEach(kelas => {
      const semester = kelas.semester || 1;
      
      if (!grouped[semester]) {
        grouped[semester] = [];
      }
      grouped[semester].push(kelas);
    });
    
    return grouped;
  };

  const groupedData = groupKelasBySemester();
  const semesters = Object.keys(groupedData)
    .map(Number)
    .sort((a, b) => a - b);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96 text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-4xl font-bold text-white">Manajemen Kelas</h1>
            <p className="text-slate-400 mt-1">Kelola data kelas per semester</p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all border border-indigo-500"
        >
          <Plus className="w-5 h-5" />
          Tambah Kelas
        </button>
      </div>

      {/* Semester Sections */}
      <div className="space-y-6">
        {semesters.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            Tidak ada data kelas
          </div>
        ) : (
          semesters.map(semester => (
            <div
              key={semester}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl"
            >
              {/* Semester Header */}
              <button
                onClick={() =>
                  setExpandedSemester(
                    expandedSemester === semester ? null : semester
                  )
                }
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between hover:bg-indigo-500 transition"
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-indigo-200" />
                  <span className="font-semibold text-white text-lg">
                    Semester {semester}
                  </span>
                  <span className="text-indigo-200 font-medium text-sm">
                    ({groupedData[semester].length} kelas)
                  </span>
                </div>
                <span className="text-indigo-200">
                  {expandedSemester === semester ? '▼' : '▶'}
                </span>
              </button>

              {/* Kelas List */}
              {expandedSemester === semester && (
                <div className="divide-y divide-slate-700">
                  {groupedData[semester].map(kelas => (
                    <div
                      key={kelas.id}
                      className="px-6 py-4 bg-slate-800 hover:bg-slate-700/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-100">
                            {kelas.name}
                          </h3>
                          <div className="mt-2 flex items-center gap-3">
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-medium ${
                                kelas.is_active
                                  ? 'bg-green-900/40 text-green-300'
                                  : 'bg-red-900/40 text-red-300'
                              }`}
                            >
                              {kelas.is_active ? '✓ Aktif' : '✗ Tidak Aktif'}
                            </span>
                            <span className="text-xs text-slate-400">
                              Semester {kelas.semester}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleOpenModal(kelas)}
                            className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(kelas.id)}
                            className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Ubah Kelas' : 'Tambah Kelas'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nama Kelas */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Masukkan nama kelas"
                  required
                />
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Semester
                </label>
                <select
                  value={formData.semester}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      semester: parseInt(e.target.value)
                    })
                  }
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Status
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-all border border-slate-600">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.is_active === 1}
                      onChange={() =>
                        setFormData({ ...formData, is_active: 1 })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-slate-100 font-medium">✓ Aktif</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-all border border-slate-600">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.is_active === 0}
                      onChange={() =>
                        setFormData({ ...formData, is_active: 0 })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-slate-100 font-medium">✗ Tidak Aktif</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
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
                  {isEditing ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
