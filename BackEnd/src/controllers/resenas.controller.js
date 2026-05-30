import db from '../config/database.js';
import { v4 as uuid } from "uuid";

/**
 * Crear una reseña
 * POST /api/resenas
 */
export const addResena = async (req, res, next) => {
  try {
    const usuario_id = req.user.id;
    const {
      libro_id,
      titulo,
      autor,
      descripcion,
      imagen,
      puntuacion,
      texto
    } = req.body;

    // 1. Insertar libro si no existe
    const [libro] = await db.query(
      "SELECT id FROM libros WHERE id = ?",
      [libro_id]
    );

    if (libro.length === 0) {
      await db.query(
        "INSERT INTO libros (id, titulo, autor, descripcion, imagen) VALUES (?, ?, ?, ?, ?)",
        [libro_id, titulo, autor, descripcion, imagen]
      );
    }

    // 2. Obtener categorías desde Google Books
    const googleRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${libro_id}`
    );
    const data = await googleRes.json();

    let categorias = data.volumeInfo?.categories || [];

    // Separar etiquetas compuestas tipo "Fiction / Fantasy / Epic"
    categorias = categorias.flatMap(cat =>
      cat.split("/").map(c => c.trim())
    );

    // 3. Insertar etiquetas y relaciones
    for (const nombre of categorias) {
      const [etq] = await db.query(
        "SELECT id FROM etiqueta WHERE nombre = ?",
        [nombre]
      );

      let etiqueta_id;

      if (etq.length === 0) {
        const [insert] = await db.query(
          "INSERT INTO etiqueta (nombre) VALUES (?)",
          [nombre]
        );
        etiqueta_id = insert.insertId;
      } else {
        etiqueta_id = etq[0].id;
      }

      await db.query(
        "INSERT IGNORE INTO libro_etiqueta (libro_id, etiqueta_id) VALUES (?, ?)",
        [libro_id, etiqueta_id]
      );
    }

    // 4. Insertar reseña con UUID
    const id = uuid();

    await db.query(
      "INSERT INTO resenas (id, usuario_id, libro_id, puntuacion, texto) VALUES (?, ?, ?, ?, ?)",
      [id, usuario_id, libro_id, puntuacion, texto]
    );

    res.json({ status: "ok", id });

  } catch (error) {
    next(error);
  }
};

export const getMyReviews = async (req, res, next) => {
  try {
    const usuario_id = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT r.*, l.titulo, l.autor
       FROM resenas r
       JOIN libros l ON l.id = r.libro_id
       WHERE r.usuario_id = ?
       ORDER BY r.fecha DESC
       LIMIT ? OFFSET ?`,
      [usuario_id, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM resenas WHERE usuario_id = ?`,
      [usuario_id]
    );

    res.json({ resenas: rows, total, page, limit, totalPages: Math.ceil(total / limit) });

  } catch (error) {
    next(error);
  }
};

export const hasReview = async (req, res, next) => {
  try {
    const usuario_id = req.user.id;
    const libro_id = req.params.libro_id;

    const [rows] = await db.query(
      `SELECT id FROM resenas WHERE usuario_id = ? AND libro_id = ?`,
      [usuario_id, libro_id]
    );

    res.json({ hasReview: rows.length > 0 });

  } catch (error) {
    next(error);
  }
};

export const getAllReviews = async (req, res, next) => {
  try {
    const usuario_id = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT r.*, l.titulo, l.autor, u.nombre AS usuario
       FROM resenas r
       JOIN libros l ON l.id = r.libro_id
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.usuario_id <> ?
       ORDER BY r.fecha DESC
       LIMIT ? OFFSET ?`,
      [usuario_id, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM resenas WHERE usuario_id <> ?`,
      [usuario_id]
    );

    res.json({ resenas: rows, total, page, limit, totalPages: Math.ceil(total / limit) });

  } catch (error) {
    next(error);
  }
};

export const getResenasSeguidos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT 
          r.id,
          r.texto,
          r.puntuacion,
          r.fecha,
          l.id AS libro_id,
          l.titulo,
          l.autor,
          u.nombre AS usuario
       FROM resenas r
       JOIN seguidores s ON s.seguido_id = r.usuario_id
       JOIN libros l ON l.id = r.libro_id
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE s.seguidor_id = ?
       ORDER BY r.fecha DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM resenas r
       JOIN seguidores s ON s.seguido_id = r.usuario_id
       WHERE s.seguidor_id = ?`,
      [userId]
    );

    res.json({ resenas: rows, total, page, limit, totalPages: Math.ceil(total / limit) });

  } catch (err) {
    next(err);
  }
};


export const getTopLibros = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT 
          l.id,
          l.titulo,
          l.autor,
          l.descripcion,
          l.imagen AS portada,
          AVG(r.puntuacion) AS nota_media,
          COUNT(r.id) AS total_resenas
       FROM libros l
       JOIN resenas r ON r.libro_id = l.id
       GROUP BY l.id
       HAVING total_resenas > 0
       ORDER BY nota_media DESC
       LIMIT 10`
    );

    res.json(rows);

  } catch (error) {
    next(error);
  }
};
