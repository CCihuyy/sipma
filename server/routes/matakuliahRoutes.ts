import express from 'express';
import { getMataKuliah, createMataKuliah, updateMataKuliah, deleteMataKuliah } from '../controllers/matakuliahController.js';

const router = express.Router();

router.get('/', getMataKuliah);
router.post('/', createMataKuliah);
router.put('/:id', updateMataKuliah);
router.delete('/:id', deleteMataKuliah);

export default router;
