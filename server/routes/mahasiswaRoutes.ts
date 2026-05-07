import express from 'express';
import { getMahasiswa, createMahasiswa, updateMahasiswa, deleteMahasiswa, getMahasiswaByNim } from '../controllers/mahasiswaController.js';

const router = express.Router();

router.get('/', getMahasiswa);
router.get('/:nim', getMahasiswaByNim);
router.post('/', createMahasiswa);
router.put('/:nim', updateMahasiswa);
router.delete('/:nim', deleteMahasiswa);

export default router;
