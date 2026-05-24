// src/routes/booksProxy.routes.js
import express from 'express';
import { obtenerLibrosPorCategoria } from '../controllers/booksProxy.controller.js';

const router = express.Router();

// Obtener libros por categoría (proxy seguro)
router.get('/by-category', obtenerLibrosPorCategoria);

export const booksProxyRoutes = router;
