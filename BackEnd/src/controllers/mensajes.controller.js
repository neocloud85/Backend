import db from '../config/database.js';

export const enviarMensaje = async (req, res) => {
  try {
    const remitente = req.user.id;
    const { destinatario_id, contenido } = req.body;

    await db.query(
      `INSERT INTO mensajes (remitente_id, destinatario_id, contenido)
       VALUES (?, ?, ?)`,
      [remitente, destinatario_id, contenido]
    );

    res.json({ message: "Mensaje enviado" });

  } catch (error) {
    console.error("Error en enviarMensaje:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const obtenerConversacion = async (req, res) => {
  try {
    const userId = req.user.id;
    const otroId = req.params.id;

    const [rows] = await db.query(
      `SELECT *
       FROM mensajes
       WHERE (remitente_id = ? AND destinatario_id = ?)
          OR (remitente_id = ? AND destinatario_id = ?)
       ORDER BY fecha_envio ASC`,
      [userId, otroId, otroId, userId]
    );

    res.json(rows);

  } catch (error) {
    console.error("Error en obtenerConversacion:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

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
           ORDER BY fecha_envio DESC LIMIT 1) AS fecha
       FROM usuarios u
       WHERE u.id IN (
         SELECT destinatario_id FROM mensajes WHERE remitente_id = ?
         UNION
         SELECT remitente_id FROM mensajes WHERE destinatario_id = ?
       )
       ORDER BY fecha DESC`,
      [userId, userId, userId, userId, userId, userId]
    );

    res.json(rows);

  } catch (error) {
    console.error("Error en obtenerChats:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
