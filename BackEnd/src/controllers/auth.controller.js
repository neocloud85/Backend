// src/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { JWT_SECRET, JWT_EXPIRATION } from '../config/config.js';

/**
 * Clase para errores personalizados
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}
/**
 * Iniciar sesión
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body;

    // Validar campos
    if (!correo || !contrasena) {
      throw new AppError('Correo y contraseña son obligatorios', 400);
    }

    // Buscar usuario con contraseña
    const [users] = await db.query(
      'SELECT id, nombre, correo, contrasena, avatar, tipo, activo FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (users.length === 0) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const user = users[0];

    // Verificar si está activo
    if (!user.activo) {
      throw new AppError('Usuario desactivado', 403);
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(contrasena, user.contrasena);

    if (!isPasswordValid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Generar token
const token = jwt.sign(
  { 
    id: user.id,
    correo: user.correo,
    tipo: user.tipo   // ← IMPORTANTE
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRATION }
);


    // Eliminar contraseña de la respuesta
    delete user.contrasena;

    res.json({
      status: 'success',
      message: 'Login exitoso',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};
