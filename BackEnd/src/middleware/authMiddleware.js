import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/config.js';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("HEADER:", req.headers.authorization);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error',
        message: 'No se proporcionó token de autenticación' 
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    // Guardamos el usuario completo en req.user
    req.user = {
      id: decoded.id,
      correo: decoded.correo,
      tipo: decoded.tipo   // ← IMPORTANTE
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'error', message: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Token expirado' });
    }

    return res.status(500).json({ status: 'error', message: 'Error en la autenticación' });
  }
};
