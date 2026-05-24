// src/routes/auth.routes.js
import express from 'express';
import { login} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';

const router = express.Router();

router.post('/auth/login', validateLogin, login);


export const authRoutes = router;