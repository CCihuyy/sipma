import express from 'express';
import {
  getKelasSettings,
  getKelasSettingsByDosen,
  updateKelasSettings,
  deleteKelasSettings
} from '../controllers/kelasSettingsController.js';

const router = express.Router();

router.get('/:kelas_id', getKelasSettings);
router.get('/dosen/:dosen_nidn', getKelasSettingsByDosen);
router.put('/:kelas_id', updateKelasSettings);
router.delete('/:kelas_id', deleteKelasSettings);

export default router;
