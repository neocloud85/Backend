import { Router } from 'express';
import {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  deleteUsuario
} from '../controllers/usuarios.controller.js';

const router = Router();

// Obtener todos los usuarios
router.get('/', getUsuarios);

// Obtener un usuario por ID
router.get('/:id', getUsuarioById);

// Crear usuario (registro)
router.post('/register', createUsuario);

// Eliminar usuario
router.delete('/:id', deleteUsuario);

export const usuariosRoutes = router;