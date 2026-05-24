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
  deleteReviewAdmin
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


export const adminRoutes = router;
