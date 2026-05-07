import express from 'express';
import { getDosenPresensiRules, getPresensiRule, upsertPresensiRule } from '../controllers/presensiRulesController.js';

const router = express.Router();

// Get all rules for a dosen
router.get('/dosen/:dosen_nidn', getDosenPresensiRules);

// Get specific rule
router.get('/:id', getPresensiRule);

// Create or update rule
router.post('/', upsertPresensiRule);
router.put('/:id', upsertPresensiRule);

export default router;
