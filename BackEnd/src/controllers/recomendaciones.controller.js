import db from '../config/database.js';

export const recomendaciones = async (req, res, next) => {
  try {
    const usuario_id = req.user.id;

    // 1. Libros con puntuación >= 3
    const [favoritos] = await db.query(
      `SELECT libro_id 
       FROM resenas 
       WHERE usuario_id = ? AND puntuacion >= 3`,
      [usuario_id]
    );

    if (favoritos.length === 0) return res.json([]);

    const ids = favoritos.map(f => f.libro_id);

    // 2. Etiquetas de esos libros
    const [etiquetas] = await db.query(
      `SELECT etiqueta_id 
       FROM libro_etiqueta 
       WHERE libro_id IN (?)`,
      [ids]
    );

    if (etiquetas.length === 0) return res.json([]);

    const etiquetasIds = etiquetas.map(e => e.etiqueta_id);

    // 3. Libros con etiquetas similares
    const [recomendados] = await db.query(
      `SELECT DISTINCT l.*
       FROM libros l
       JOIN libro_etiqueta le ON le.libro_id = l.id
       WHERE le.etiqueta_id IN (?)
       AND l.id NOT IN (?)`,
      [etiquetasIds, ids]
    );

    res.json(recomendados);

  } catch (error) {
    next(error);
  }
};
