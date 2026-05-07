import { useState, useEffect, useContext } from 'react';
import { FileDown, BookOpen } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export const ViewRecap = () => {
  const [matakuliahs, setMatakuliahs] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedMatakuliahId, setSelectedMatakuliahId] = useState<number | null>(null);
  const [selectedKelasId, setSelectedKelasId] = useState<number | null>(null);
  const [recapRows, setRecapRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useContext(AuthContext);
  const nidn = auth?.user?.reference_id || '';

  // fetch mata kuliah taught by this dosen
  useEffect(() => {
    if (nidn) {
      setLoading(true);
      console.log('[ViewRecap] Fetching mata kuliah for NIDN:', nidn);
      api.get(`/jadwal?dosen_nidn=${nidn}`)
        .then((res) => {
          console.log('[ViewRecap] API response:', res.data);
          // Use Map to ensure unique by matakuliah_id
          const mkMap = new Map();
          res.data.forEach((j: any) => {
            if (!mkMap.has(j.matakuliah_id)) {
              mkMap.set(j.matakuliah_id, {
                id: j.matakuliah_id,
                code: j.matakuliah_code,
                name: j.matakuliah_name
              });
            }
          });
          const uniqueMatakuliahs = Array.from(mkMap.values());
          console.log('[ViewRecap] Unique mata kuliah:', uniqueMatakuliahs);
          setMatakuliahs(uniqueMatakuliahs);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[ViewRecap] Error fetching mata kuliah:', err);
          setError('Gagal memuat daftar mata kuliah');
          setLoading(false);
        });
    }
  }, [nidn]);

  // fetch classes for selected mata kuliah
  useEffect(() => {
    if (nidn && selectedMatakuliahId !== null) {
      api.get(`/jadwal?dosen_nidn=${nidn}`)
        .then((res) => {
          // Use Map to ensure unique by kelas_id
          const kelasMap = new Map();
          res.data
            .filter((j: any) => j.matakuliah_id === selectedMatakuliahId)
            .forEach((j: any) => {
              if (!kelasMap.has(j.kelas_id)) {
                kelasMap.set(j.kelas_id, { 
                  id: j.kelas_id, 
                  name: j.kelas_name 
                });
              }
            });
          const filteredClasses = Array.from(kelasMap.values());
          console.log('[ViewRecap] Classes for matakuliah:', filteredClasses);
          setClasses(filteredClasses);
          setSelectedKelasId(null);
        })
        .catch((err) => {
          console.error('[ViewRecap] Error fetching classes:', err);
          setError('Gagal memuat daftar kelas');
        });
    }
  }, [selectedMatakuliahId, nidn]);

  useEffect(() => {
    if (selectedKelasId !== null) {
      const params = selectedMatakuliahId !== null ? { matakuliahId: selectedMatakuliahId } : {};
      api.get(`/presensi/recap/${selectedKelasId}`, { params })
        .then((res) => setRecapRows(res.data))
        .catch((err) => console.error(err));
    }
  }, [selectedKelasId, selectedMatakuliahId]);

  const handleExportPDF = async () => {
    if (!selectedKelasId) return;
    const selectedClass = classes.find((c) => c.id === selectedKelasId);
    const selectedMatakuliah = matakuliahs.find((m) => m.id === selectedMatakuliahId);
    const fileName = `Attendance_${selectedMatakuliah?.code}_${selectedClass?.name}.pdf`;
    try {
      const params = selectedMatakuliahId !== null ? { matakuliahId: selectedMatakuliahId } : {};
      const response = await api.get(`/presensi/export/${selectedKelasId}`, {
        params,
        responseType: 'blob',
      });
      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error('Failed to export PDF', error);
      alert('Failed to export PDF');
    }
  };

  const percentage = (row: any) => {
    if (row.total_sessions) {
      return ((row.total_hadir / row.total_sessions) * 100).toFixed(2) + '%';
    }
    return '0%';
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Lihat Rekap" subtitle="Analisis kehadiran mahasiswa per mata kuliah dan kelas" icon={BookOpen} />
      <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Attendance Recap</h1>
          {nidn && <p className="text-sm text-zinc-500 mt-2">NIDN: {nidn}</p>}
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedMatakuliahId ?? ''}
            onChange={(e) => setSelectedMatakuliahId(Number(e.target.value) || null)}
            className="px-4 py-2 border border-zinc-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Pilih Mata Kuliah --</option>
            {loading ? <option disabled>Memuat mata kuliah...</option> : null}
            {matakuliahs.length === 0 && !loading ? <option disabled>Tidak ada mata kuliah</option> : null}
            {matakuliahs.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>

          <select
            value={selectedKelasId ?? ''}
            onChange={(e) => setSelectedKelasId(Number(e.target.value) || null)}
            disabled={selectedMatakuliahId === null}
            className="px-4 py-2 border border-zinc-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">-- Pilih Kelas --</option>
            {classes.length === 0 && selectedMatakuliahId !== null ? <option disabled>Tidak ada kelas</option> : null}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            disabled={!selectedKelasId}
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 text-zinc-700 font-medium rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" /> Export PDF
          </button>
        </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">Memuat daftar kelas...</p>
        </div>
      )}

      {!loading && matakuliahs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">Tidak ada mata kuliah yang ditemukan</p>
          <p className="text-xs text-zinc-400 mt-2">Pastikan Anda telah ditugaskan untuk mengajar</p>
        </div>
      )}

      {selectedMatakuliahId !== null && classes.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">Tidak ada kelas untuk mata kuliah ini</p>
        </div>
      )}

      {selectedKelasId !== null && recapRows.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">Tidak ada data absensi</p>
        </div>
      )}

      {selectedKelasId !== null && recapRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">NIM</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Name</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600 text-center">Hadir</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600 text-center">Izin</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600 text-center">Sakit</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600 text-center">Alpa</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600 text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {recapRows.map((row) => (
              <tr key={row.nim} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 text-sm text-zinc-900">{row.nim}</td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{row.nama_mahasiswa}</td>
                <td className="px-6 py-4 text-sm text-emerald-600 font-medium text-center">
                  {row.total_hadir}
                </td>
                <td className="px-6 py-4 text-sm text-blue-600 font-medium text-center">
                  {row.total_izin}
                </td>
                <td className="px-6 py-4 text-sm text-yellow-600 font-medium text-center">
                  {row.total_sakit}
                </td>
                <td className="px-6 py-4 text-sm text-red-600 font-medium text-center">
                  {row.total_alpa}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-bold text-right">
                  {percentage(row)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
};
