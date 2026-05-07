import express from 'express';
import { getKelas, createKelas, updateKelas, deleteKelas } from '../controllers/kelasController.js';

const router = express.Router();

router.get('/', getKelas);
router.post('/', createKelas);
router.put('/:id', updateKelas);
router.delete('/:id', deleteKelas);

export default router;
