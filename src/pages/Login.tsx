import { useState, useContext, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, User } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const normalizeRole = (role: unknown): User['role'] | null => {
    if (typeof role !== 'string') return null;
    const normalized = role.trim().toLowerCase();
    if (normalized === 'admin' || normalized === 'dosen' || normalized === 'mahasiswa') {
      return normalized;
    }
    return null;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedRole = normalizeRole(data?.user?.role);

        if (!normalizedRole) {
          throw new Error('Invalid role received from server');
        }

        const user: User = {
          id: typeof data.user.id === 'string' ? parseInt(data.user.id, 10) : data.user.id,
          name: data.user.name || data.user.email,
          email: data.user.email,
          role: normalizedRole,
          reference_id: data.user.reference_id,
        };
        auth?.login(data.token, user);
        navigate(`/${normalizedRole}`, { replace: true });
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      console.error(error);
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100 flex flex-col items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="login-blob login-blob-left" />
        <div className="login-blob login-blob-right" />
      </div>

      <div className="relative z-10 text-center mb-7 md:mb-8 login-fade-in">
        <h2 className="text-6xl md:text-8xl font-black text-slate-800 font-academic sipma-word" aria-label="SIPMA">
          <span>S</span>
          <span className="sipma-i">
            <span className="sipma-hat" aria-hidden="true" />
            <span className="sipma-hat-band" aria-hidden="true" />
            I
          </span>
          <span>PMA</span>
        </h2>
        <p className="text-base md:text-lg text-slate-600 mt-2 tracking-wide">Sistem Presensi Mahasiswa</p>
      </div>

      <div className="relative z-10 max-w-md w-full rounded-3xl shadow-2xl p-8 border border-white/70 bg-white/85 backdrop-blur-sm login-fade-in login-fade-in-delay">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Welcome Back</h1>
          <p className="text-zinc-500 mt-2">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="you@university.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
