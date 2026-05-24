// src/routes/categorias.routes.js
import express from 'express';
import { obtenerCategoriasGlobales } from '../controllers/categorias.controller.js';

const router = express.Router();

// Obtener todas las categorías globales
router.get('/globales', obtenerCategoriasGlobales);

export const categoriasRoutes = router;
