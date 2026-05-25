import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import {
  getAllUsers,
  searchUsers,
  deleteUser,
  updateUser,
  makeAdmin,
  getAllReviewsAdmin,
  deleteReviewAdmin,
  getAllChatsAdmin,
  deleteChatAdmin,
  getChatMessagesAdmin,
  deleteMessageAdmin
} from '../controllers/admin.controller.js';

const router = express.Router();

// LISTA + PAGINACIÓN + BÚSQUEDA
router.get('/panel/usuarios', authMiddleware, adminMiddleware, getAllUsers);
router.get('/panel/usuarios/buscar', authMiddleware, adminMiddleware, searchUsers);

// ACCIONES
router.delete('/panel/usuarios/:id', authMiddleware, adminMiddleware, deleteUser);
router.put('/panel/usuarios/:id', authMiddleware, adminMiddleware, updateUser);
router.put('/panel/usuarios/:id/admin', authMiddleware, adminMiddleware, makeAdmin);
router.get('/panel/resenas', getAllReviewsAdmin);
router.delete('/panel/resenas/:id', deleteReviewAdmin);

// CHATS (ADMIN)
router.get('/panel/mensajes/chats', authMiddleware, adminMiddleware, getAllChatsAdmin);
router.delete('/panel/mensajes/chats/:id', authMiddleware, adminMiddleware, deleteChatAdmin);

// MENSAJES (ADMIN)
router.get('/panel/mensajes/:chatId', authMiddleware, adminMiddleware, getChatMessagesAdmin);
router.delete('/panel/mensajes/msg/:id', authMiddleware, adminMiddleware, deleteMessageAdmin);



export const adminRoutes = router;
