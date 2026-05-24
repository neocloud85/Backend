import db from '../config/database.js';

// ===============================
// 📌 LISTA CON PAGINACIÓN
// ===============================
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(`
      SELECT id, nombre, correo, tipo, activo, fecha_creacion
      FROM usuarios
      ORDER BY fecha_creacion DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM usuarios`);

    res.json({
      usuarios: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error obteniendo usuarios" });
  }
};

// ===============================
// 📌 BÚSQUEDA
// ===============================
export const searchUsers = async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;

    const [rows] = await db.query(`
      SELECT id, nombre, correo, tipo, activo, fecha_creacion
      FROM usuarios
      WHERE nombre LIKE ? OR correo LIKE ?
      ORDER BY fecha_creacion DESC
    `, [q, q]);

    res.json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error buscando usuarios" });
  }
};

// ===============================
// 📌 BORRAR USUARIO
// ===============================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`DELETE FROM usuarios WHERE id = ?`, [id]);

    res.json({ status: "success", message: "Usuario eliminado" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error eliminando usuario" });
  }
};

// ===============================
// 📌 EDITAR USUARIO
// ===============================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, tipo, activo } = req.body;

    await db.query(`
      UPDATE usuarios 
      SET nombre = ?, correo = ?, tipo = ?, activo = ?
      WHERE id = ?
    `, [nombre, correo, tipo, activo, id]);

    res.json({ status: "success", message: "Usuario actualizado" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando usuario" });
  }
};

// ===============================
// 📌 HACER ADMIN
// ===============================
export const makeAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(`
      UPDATE usuarios 
      SET tipo = 'admin'
      WHERE id = ?
    `, [id]);

    res.json({ status: "success", message: "Usuario ahora es administrador" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error asignando rol admin" });
  }
  
};

export const getAllReviewsAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.texto, r.puntuacion, r.fecha, 
              u.nombre AS usuario, 
              l.titulo AS libro
       FROM resenas r
       JOIN usuarios u ON u.id = r.usuario_id
       JOIN libros l ON l.id = r.libro_id
       ORDER BY r.fecha DESC`
    );

    res.json(rows);

  } catch (error) {
    console.error("Error en getAllReviewsAdmin:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};


export const deleteReviewAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM resenas WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Reseña no encontrada" });
    }

    res.json({ message: "Reseña eliminada correctamente" });

  } catch (error) {
    console.error("Error en deleteReviewAdmin:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};


