import { Router } from 'express';
import { login, registerUser } from '../controllers/authController.js';

const router = Router();

router.post('/login', login);
router.post('/register', registerUser); // Protected for admin

export default router;