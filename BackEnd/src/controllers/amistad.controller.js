// src/controllers/amistad.controller.js
import db from '../config/database.js';

/**
 * Buscar usuarios por nombre
 */
export const buscarUsuarios = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const q      = req.query.q || '';
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `
      SELECT 
        u.id,
        u.nombre,
        u.avatar,

        EXISTS(
          SELECT 1 FROM seguidores s 
          WHERE s.seguidor_id = ? AND s.seguido_id = u.id
        ) AS siguiendo,

        EXISTS(
          SELECT 1 FROM solicitudes_amistad sa
          WHERE sa.emisor_id = ? AND sa.receptor_id = u.id AND sa.estado = 'pendiente'
        ) AS pendiente

      FROM usuarios u
      WHERE u.id != ? 
      AND u.nombre LIKE ?
      ORDER BY u.nombre ASC
      LIMIT ? OFFSET ?
      `,
      [userId, userId, userId, `%${q}%`, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM usuarios u
       WHERE u.id != ? AND u.nombre LIKE ?`,
      [userId, `%${q}%`]
    );

    res.json({ usuarios: rows, total, page, limit, totalPages: Math.ceil(total / limit) });

  } catch (err) {
    next(err);
  }
};


/**
 * Enviar solicitud de amistad
 */
export const enviarSolicitud = async (req, res, next) => {
  try {
    const emisor = req.user.id;
    const { receptor } = req.body;

    // Evitar duplicados
    const [existe] = await db.query(
      `SELECT * FROM solicitudes_amistad 
       WHERE emisor_id = ? AND receptor_id = ? AND estado = 'pendiente'`,
      [emisor, receptor]
    );

    if (existe.length > 0) {
      return res.status(400).json({ msg: "Solicitud ya enviada" });
    }

    await db.query(
      `INSERT INTO solicitudes_amistad (emisor_id, receptor_id) VALUES (?, ?)`,
      [emisor, receptor]
    );

    res.json({ ok: true, msg: "Solicitud enviada" });
  } catch (err) {
    next(err);
  }
};

/**
 * Obtener solicitudes pendientes
 */
export const obtenerSolicitudesPendientes = async (req, res, next) => {
  try {
    const user = req.user.id;

    const [rows] = await db.query(
      `SELECT s.id, u.nombre AS emisor, u.id AS emisor_id, u.avatar
       FROM solicitudes_amistad s
       JOIN usuarios u ON u.id = s.emisor_id
       WHERE s.receptor_id = ? AND s.estado = 'pendiente'`,
      [user]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Aceptar solicitud
 */
export const aceptarSolicitud = async (req, res, next) => {
  try {
    const { id } = req.body;

    await db.query(
      `UPDATE solicitudes_amistad SET estado = 'aceptada' WHERE id = ?`,
      [id]
    );

    const [[sol]] = await db.query(
      `SELECT emisor_id, receptor_id FROM solicitudes_amistad WHERE id = ?`,
      [id]
    );

    // Crear seguimiento (estilo Instagram)
    await db.query(
      `INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)`,
      [sol.emisor_id, sol.receptor_id]
    );

    res.json({ ok: true, msg: "Solicitud aceptada" });
  } catch (err) {
    next(err);
  }
};

/**
 * Rechazar solicitud
 */
export const rechazarSolicitud = async (req, res, next) => {
  try {
    const { id } = req.body;

    await db.query(
      `UPDATE solicitudes_amistad SET estado = 'rechazada' WHERE id = ?`,
      [id]
    );

    res.json({ ok: true, msg: "Solicitud rechazada" });
  } catch (err) {
    next(err);
  }
};

export const getSiguiendo = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT u.id, u.nombre, u.correo
       FROM seguidores s
       JOIN usuarios u ON u.id = s.seguido_id
       WHERE s.seguidor_id = ?`,
      [id]
    );

    res.json(rows);

  } catch (error) {
    console.error("Error en getSiguiendo:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getSeguidores = async (req, res) => {
  try {
    const { id } = req.params;      // tú
    const yo = req.user.id;         // también tú (del token)

    const [rows] = await db.query(
      `SELECT 
         u.id, 
         u.nombre, 
         u.correo,
         EXISTS(
           SELECT 1 FROM seguidores 
           WHERE seguidor_id = ? AND seguido_id = u.id
         ) AS siguiendo
       FROM seguidores s
       JOIN usuarios u ON u.id = s.seguidor_id
       WHERE s.seguido_id = ?`,
      [yo, id]
    );

    res.json(rows);

  } catch (error) {
    console.error("Error en getSeguidores:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
export const unfollowUser = async (req, res) => {
  try {
    const seguidor = req.user.id; // viene del token
    const seguido = req.params.id;

    await db.query(
      "DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?",
      [seguidor, seguido]
    );

    res.json({ message: "Has dejado de seguir a este usuario" });

  } catch (error) {
    console.error("Error en unfollowUser:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
export const followBack = async (req, res) => {
  try {
    const seguidor = req.user.id; // tú
    const seguido = req.params.id; // el que te sigue

    await db.query(
      "INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)",
      [seguidor, seguido]
    );

    res.json({ message: "Ahora sigues a este usuario" });

  } catch (error) {
    console.error("Error en followBack:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
export const getAllUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `
      SELECT 
        u.id,
        u.nombre,
        u.correo,

        EXISTS(
          SELECT 1 FROM seguidores s 
          WHERE s.seguidor_id = ? AND s.seguido_id = u.id
        ) AS siguiendo,

        EXISTS(
          SELECT 1 FROM solicitudes_amistad sa
          WHERE sa.emisor_id = ? AND sa.receptor_id = u.id AND sa.estado = 'pendiente'
        ) AS pendiente

      FROM usuarios u
      WHERE u.id != ?
      ORDER BY u.nombre ASC
      LIMIT ? OFFSET ?
      `,
      [userId, userId, userId, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM usuarios WHERE id != ?`,
      [userId]
    );

    res.json({ usuarios: rows, total, page, limit, totalPages: Math.ceil(total / limit) });

  } catch (err) {
    next(err);
  }
};



