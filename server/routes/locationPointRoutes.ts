import express from 'express';
import { 
  getLocationPoint, 
  createLocationPoint, 
  updateLocationPoint, 
  deleteLocationPoint 
} from '../controllers/locationPointController.js';

const router = express.Router();

router.get('/', getLocationPoint);
router.post('/', createLocationPoint);
router.put('/', updateLocationPoint);
router.delete('/', deleteLocationPoint);

export default router;
