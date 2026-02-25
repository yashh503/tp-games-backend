import { Router } from 'express';
import { register, login, googleAuth, refreshTokens, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/refresh', refreshTokens);
router.post('/logout', logout);

export default router;
