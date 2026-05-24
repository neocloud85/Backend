import { Router } from 'express';
import {
  recomendaciones
} from '../controllers/recomendaciones.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = Router();

// Obtener recomendaciones
router.get('/',authMiddleware , recomendaciones);

export const recomendacionesRoutes = router;