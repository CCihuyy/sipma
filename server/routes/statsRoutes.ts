import express from 'express';
import { getStats } from '../controllers/statsController';

const router = express.Router();

router.get('/', getStats);

export default router;