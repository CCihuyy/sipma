import express from 'express';
import { getDosen, getDosenByNidn, createDosen, updateDosen, deleteDosen } from '../controllers/dosenController.js';

const router = express.Router();

router.get('/', getDosen);
router.get('/:nidn', getDosenByNidn);
router.post('/', createDosen);
router.put('/:nidn', updateDosen);
router.delete('/:nidn', deleteDosen);

export default router;
