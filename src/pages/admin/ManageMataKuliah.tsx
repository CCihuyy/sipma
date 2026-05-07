import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, BookOpen, Layers } from 'lucide-react';
import axios from 'axios';

export const ManageMataKuliah = () => {
  const [data, setData] = useState<{ id: number; code: string; name: string; sks: number; semester: number }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: 0, code: '', name: '', sks: 0, semester: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSemester, setExpandedSemester] = useState<number | null>(null);

  const fetchMataKuliah = async () => {
    try {
      setIsLoading(true);
      // Cache-busting: add timestamp to force fresh request
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/matakuliah?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      console.log(`[FETCH] Data received: ${response.data.length} items`, response.data);
      setData(response.data);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
      alert('Gagal mengambil data matakuliah. Silakan refresh halaman.');
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('[MOUNT] Component mounted, fetching matakuliah data');
    fetchMataKuliah();
  }, []);

  const groupMataKuliahBySemester = () => {
    const grouped: { [key: number]: typeof data } = {};
    
    data.forEach(mk => {
      const semester = mk.semester || 1;
      
      if (!grouped[semester]) {
        grouped[semester] = [];
      }
      grouped[semester].push(mk);
    });
    
    return grouped;
  };

  const handleOpenModal = (mk?: typeof data[0]) => {
    if (mk) {
      console.log(`[EDIT MODAL] Opening edit for id=${mk.id}, semester=${mk.semester}`);
      setFormData(mk);
      setIsEditing(true);
    } else {
      console.log(`[EDIT MODAL] Opening create with default semester=1`);
      setFormData({ id: 0, code: '', name: '', sks: 0, semester: 1 });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus data ini?')) {
      try {
        console.log(`[DELETE] Sending DELETE to /api/matakuliah/${id}`);
        await axios.delete(`/api/matakuliah/${id}`);
        console.log(`[DELETE] DELETE successful`);
        // Add small delay to ensure DB is updated before refetch
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`[DELETE] Refetching data after delete`);
        await fetchMataKuliah();
        console.log(`[DELETE] Data refetched successfully`);
      } catch (error) {
        console.error('Gagal menghapus data:', error);
        alert('Gagal menghapus data.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[SUBMIT] isEditing=${isEditing}, formData=`, formData);
    try {
      if (isEditing) {
        console.log(`[SUBMIT] Sending PUT to /api/matakuliah/${formData.id}`);
        await axios.put(`/api/matakuliah/${formData.id}`, { 
          code: formData.code, 
          name: formData.name, 
          sks: formData.sks,
          semester: formData.semester
        });
        console.log(`[SUBMIT] PUT successful`);
      } else {
        console.log(`[SUBMIT] Sending POST to /api/matakuliah`);
        await axios.post('/api/matakuliah', { 
          code: formData.code, 
          name: formData.name, 
          sks: formData.sks,
          semester: formData.semester
        });
        console.log(`[SUBMIT] POST successful`);
      }
      setIsModalOpen(false);
      // Add small delay to ensure DB is updated before refetch
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log(`[SUBMIT] Refetching data after update/create`);
      await fetchMataKuliah();
      console.log(`[SUBMIT] Data refetched successfully`);
    } catch (error: any) {
      console.error('Gagal menyimpan data:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const groupedData = groupMataKuliahBySemester();
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
            <h1 className="text-4xl font-bold text-white">Data Mata Kuliah</h1>
            <p className="text-slate-400 mt-1">Kelola data mata kuliah per semester</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all border border-indigo-500"
        >
          <Plus className="w-5 h-5" />
          Tambah Mata Kuliah
        </button>
      </div>

      {/* Semester Sections */}
      <div className="space-y-6">
        {semesters.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            Tidak ada data mata kuliah
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
                    ({groupedData[semester].length} mata kuliah)
                  </span>
                </div>
                <span className="text-indigo-200">
                  {expandedSemester === semester ? '▼' : '▶'}
                </span>
              </button>

              {/* Mata Kuliah List */}
              {expandedSemester === semester && (
                <div className="divide-y divide-slate-700">
                  {groupedData[semester].map(mk => (
                    <div
                      key={mk.id}
                      className="px-6 py-4 bg-slate-800 hover:bg-slate-700/50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">
                              {mk.code}
                            </span>
                            <span className="text-sm text-slate-400">
                              ({mk.sks} SKS)
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 mt-1">
                            {mk.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleOpenModal(mk)}
                            className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mk.id)}
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
                {isEditing ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Kode */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Kode
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Contoh: MTK101"
                />
              </div>

              {/* Nama Mata Kuliah */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Nama Mata Kuliah
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Masukkan nama mata kuliah"
                />
              </div>

              {/* SKS */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  SKS
                </label>
                <select
                  value={formData.sks}
                  onChange={(e) =>
                    setFormData({ ...formData, sks: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  {Array.from({ length: 6 }, (_, i) => i + 1).map(sks => (
                    <option key={sks} value={sks}>
                      {sks} SKS
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Semester
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) =>
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
