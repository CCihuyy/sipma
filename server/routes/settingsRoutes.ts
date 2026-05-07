import express from 'express';
import {
	getSystemSettings,
	updateSystemSettings,
	getLiburAkademik,
	addLiburAkademik,
	updateLiburAkademik,
	deleteLiburAkademik,
} from '../controllers/settingsController.js';

const router = express.Router();

// System settings
router.get('/system', getSystemSettings);
router.put('/system', updateSystemSettings);

// Hari libur akademik
router.get('/libur', getLiburAkademik);
router.post('/libur', addLiburAkademik);
router.put('/libur/:id', updateLiburAkademik);
router.delete('/libur/:id', deleteLiburAkademik);

export default router;
