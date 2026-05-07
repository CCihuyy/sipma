import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import mahasiswaRoutes from './server/routes/mahasiswaRoutes.js';
import dosenRoutes from './server/routes/dosenRoutes.js';
import kelasRoutes from './server/routes/kelasRoutes.js';
import matakuliahRoutes from './server/routes/matakuliahRoutes.js';
import jadwalRoutes from './server/routes/jadwalRoutes.js';
import presensiRoutes from './server/routes/presensiRoutes.js';
import authRoutes from './server/routes/authRoutes.js';
import statsRoutes from './server/routes/statsRoutes.js';
import ruanganRoutes from './server/routes/ruanganRoutes.js';
import presensiRulesRoutes from './server/routes/presensiRulesRoutes.js';
import settingsRoutes from './server/routes/settingsRoutes.js';
import kelasSettingsRoutes from './server/routes/kelasSettingsRoutes.js';
import locationPointRoutes from './server/routes/locationPointRoutes.js';
import uploadRoutes from './server/routes/uploadRoutes.js';
import { autoMarkAlfa } from './server/utils/autoMarkAlfa.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, 'server/uploads')));

  // Disable caching for API responses
  app.use('/api/', (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });

  // API Routes
  app.use('/api/upload', uploadRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/ruangan', ruanganRoutes);
  app.use('/api/location-point', locationPointRoutes);
  app.use('/api/mahasiswa', mahasiswaRoutes);
  app.use('/api/dosen', dosenRoutes);
  app.use('/api/kelas', kelasRoutes);
  app.use('/api/kelas-settings', kelasSettingsRoutes);
  app.use('/api/matakuliah', matakuliahRoutes);
  app.use('/api/jadwal', jadwalRoutes);
  app.use('/api/presensi', presensiRoutes);
  app.use('/api/presensirules', presensiRulesRoutes);
  app.use('/api/settings', settingsRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Schedule auto-mark alfa every minute
  cron.schedule('* * * * *', () => {
    autoMarkAlfa().catch(err => console.error('[CRON] Error in autoMarkAlfa:', err));
  });
  console.log('[CRON] Scheduled auto-mark alfa job (runs every minute)');
}

startServer();
