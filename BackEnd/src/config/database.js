// src/config/database.js
import mysql from 'mysql2/promise';
import { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } from './config.js';

// Configuración del pool de conexiones
export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z'
});

// Función para verificar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a MySQL exitosa');
    connection.release();
    return true;
  } catch (error) {
    console.error('Error conectando a MySQL:', error);
    return false;
  }
};

// Probar conexión al iniciar
testConnection();

export default pool;