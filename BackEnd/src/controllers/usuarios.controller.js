import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';


// Obtener todos los usuarios
export const getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre, correo FROM usuarios");
    res.json(rows);
  } catch (error) {
    console.error("Error en getUsuarios:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Obtener un usuario por ID
export const getUsuarioById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT id, nombre, correo, tipo, activo FROM usuarios WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getUsuarioById:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};


// Crear usuario (registro)
export const createUsuario = async (req, res) => {
  try {
    const { nombre, correo, contrasena } = req.body;

    // Validación básica
    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }
    console.log("BODY RECIBIDO:", req.body);
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
       return res.status(400).json({ message: "Formato de correo inválido" });
    }

    // Comprobar si el correo ya existe
    const [existing] = await pool.query(
      "SELECT id FROM usuarios WHERE correo = ?",
      [correo]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    // Encriptar contraseña SIEMPRE
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Insertar usuario
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)",
      [nombre, correo, hashedPassword]
    );

    res.status(201).json({
      message: "Usuario creado correctamente",
      id: result.insertId
    });

  } catch (error) {
    console.error("Error en createUsuario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Eliminar usuario
export const deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM usuarios WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Usuario eliminado correctamente" });

  } catch (error) {
    console.error("Error en deleteUsuario:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
