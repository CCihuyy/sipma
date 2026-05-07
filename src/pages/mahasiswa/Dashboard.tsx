import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { Edit, User, Calendar, Award, LayoutDashboard } from 'lucide-react';

export const MahasiswaDashboard = () => {
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [summary, setSummary] = useState({ hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 });
  const [mahasiswa, setMahasiswa] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', semester: 1, foto_url: '' });
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const nim = auth?.user?.id?.toString() || '';

  // Helper function to get day name in Indonesian
  const getDayName = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();
    return days[today.getDay()];
  };

  const fetchTodaySchedule = async (studentNim: string) => {
    try {
      const dayName = getDayName();
      const res = await api.get(`/jadwal/mahasiswa/${studentNim}?hari=${dayName}`);
      setTodaySchedule(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate attendance percentage (18 meetings per semester)
  const TOTAL_MEETINGS = 18;
  const calculateAttendancePercentage = (attendanceData: any) => {
    // Hadir full = 100/18 = 5.56% per meeting
    // Terlambat (half score) = 50/18 = 2.78% per meeting
    // Izin/Sakit = 0% tapi tidak alpa
    // Alpa = 0%
    
    let totalScore = 0;
    const scores: any = {};
    
    // For now, assume each hadir session = 5.56%
    if (attendanceData.hadir > 0) {
      totalScore += attendanceData.hadir * (100 / TOTAL_MEETINGS);
      scores.hadir = attendanceData.hadir * (100 / TOTAL_MEETINGS);
    }
    
    // Late submissions get half score
    if (attendanceData.terlambat > 0) {
      totalScore += attendanceData.terlambat * (50 / TOTAL_MEETINGS);
      scores.terlambat = attendanceData.terlambat * (50 / TOTAL_MEETINGS);
    }
    
    scores.izin = 0; // No points but not marked as absent
    scores.sakit = 0; // No points but not marked as absent
    scores.alpa = 0; // No points
    
    return {
      total: Math.min(totalScore, 100), // Cap at 100%
      hadir: scores.hadir || 0,
      terlambat: scores.terlambat || 0,
    };
  };

  useEffect(() => {
    // Fetch mahasiswa data
    if (nim) {
      api.get(`/mahasiswa/${nim}`)
        .then((res) => {
          setMahasiswa(res.data);
          setEditForm({
            name: res.data.name,
            email: res.data.email,
            semester: res.data.semester,
            foto_url: res.data.foto_url || ''
          });
        })
        .catch((err) => console.error(err));

      // Fetch today's schedule
      fetchTodaySchedule(nim);
    }

    if (nim) {
      api.get(`/presensi/history/${nim}`)
        .then((res) => {
          const counts = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0 };
          res.data.forEach((r: any) => {
            if (r.status === 'Hadir') {
              if (r.is_late === 1) {
                counts.terlambat++;
              } else {
                counts.hadir++;
              }
            } else if (r.status === 'Izin') {
              counts.izin++;
            } else if (r.status === 'Sakit') {
              counts.sakit++;
            } else if (r.status === 'Alpa') {
              counts.alpa++;
            }
          });
          setSummary(counts);
        })
        .catch((err) => console.error(err));
    }
  }, [nim]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/mahasiswa/${nim}`, editForm);
      setMahasiswa({ ...mahasiswa, ...editForm });
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Dashboard Mahasiswa" subtitle="Pantau persentase kehadiran dan jadwal perkuliahan Anda" icon={LayoutDashboard} />
      <div className="p-6">

      {mahasiswa && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 mb-6">
          <div className="flex items-center space-x-4">
            <img
              src={mahasiswa.foto_url || '/default-avatar.png'}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover cursor-pointer"
              onClick={() => setShowEditModal(true)}
            />
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">{mahasiswa.name}</h2>
              <p className="text-zinc-600">NIM: {mahasiswa.nim}</p>
              <p className="text-zinc-600">Email: {mahasiswa.email}</p>
              <p className="text-zinc-600">Semester: {mahasiswa.semester}</p>
              <p className="text-zinc-600">Kelas: {mahasiswa.kelas_name}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Attendance Percentage Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl shadow-sm border border-indigo-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-indigo-700">Persentase Kehadiran</h3>
              <p className="text-xs text-indigo-600 mt-1">Dari 18 Pertemuan Semester</p>
            </div>
            <Award className="w-5 h-5 text-indigo-600" />
          </div>
          
          {/* Percentage Circle */}
          <div className="mb-4">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e7ff" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="8"
                  strokeDasharray={`${(calculateAttendancePercentage(summary).total / 100) * 283}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-900">
                    {calculateAttendancePercentage(summary).total.toFixed(1)}%
                  </p>
                  <p className="text-xs text-indigo-600">Score</p>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-indigo-700">
              <span>Hadir Tepat Waktu:</span>
              <span className="font-semibold">{summary.hadir} × 5.56%</span>
            </div>
            {summary.terlambat > 0 && (
              <div className="flex justify-between text-orange-700">
                <span>Hadir Terlambat:</span>
                <span className="font-semibold">{summary.terlambat} × 2.78%</span>
              </div>
            )}
            <div className="flex justify-between text-blue-600">
              <span>Izin:</span>
              <span className="font-semibold">{summary.izin} (0%)</span>
            </div>
            <div className="flex justify-between text-yellow-600">
              <span>Sakit:</span>
              <span className="font-semibold">{summary.sakit} (0%)</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Alpa:</span>
              <span className="font-semibold">{summary.alpa} (0%)</span>
            </div>
          </div>
        </div>

        {/* Attendance Summary Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
            <h3 className="text-xs font-medium text-zinc-500">✓ Hadir</h3>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{summary.hadir}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
            <h3 className="text-xs font-medium text-zinc-500">⏰ Terlambat</h3>
            <p className="text-2xl font-bold text-orange-600 mt-2">{summary.terlambat}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
            <h3 className="text-xs font-medium text-zinc-500">📄 Izin</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">{summary.izin}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
            <h3 className="text-xs font-medium text-zinc-500">🏥 Sakit</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{summary.sakit}</p>
          </div>
          <div className="col-span-2 bg-white p-4 rounded-xl shadow-sm border border-zinc-200">
            <h3 className="text-xs font-medium text-zinc-500">❌ Alpa</h3>
            <p className="text-2xl font-bold text-red-600 mt-2">{summary.alpa}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-zinc-800">Jadwal Hari Ini ({getDayName()})</h3>
        </div>
        {todaySchedule.length === 0 && <p className="text-zinc-500">Tidak ada jadwal hari ini.</p>}
        {todaySchedule.map((schedule) => (
          <div
            key={schedule.id}
            className="flex items-center justify-between p-4 border border-blue-100 rounded-lg bg-blue-50 mb-3 last:mb-0"
          >
            <div>
              <p className="font-semibold text-blue-900">
                {schedule.matakuliah_name}
              </p>
              <p className="text-sm text-blue-700">
                {schedule.dosen_name} • {schedule.jam_mulai} - {schedule.jam_selesai}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {schedule.ruangan_name} ({schedule.ruangan_location || 'Lokasi TBA'})
              </p>
            </div>
          </div>
        ))}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-zinc-100">
              <h2 className="text-xl font-bold text-zinc-900">Edit Profile</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Semester</label>
                <input
                  type="number"
                  required
                  value={editForm.semester}
                  onChange={(e) => setEditForm({ ...editForm, semester: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Foto URL</label>
                <input
                  type="url"
                  value={editForm.foto_url}
                  onChange={(e) => setEditForm({ ...editForm, foto_url: e.target.value })}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white font-medium py-2 rounded-lg hover:bg-indigo-700"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-zinc-200 text-zinc-700 font-medium py-2 rounded-lg hover:bg-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
