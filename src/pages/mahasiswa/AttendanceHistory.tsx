import { Clock } from 'lucide-react';
import { useState, useEffect, useContext } from 'react';
import { PageHeader } from '../../components/PageHeader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export const AttendanceHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const auth = useContext(AuthContext);
  const nim = auth?.user?.id?.toString() || '';

  useEffect(() => {
    if (nim) {
      api.get(`/presensi/history/${nim}`)
        .then((res) => setHistory(res.data))
        .catch((err) => console.error(err));
    }
  }, [nim]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hadir':
        return 'bg-emerald-100 text-emerald-700';
      case 'Terlambat':
        return 'bg-orange-100 text-orange-700';
      case 'Izin':
        return 'bg-blue-100 text-blue-700';
      case 'Sakit':
        return 'bg-yellow-100 text-yellow-700';
      case 'Alpa':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-zinc-100 text-zinc-700';
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Riwayat Absensi" subtitle="Lihat histori kehadiran Anda di semua mata kuliah" icon={Clock} />
      <div className="p-6">

      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Date</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Mata Kuliah</th>
              <th className="px-6 py-4 text-sm font-semibold text-zinc-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {history.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 text-sm text-zinc-500">
                  {new Date(row.timestamp).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-900 font-medium">
                  {row.matakuliah_name || row.kelas_name || ''}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};
