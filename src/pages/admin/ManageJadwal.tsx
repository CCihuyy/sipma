import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, BookOpen, Calendar, Search, ChevronDown } from 'lucide-react';
import axios from 'axios';

export const ManageJadwal = () => {
  const [data, setData] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [matakuliahList, setMatakuliahList] = useState<any[]>([]);
  const [dosenList, setDosenList] = useState<any[]>([]);
  const [ruanganList, setRuanganList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    semester: 1,
    kelas_id: '',
    matakuliah_id: '',
    dosen_nidn: '',
    ruangan_id: '',
    hari: 'Senin',
    jam_mulai: '',
    jam_selesai: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSemester, setActiveSemester] = useState<number>(4);
  const [dosenSearch, setDosenSearch] = useState('');
  const [showDosenList, setShowDosenList] = useState(false);
  const [matakuliahSearch, setMatakuliahSearch] = useState('');
  const [showMatakuliahList, setShowMatakuliahList] = useState(false);
  const [showSemesterFilter, setShowSemesterFilter] = useState(false);
  const [selectedSemesters, setSelectedSemesters] = useState<number[]>([]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jadwalRes, kelasRes, mkRes, dosenRes, ruanganRes] = await Promise.all([
        axios.get('/api/jadwal'),
        axios.get('/api/kelas'),
        axios.get('/api/matakuliah'),
        axios.get('/api/dosen'),
        axios.get('/api/ruangan')
      ]);
      setData(jadwalRes.data);
      setKelasList(kelasRes.data);
      setMatakuliahList(mkRes.data);
      setDosenList(dosenRes.data);
      setRuanganList(ruanganRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (data && data.length > 0) {
      const grouped: { [key: number]: any[] } = {};
      data.forEach(jadwal => {
        const semester = jadwal.matakuliah_semester || 1;
        if (!grouped[semester]) {
          grouped[semester] = [];
        }
        grouped[semester].push({ ...jadwal, semester });
      });
      
      const semesters = Object.keys(grouped).map(Number).sort((a, b) => a - b);
      if (semesters.length > 0) {
        if (selectedSemesters.length === 0) {
          setSelectedSemesters(semesters);
        }
        if (!semesters.includes(activeSemester)) {
          setActiveSemester(semesters[0]);
        }
      }
    }
  }, [data]);

  const handleOpenModal = (jadwal?: any) => {
    setDosenSearch('');
    setShowDosenList(false);
    setMatakuliahSearch('');
    setShowMatakuliahList(false);
    if (jadwal) {
      const kelas = kelasList.find(k => k.id === jadwal.kelas_id);
      setFormData({
        id: jadwal.id,
        semester: kelas?.semester || 1,
        kelas_id: jadwal.kelas_id,
        matakuliah_id: jadwal.matakuliah_id,
        dosen_nidn: jadwal.dosen_nidn,
        ruangan_id: jadwal.ruangan_id || '',
        hari: jadwal.hari,
        jam_mulai: jadwal.jam_mulai,
        jam_selesai: jadwal.jam_selesai
      });
      setIsEditing(true);
    } else {
      setFormData({
        id: 0,
        semester: 1,
        kelas_id: '',
        matakuliah_id: matakuliahList[0]?.id || '',
        dosen_nidn: dosenList[0]?.nidn || '',
        ruangan_id: ruanganList[0]?.id || '',
        hari: 'Senin',
        jam_mulai: '',
        jam_selesai: ''
      });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus jadwal ini?')) {
      try {
        await axios.delete(`/api/jadwal/${id}`);
        await new Promise(resolve => setTimeout(resolve, 300));
        await fetchData();
      } catch (error) {
        console.error('Error deleting data:', error);
        alert('Gagal menghapus data.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`/api/jadwal/${formData.id}`, formData);
      } else {
        await axios.post('/api/jadwal', formData);
      }
      setIsModalOpen(false);
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchData();
    } catch (error: any) {
      console.error('Error saving data:', error);
      alert(error.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const groupJadwalBySemester = () => {
    const grouped: { [key: number]: any[] } = {};
    data.forEach(jadwal => {
      const semester = jadwal.matakuliah_semester || 1;
      if (!grouped[semester]) {
        grouped[semester] = [];
      }
      grouped[semester].push({ ...jadwal, semester });
    });
    return grouped;
  };

  const groupedData = groupJadwalBySemester();
  const semesters = Object.keys(groupedData).map(Number).sort((a, b) => a - b);

  const getDayInitial = (day: string) => {
    const dayInitials: { [key: string]: string } = {
      'Senin': 'Sn', 'Selasa': 'Sl', 'Rabu': 'Rb', 'Kamis': 'Km',
      'Jumat': 'Jm', 'Sabtu': 'Sb', 'Minggu': 'Mg'
    };
    return dayInitials[day] || day;
  };

  const getMatakuliahColor = (index: number) => {
    const colors = [
      'bg-blue-50 border-blue-200',
      'bg-purple-50 border-purple-200',
      'bg-pink-50 border-pink-200',
      'bg-green-50 border-green-200',
      'bg-amber-50 border-amber-200',
      'bg-cyan-50 border-cyan-200',
      'bg-indigo-50 border-indigo-200',
      'bg-rose-50 border-rose-200'
    ];
    return colors[index % colors.length];
  };

  const getMatakuliahTextColor = (index: number) => {
    const textColors = [
      'text-blue-700', 'text-purple-700', 'text-pink-700', 'text-green-700',
      'text-amber-700', 'text-cyan-700', 'text-indigo-700', 'text-rose-700'
    ];
    return textColors[index % textColors.length];
  };

  const getDayColor = (day: string) => {
    const colors: { [key: string]: string } = {
      'Senin': 'bg-red-50 border-l-4 border-red-500',
      'Selasa': 'bg-blue-50 border-l-4 border-blue-500',
      'Rabu': 'bg-green-50 border-l-4 border-green-500',
      'Kamis': 'bg-yellow-50 border-l-4 border-yellow-500',
      'Jumat': 'bg-purple-50 border-l-4 border-purple-500',
      'Sabtu': 'bg-pink-50 border-l-4 border-pink-500',
      'Minggu': 'bg-gray-50 border-l-4 border-gray-500'
    };
    return colors[day] || 'bg-gray-50 border-l-4 border-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Data Jadwal Perkuliahan</h1>
            <p className="text-slate-400 text-lg">Kelola jadwal perkuliahan per semester dengan mudah</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all border border-indigo-500"
          >
            <Plus className="w-5 h-5" /> Tambah Jadwal
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 border-4 border-indigo-900 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-300 font-medium">Memuat data jadwal...</p>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 border-2 border-slate-600 rounded-lg p-12 text-center shadow-lg">
          <BookOpen className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
          <p className="text-slate-100 font-bold text-lg mb-2">Belum ada jadwal</p>
          <p className="text-slate-300 mb-6">Klik tombol Tambah Jadwal untuk membuat jadwal pertama Anda</p>
        </div>
      ) : !semesters || semesters.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 border-2 border-slate-600 rounded-lg p-12 text-center shadow-lg">
          <Calendar className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
          <p className="text-slate-100 font-bold text-lg mb-2">Semester Tidak Tersedia</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6 border-b border-slate-700">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <label className="text-indigo-200 font-bold text-sm whitespace-nowrap">Filter Semester:</label>
                <div className="relative">
                  <button
                    onClick={() => setShowSemesterFilter(!showSemesterFilter)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all border border-slate-600"
                  >
                    <Calendar className="w-4 h-4" />
                    {selectedSemesters.length === 0 ? 'Pilih Semester' : `Sem ${selectedSemesters.join(', ')}`}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSemesterFilter ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showSemesterFilter && (
                    <div className="absolute top-full left-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-max">
                      {semesters.map(semester => (
                        <button
                          key={semester}
                          type="button"
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
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedSemesters.includes(semester) 
                              ? 'bg-indigo-500 border-indigo-400' 
                              : 'border-slate-500'
                          }`}>
                            {selectedSemesters.includes(semester) && (
                              <span className="text-white text-sm font-bold">✓</span>
                            )}
                          </div>
                          <span className="font-semibold">Semester {semester}</span>
                          <span className="ml-auto text-xs px-2 py-1 bg-slate-700 rounded-full">
                            {groupedData[semester]?.length || 0} jadwal
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedSemesters.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 bg-opacity-50 rounded-lg border border-slate-600">
                  <span className="text-slate-200 font-semibold text-sm">Total:</span>
                  <span className="text-indigo-300 font-bold text-lg">
                    {selectedSemesters.reduce((sum, sem) => sum + (groupedData[sem]?.length || 0), 0)}
                  </span>
                  <span className="text-slate-200 text-sm">jadwal</span>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700 border-b border-slate-600">
                  <th className="px-6 py-4 text-left font-bold text-slate-200 text-sm uppercase tracking-wide">Hari</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-200 text-sm uppercase tracking-wide">Jam</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-200 text-sm uppercase tracking-wide">Kelas</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-200 text-sm uppercase tracking-wide">Mata Kuliah</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-200 text-sm uppercase tracking-wide">Dosen</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-200 text-sm uppercase tracking-wide">Ruangan</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-200 text-sm uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {selectedSemesters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className="w-12 h-12 text-slate-400 mb-3" />
                        <p className="text-slate-400 font-medium">Silakan pilih minimal satu semester</p>
                      </div>
                    </td>
                  </tr>
                ) : selectedSemesters.reduce((sum, sem) => sum + (groupedData[sem]?.length || 0), 0) === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <BookOpen className="w-12 h-12 text-slate-400 mb-3" />
                        <p className="text-slate-400 font-medium">Tidak ada jadwal untuk semester terpilih</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  selectedSemesters.map(sem =>
                    groupedData[sem]?.map((jadwal, index) => {
                      const kelas = kelasList.find(k => k.id === jadwal.kelas_id);
                      const matakuliah = matakuliahList.find(mk => mk.id === jadwal.matakuliah_id);
                      const dosen = dosenList.find(d => d.nidn === jadwal.dosen_nidn);
                      const ruangan = ruanganList.find(r => r.id === jadwal.ruangan_id);
                      const mkIndex = matakuliahList.findIndex(mk => mk.id === jadwal.matakuliah_id);

                      return (
                        <tr key={jadwal.id} className={`${index % 2 === 0 ? 'bg-slate-800 hover:bg-slate-700/50' : 'bg-slate-750 hover:bg-slate-700/50'} transition-colors`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                {getDayInitial(jadwal.hari)}
                              </div>
                              <span className="font-semibold text-slate-100">{jadwal.hari}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-100 text-sm">{jadwal.jam_mulai}</div>
                            <div className="text-xs text-slate-400">s/d {jadwal.jam_selesai}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-3 py-1.5 bg-indigo-900/40 text-indigo-300 rounded-lg font-semibold text-sm">
                              {kelas?.name || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`px-3 py-2 rounded-lg border ${getMatakuliahColor(mkIndex)}`}>
                              <p className={`font-bold text-xs ${getMatakuliahTextColor(mkIndex)}`}>
                                {matakuliah?.code || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-400 truncate mt-1">
                                {matakuliah?.name || 'N/A'}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <p className="font-semibold text-slate-100">{dosen?.name || 'N/A'}</p>
                              <p className="text-xs text-slate-400">{dosen?.nidn || ''}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-block px-3 py-1.5 bg-green-900/40 text-green-300 rounded-lg font-semibold text-sm">
                              {ruangan?.name || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleOpenModal(jadwal)}
                                className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(jadwal.id)}
                                className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-8 border-b border-slate-700 bg-gradient-to-r from-indigo-600 to-indigo-700">
              <h2 className="text-2xl font-bold text-white">
                {isEditing ? 'Ubah Jadwal' : 'Tambah Jadwal'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setMatakuliahSearch('');
                  setShowMatakuliahList(false);
                }}
                className="text-indigo-200 hover:text-white transition-colors hover:bg-indigo-700 p-2 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-3">Semester</label>
                <select 
                  required 
                  value={formData.semester}
                  onChange={(e) => setFormData({...formData, semester: parseInt(e.target.value), kelas_id: '', matakuliah_id: ''})}
                  className="w-full px-4 py-3 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map(sem => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-3">Kelas</label>
                <select 
                  required 
                  value={formData.kelas_id}
                  onChange={(e) => setFormData({...formData, kelas_id: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList
                    .filter(k => (k.semester || 1) === formData.semester)
                    .map(k => (
                    <option key={k.id} value={k.id}>
                      {k.name} {k.semester ? `(Sem ${k.semester})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-slate-200 mb-3">Mata Kuliah</label>
                <div className="relative">
                  <div className="w-full px-4 py-3 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 flex items-center gap-2 bg-slate-700">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Cari mata kuliah..."
                      value={matakuliahSearch}
                      onChange={(e) => {
                        setMatakuliahSearch(e.target.value);
                        setShowMatakuliahList(true);
                      }}
                      onFocus={() => setShowMatakuliahList(true)}
                      className="flex-1 outline-none font-medium bg-slate-700 text-slate-100 placeholder-slate-400"
                    />
                  </div>
                  {showMatakuliahList && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {matakuliahList
                        .filter(mk => 
                          mk.semester === formData.semester &&
                          (mk.name.toLowerCase().includes(matakuliahSearch.toLowerCase()) ||
                          mk.code.toLowerCase().includes(matakuliahSearch.toLowerCase()))
                        )
                        .map(mk => (
                          <button
                            key={mk.id}
                            type="button"
                            onClick={() => {
                              setFormData({...formData, matakuliah_id: mk.id});
                              setMatakuliahSearch(`${mk.code} - ${mk.name}`);
                              setShowMatakuliahList(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-indigo-900/50 transition-colors border-b border-slate-700 last:border-b-0 ${
                              formData.matakuliah_id === mk.id ? 'bg-indigo-600 font-semibold' : 'text-slate-100'
                            }`}
                          >
                            <p className="font-semibold">{mk.code}</p>
                            <p className="text-xs text-slate-400">{mk.name}</p>
                          </button>
                        ))
                      }
                      {matakuliahList.filter(mk => 
                        mk.semester === formData.semester &&
                        (mk.name.toLowerCase().includes(matakuliahSearch.toLowerCase()) ||
                        mk.code.toLowerCase().includes(matakuliahSearch.toLowerCase()))
                      ).length === 0 && (
                        <div className="px-4 py-4 text-center text-slate-400">
                          Tidak ada mata kuliah yang sesuai
                        </div>
                      )}
                    </div>
                  )}
                  {formData.matakuliah_id && !showMatakuliahList && (
                    <div className="text-xs text-indigo-400 mt-2">
                      ✓ Mata kuliah terpilih: {matakuliahList.find(mk => mk.id === formData.matakuliah_id)?.code} - {matakuliahList.find(mk => mk.id === formData.matakuliah_id)?.name}
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-bold text-slate-200 mb-3">Dosen</label>
                <div className="relative">
                  <div className="w-full px-4 py-3 border border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 flex items-center gap-2 bg-slate-700">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Cari dosen..."
                      value={dosenSearch}
                      onChange={(e) => {
                        setDosenSearch(e.target.value);
                        setShowDosenList(true);
                      }}
                      onFocus={() => setShowDosenList(true)}
                      className="flex-1 outline-none font-medium bg-slate-700 text-slate-100 placeholder-slate-400"
                    />
                  </div>
                  {showDosenList && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {dosenList
                        .filter(d => 
                          d.name.toLowerCase().includes(dosenSearch.toLowerCase()) ||
                          d.nidn.toLowerCase().includes(dosenSearch.toLowerCase())
                        )
                        .map(d => (
                          <button
                            key={d.nidn}
                            type="button"
                            onClick={() => {
                              setFormData({...formData, dosen_nidn: d.nidn});
                              setDosenSearch(d.name);
                              setShowDosenList(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-indigo-900/50 transition-colors border-b border-slate-700 last:border-b-0 ${
                              formData.dosen_nidn === d.nidn ? 'bg-indigo-600 font-semibold' : 'text-slate-100'
                            }`}
                          >
                            <p className="font-semibold">{d.name}</p>
                            <p className="text-xs text-slate-400">{d.nidn}</p>
                          </button>
                        ))
                      }
                      {dosenList.filter(d => 
                        d.name.toLowerCase().includes(dosenSearch.toLowerCase()) ||
                        d.nidn.toLowerCase().includes(dosenSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-4 text-center text-slate-400">
                          Tidak ada dosen yang sesuai
                        </div>
                      )}
                    </div>
                  )}
                  {formData.dosen_nidn && !showDosenList && (
                    <div className="text-xs text-indigo-400 mt-2">
                      ✓ Dosen terpilih: {dosenList.find(d => d.nidn === formData.dosen_nidn)?.name}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-3">Ruangan</label>
                <select 
                  required 
                  value={formData.ruangan_id}
                  onChange={(e) => setFormData({...formData, ruangan_id: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  <option value="">-- Pilih Ruangan --</option>
                  {ruanganList.map(r => (
                    <option key={r.id} value={r.id}>{r.name} - {r.location}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-200 mb-3">Hari</label>
                <select 
                  required 
                  value={formData.hari}
                  onChange={(e) => setFormData({...formData, hari: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                >
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-200 mb-3">Jam Mulai</label>
                  <input 
                    type="time" 
                    required 
                    value={formData.jam_mulai}
                    onChange={(e) => setFormData({...formData, jam_mulai: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-200 mb-3">Jam Selesai</label>
                  <input 
                    type="time" 
                    required 
                    value={formData.jam_selesai}
                    onChange={(e) => setFormData({...formData, jam_selesai: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-600 bg-slate-700 text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-600 bg-slate-700 text-slate-100 font-bold rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all border border-indigo-500"
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

