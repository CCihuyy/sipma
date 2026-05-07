import express from 'express';
import { getRuangan, createRuangan, updateRuangan, deleteRuangan } from '../controllers/ruanganController.js';

const router = express.Router();

router.get('/', getRuangan);
router.post('/', createRuangan);
router.put('/:id', updateRuangan);
router.delete('/:id', deleteRuangan);

export default router;