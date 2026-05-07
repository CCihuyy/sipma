/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { ManageMahasiswa } from './pages/admin/ManageMahasiswa';
import { ManageDosen } from './pages/admin/ManageDosen';
import { ManageKelas } from './pages/admin/ManageKelas';
import { ManageMataKuliah } from './pages/admin/ManageMataKuliah';
import { ManageJadwal } from './pages/admin/ManageJadwal';
import { ManageRuangan } from './pages/admin/ManageRuangan';
import { AdminSettings } from './pages/admin/Settings';
import { DosenDashboard } from './pages/dosen/Dashboard';
import { ManageAttendance } from './pages/dosen/ManageAttendance';
import { ViewRecap } from './pages/dosen/ViewRecap';
import { DosenKelasSettings } from './pages/dosen/KelasSettings';
import { DosenProfile } from './pages/dosen/Profile';
import { DosenAcademicCalendar } from './pages/dosen/AcademicCalendar';
import { MahasiswaDashboard } from './pages/mahasiswa/Dashboard';
import { SubmitAttendance } from './pages/mahasiswa/SubmitAttendance';
import { AttendanceHistory } from './pages/mahasiswa/AttendanceHistory';
import { MahasiswaProfile } from './pages/mahasiswa/Profile';
import { MahasiswaAcademicCalendar } from './pages/mahasiswa/AcademicCalendar';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/unauthorized" element={<div className="p-8 text-center text-red-600 font-bold text-2xl">Unauthorized Access</div>} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/mahasiswa" element={<ManageMahasiswa />} />
              <Route path="/admin/dosen" element={<ManageDosen />} />
              <Route path="/admin/kelas" element={<ManageKelas />} />
              <Route path="/admin/matakuliah" element={<ManageMataKuliah />} />
              <Route path="/admin/jadwal" element={<ManageJadwal />} />
              <Route path="/admin/ruangan" element={<ManageRuangan />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Dosen Routes */}
          <Route element={<ProtectedRoute allowedRoles={['dosen']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dosen" element={<DosenDashboard />} />
              <Route path="/dosen/attendance" element={<ManageAttendance />} />
              <Route path="/dosen/recap" element={<ViewRecap />} />
              <Route path="/dosen/kelas-settings" element={<DosenKelasSettings />} />
              <Route path="/dosen/kalender-akademik" element={<DosenAcademicCalendar />} />
              <Route path="/dosen/profile" element={<DosenProfile />} />
            </Route>
          </Route>

          {/* Mahasiswa Routes */}
          <Route element={<ProtectedRoute allowedRoles={['mahasiswa']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/mahasiswa" element={<MahasiswaDashboard />} />
              <Route path="/mahasiswa/attendance" element={<SubmitAttendance />} />
              <Route path="/mahasiswa/history" element={<AttendanceHistory />} />
              <Route path="/mahasiswa/kalender-akademik" element={<MahasiswaAcademicCalendar />} />
              <Route path="/mahasiswa/profile" element={<MahasiswaProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}
