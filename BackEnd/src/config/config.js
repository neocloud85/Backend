// src/config/config.js
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// Base de datos
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = process.env.DB_PORT || 3307;
export const DB_USER = process.env.DB_USER || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'bookverse';

// JWT
export const JWT_SECRET = process.env.JWT_SECRET ;
export const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

// CORS
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';