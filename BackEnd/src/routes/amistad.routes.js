// src/routes/amistad.routes.js
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  buscarUsuarios,
  enviarSolicitud,
  obtenerSolicitudesPendientes,
  aceptarSolicitud,
  rechazarSolicitud,
  getSiguiendo,
  getSeguidores,
  unfollowUser,
  followBack
} from '../controllers/amistad.controller.js';

const router = express.Router();

// Buscar usuarios
router.get('/buscar', authMiddleware, buscarUsuarios);

// Enviar solicitud
router.post('/enviar', authMiddleware, enviarSolicitud);

// Solicitudes pendientes
router.get('/pendientes', authMiddleware, obtenerSolicitudesPendientes);

// Aceptar solicitud
router.post('/aceptar', authMiddleware, aceptarSolicitud);

// Rechazar solicitud
router.post('/rechazar', authMiddleware, rechazarSolicitud);

router.get('/siguiendo/:id', getSiguiendo);
router.get('/seguidores/:id', getSeguidores);

router.delete('/unfollow/:id', authMiddleware, unfollowUser);
router.post('/follow/:id', authMiddleware, followBack);



export const amistadRoutes = router;
