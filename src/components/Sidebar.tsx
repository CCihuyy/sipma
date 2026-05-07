import { useContext, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Users, BookOpen, Calendar, CheckSquare, Clock, LayoutDashboard, MapPin, ChevronDown, Settings, User } from 'lucide-react';

export const Sidebar = () => {
  const auth = useContext(AuthContext);
  const location = useLocation();
  const [adminDataOpen, setAdminDataOpen] = useState(true);

  const adminDashboardLink = { to: '/admin', icon: LayoutDashboard, label: 'Dasbor' };
  const adminDataLinks = [
    { to: '/admin/mahasiswa', icon: Users, label: 'Data Mahasiswa' },
    { to: '/admin/dosen', icon: Users, label: 'Data Dosen' },
    { to: '/admin/kelas', icon: BookOpen, label: 'Data Kelas' },
    { to: '/admin/matakuliah', icon: BookOpen, label: 'Data Mata Kuliah' },
    { to: '/admin/ruangan', icon: MapPin, label: 'Data Ruangan' },
    { to: '/admin/jadwal', icon: Calendar, label: 'Data Jadwal' },
  ];

  const dosenLinks = [
    { to: '/dosen', icon: LayoutDashboard, label: 'Dasbor' },
    { to: '/dosen/attendance', icon: CheckSquare, label: 'Kelola Absensi' },
    { to: '/dosen/recap', icon: BookOpen, label: 'Lihat Rekap' },
    { to: '/dosen/kelas-settings', icon: Settings, label: 'Pengaturan Kelas' },
    { to: '/dosen/kalender-akademik', icon: Calendar, label: 'Kalender Akademik' },
    { to: '/dosen/profile', icon: User, label: 'Profil Saya' },
  ];

  const mahasiswaLinks = [
    { to: '/mahasiswa', icon: LayoutDashboard, label: 'Dasbor' },
    { to: '/mahasiswa/attendance', icon: CheckSquare, label: 'Kirim Absensi' },
    { to: '/mahasiswa/history', icon: Clock, label: 'Riwayat Absensi' },
    { to: '/mahasiswa/kalender-akademik', icon: Calendar, label: 'Kalender Akademik' },
    { to: '/mahasiswa/profile', icon: User, label: 'Profil Saya' },
  ];

  let links: any[] = [];
  if (auth?.user?.role === 'dosen') links = dosenLinks;
  if (auth?.user?.role === 'mahasiswa') links = mahasiswaLinks;

  const isAdminDataRoute = auth?.user?.role === 'admin' && location.pathname.startsWith('/admin/') && location.pathname !== '/admin';

  return (
    <div className="w-64 bg-zinc-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6">
          <h2 className="text-xl font-bold tracking-tight">SIPMA</h2>
        <p className="text-sm text-zinc-400 mt-1 capitalize">Portal {auth?.user?.role}</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {auth?.user?.role === 'admin' && (
          <>
            <NavLink
              to={adminDashboardLink.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5" />
              {adminDashboardLink.label}
            </NavLink>

            <button
              type="button"
              onClick={() => setAdminDataOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                isAdminDataRoute ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <BookOpen className="w-5 h-5" />
                Kelola Data
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${adminDataOpen ? 'rotate-180' : ''}`} />
            </button>

            {adminDataOpen && (
              <div className="space-y-1 pl-2">
                {adminDataLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </NavLink>
                  );
                })}
              </div>
            )}

            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              Pengaturan Sistem
            </NavLink>
          </>
        )}

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin' || link.to === '/dosen' || link.to === '/mahasiswa'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="mb-4 px-3">
          <p className="text-sm font-medium">{auth?.user?.name}</p>
          <p className="text-xs text-zinc-500">{auth?.user?.email}</p>
        </div>
        <button
          onClick={auth?.logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Keluar
        </button>
      </div>
    </div>
  );
};
