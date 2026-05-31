import db from '../config/database.js';
import { io } from '../app.js';

// ─── Enviar mensaje ───────────────────────────────────────────────────────────
export const enviarMensaje = async (req, res) => {
  try {
    const remitente_id     = req.user.id;
    const { destinatario_id, contenido } = req.body;

    if (!contenido?.trim()) {
      return res.status(400).json({ message: 'El mensaje no puede estar vacío' });
    }

    // Guardar en BD
    const [result] = await db.query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, contenido)
       VALUES (?, ?, ?)`,
      [remitente_id, destinatario_id, contenido.trim()]
    );

    // Obtener el mensaje completo recién insertado para enviarlo por socket
    const [[mensaje]] = await db.query(
      `SELECT m.*, u.nombre AS remitente_nombre
       FROM mensajes m
       JOIN usuarios u ON u.id = m.remitente_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    // Emitir en tiempo real a AMBOS participantes de la conversación
    // Cada usuario escucha en su sala privada `user:<id>`
    io.to(`user:${destinatario_id}`).emit('nuevo_mensaje', mensaje);
    io.to(`user:${remitente_id}`).emit('nuevo_mensaje', mensaje);

    res.json(mensaje);

  } catch (error) {
    console.error('Error en enviarMensaje:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ─── Obtener conversación ─────────────────────────────────────────────────────
export const obtenerConversacion = async (req, res) => {
  try {
    const userId = req.user.id;
    const otroId = req.params.id;

    const [rows] = await db.query(
      `SELECT m.*, u.nombre AS remitente_nombre
       FROM mensajes m
       JOIN usuarios u ON u.id = m.remitente_id
       WHERE (m.remitente_id = ? AND m.destinatario_id = ?)
          OR (m.remitente_id = ? AND m.destinatario_id = ?)
       ORDER BY m.fecha_envio ASC`,
      [userId, otroId, otroId, userId]
    );

    // Marcar como leídos los mensajes recibidos
    await db.query(
      `UPDATE mensajes SET leido = 1
       WHERE remitente_id = ? AND destinatario_id = ? AND leido = 0`,
      [otroId, userId]
    );

    res.json(rows);

  } catch (error) {
    console.error('Error en obtenerConversacion:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ─── Lista de chats ───────────────────────────────────────────────────────────
export const obtenerChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT
          u.id,
          u.nombre,
          u.correo,
          (SELECT contenido FROM mensajes
           WHERE (remitente_id = u.id AND destinatario_id = ?)
              OR (remitente_id = ? AND destinatario_id = u.id)
           ORDER BY fecha_envio DESC LIMIT 1) AS ultimo_mensaje,
          (SELECT fecha_envio FROM mensajes
           WHERE (remitente_id = u.id AND destinatario_id = ?)
              OR (remitente_id = ? AND destinatario_id = u.id)
           ORDER BY fecha_envio DESC LIMIT 1) AS fecha,
          (SELECT COUNT(*) FROM mensajes
           WHERE remitente_id = u.id AND destinatario_id = ? AND leido = 0
          ) AS no_leidos
       FROM usuarios u
       WHERE u.id IN (
         SELECT destinatario_id FROM mensajes WHERE remitente_id = ?
         UNION
         SELECT remitente_id    FROM mensajes WHERE destinatario_id = ?
       )
       ORDER BY fecha DESC`,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    res.json(rows);

  } catch (error) {
    console.error('Error en obtenerChats:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};
