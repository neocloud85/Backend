import { Router } from "express";
import { authMiddleware } from '../middleware/authMiddleware.js';
import { enviarMensaje, obtenerConversacion, obtenerChats } from "../controllers/mensajes.controller.js";

const router = Router();

router.post('/enviar', authMiddleware, enviarMensaje);
router.get('/conversacion/:id', authMiddleware, obtenerConversacion);
router.get('/chats', authMiddleware, obtenerChats);

export const mensajesRoutes = router;
