import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import axios from 'axios';

export const ManageDosen = () => {
  const [data, setData] = useState<{ nidn: string; name: string; email: string }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ nidn: '', name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDosen = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/dosen');
      setData(response.data);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDosen();
  }, []);

  const handleOpenModal = (dosen?: typeof data[0]) => {
    if (dosen) {
      setFormData({ ...dosen, password: '' });
      setIsEditing(true);
    } else {
      setFormData({ nidn: '', name: '', email: '', password: '' });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (nidn: string) => {
    if (window.confirm('Yakin ingin menghapus data ini?')) {
      try {
        await axios.delete(`/api/dosen/${nidn}`);
        fetchDosen();
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
        await axios.put(`/api/dosen/${formData.nidn}`, { name: formData.name, email: formData.email });
      } else {
        await axios.post('/api/dosen', { nidn: formData.nidn, name: formData.name, email: formData.email, password: formData.password });
      }
      setIsModalOpen(false);
      fetchDosen();
    } catch (error: any) {
      console.error('Gagal menyimpan data:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Data Dosen</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all border border-indigo-500"
        >
          <Plus className="w-5 h-5" /> Tambah Dosen
        </button>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-700 border-b border-slate-600">
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">NIDN</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Nama</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Email</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Memuat data...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-400">Data belum tersedia</td>
              </tr>
            ) : (
              data.map((dosen, index) => (
                <tr key={dosen.nidn} className={`hover:bg-slate-700/50 transition-colors ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}`}>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-100">{dosen.nidn}</td>
                  <td className="px-6 py-4 text-sm text-slate-100 font-medium">{dosen.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{dosen.email}</td>
                  <td className="px-6 py-4 text-sm text-right space-x-2">
                    <button 
                      onClick={() => handleOpenModal(dosen)}
                      className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors inline-block"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(dosen.nidn)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors inline-block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {isEditing ? 'Ubah Dosen' : 'Tambah Dosen'}
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
                <label className="block text-sm font-semibold text-slate-200 mb-2">NIDN</label>
                <input 
                  type="text" 
                  required 
                  disabled={isEditing}
                  value={formData.nidn}
                  onChange={(e) => setFormData({...formData, nidn: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Nama Lengkap</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Email</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              {!isEditing && (
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
                  <input 
                    type="password" 
                    required 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              )}
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
