import { Router } from 'express';
import { getCatalog } from "../controllers/libros.controller.js";
import { authMiddleware } from '../middleware/authMiddleware.js';
const router = Router();



router.get("/catalog", getCatalog);

export const librosRoutes = router;