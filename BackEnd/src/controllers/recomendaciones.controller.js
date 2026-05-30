import db from '../config/database.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const keywords = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/categoriasKeywords.json'), 'utf8')
);

// ─── Cache en memoria (24 h por clave de usuario) ────────────────────────────
const recoCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

// ─── Helpers ─────────────────────────────────────────────────────────────────

const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status !== 503) return res;
      await delay(300 + i * 200);
    } catch (e) {
      if (i === retries - 1) throw e;
      await delay(300 + i * 200);
    }
  }
  return null;
}

/**
 * Dado un libro de Google Books, devuelve la categoría normalizada
 * usando el mismo diccionario que booksProxy.
 */
function normalizarCategoria(volumeInfo) {
  const texto = [
    volumeInfo.title        || '',
    volumeInfo.description  || '',
    ...(volumeInfo.categories || [])
  ].join(' ').toLowerCase();

  for (const [categoria, palabras] of Object.entries(keywords)) {
    if (palabras.some(p => texto.includes(p.toLowerCase()))) {
      return categoria;
    }
  }

  const cats = volumeInfo.categories || [];
  for (const c of cats) {
    const base = c.split('/')[0].trim();
    if (keywords[base]) return base;
  }

  return null;
}

/**
 * Busca hasta `maxResults` libros en Google Books por subject.
 * Devuelve un array de objetos con el mismo shape que los libros en BD:
 * { id, titulo, autor, descripcion, imagen }
 * más la flag `fromGoogle: true` para que el frontend pueda distinguirlos.
 */
async function buscarEnGoogle(subject, librosYaVistos, maxResults = 6) {
  if (!process.env.GOOGLE_BOOKS_KEY) return [];

  const url = `https://www.googleapis.com/books/v1/volumes`
    + `?q=subject:${encodeURIComponent(subject)}`
    + `&maxResults=20`
    + `&orderBy=relevance`
    + `&printType=books`
    + `&key=${process.env.GOOGLE_BOOKS_KEY}`;

  const res = await fetchWithRetry(url);
  if (!res || !res.ok) return [];

  const data = await res.json();
  const items = data.items || [];

  return items
    .filter(item => !librosYaVistos.has(item.id) && item.volumeInfo?.imageLinks)
    .slice(0, maxResults)
    .map(item => ({
      id:          item.id,
      titulo:      item.volumeInfo.title || 'Sin título',
      autor:       (item.volumeInfo.authors || []).join(', ') || 'Desconocido',
      descripcion: item.volumeInfo.description || '',
      imagen:      item.volumeInfo.imageLinks?.thumbnail || null,
      fromGoogle:  true
    }));
}

// ─── Controlador principal ───────────────────────────────────────────────────

export const recomendaciones = async (req, res, next) => {
  try {
    const usuario_id = req.user.id;

    // ── Cache ──────────────────────────────────────────────────────────────
    const cached = recoCache.get(usuario_id);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json(cached.data);
    }

    // ── 1. Historial del usuario con puntuación ────────────────────────────
    const [historial] = await db.query(
      `SELECT libro_id, puntuacion
       FROM resenas
       WHERE usuario_id = ?
       ORDER BY puntuacion DESC`,
      [usuario_id]
    );

    if (historial.length === 0) {
      // Sin historial: devolvemos los libros mejor valorados globalmente
      const [topGlobal] = await db.query(
        `SELECT l.*, AVG(r.puntuacion) AS nota_media, COUNT(r.id) AS total_resenas
         FROM libros l
         JOIN resenas r ON r.libro_id = l.id
         GROUP BY l.id
         HAVING total_resenas >= 2
         ORDER BY nota_media DESC
         LIMIT 12`
      );
      return res.json({ recomendados: topGlobal, motivo: 'top_global', categorias: [] });
    }

    const librosLeidos = new Set(historial.map(h => h.libro_id));
    const ids = [...librosLeidos];

    // ── 2. Puntuar etiquetas: frecuencia × puntuación media ────────────────
    //    Cada vez que un libro bien valorado tiene una etiqueta, suma su puntuación.
    //    Así Fiction con 5 reseñas de 5★ pesa mucho más que History con 1 de 3★.
    const [etiquetasLibros] = await db.query(
      `SELECT le.etiqueta_id, e.nombre, r.puntuacion
       FROM libro_etiqueta le
       JOIN etiqueta e       ON e.id        = le.etiqueta_id
       JOIN resenas r        ON r.libro_id  = le.libro_id
       WHERE le.libro_id IN (?)
       AND   r.usuario_id = ?`,
      [ids, usuario_id]
    );

    // Mapa: etiqueta_id → { nombre, score, count }
    const scoreMap = new Map();
    for (const { etiqueta_id, nombre, puntuacion } of etiquetasLibros) {
      const entry = scoreMap.get(etiqueta_id) || { nombre, score: 0, count: 0 };
      entry.score += puntuacion;
      entry.count += 1;
      scoreMap.set(etiqueta_id, entry);
    }

    if (scoreMap.size === 0) {
      // Libros en BD sin etiquetas → usamos top global
      const [topGlobal] = await db.query(
        `SELECT l.*, AVG(r.puntuacion) AS nota_media
         FROM libros l
         JOIN resenas r ON r.libro_id = l.id
         WHERE l.id NOT IN (?)
         GROUP BY l.id
         HAVING nota_media >= 3
         ORDER BY nota_media DESC
         LIMIT 12`,
        [ids]
      );
      return res.json({ recomendados: topGlobal, motivo: 'top_global', categorias: [] });
    }

    // Ordenar etiquetas por score descendente y tomar las top 5
    const etiquetasOrdenadas = [...scoreMap.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5);

    const topEtiquetaIds  = etiquetasOrdenadas.map(([id])          => id);
    const topEtiquetaNames = etiquetasOrdenadas.map(([, e]) => e.nombre);

    // ── 3. Recomendados desde la BD, ordenados por coincidencias ─────────
    //    Cuantas más etiquetas top tiene un libro, mayor su relevancia.
    const [desdeBD] = await db.query(
      `SELECT l.*,
              COUNT(DISTINCT le.etiqueta_id)              AS coincidencias,
              AVG(r2.puntuacion)                          AS nota_media,
              COUNT(DISTINCT r2.id)                       AS total_resenas
       FROM libros l
       JOIN libro_etiqueta le ON le.libro_id = l.id
       LEFT JOIN resenas r2   ON r2.libro_id  = l.id
       WHERE le.etiqueta_id IN (?)
       AND   l.id            NOT IN (?)
       GROUP BY l.id
       ORDER BY coincidencias DESC, nota_media DESC
       LIMIT 20`,
      [topEtiquetaIds, ids]
    );

    // ── 4. Ampliar con Google Books para las categorías top ───────────────
    //    Buscamos con las 2 etiquetas de mayor score que existan en nuestro
    //    diccionario de categorías, para evitar etiquetas muy específicas.
    const categoriasParaGoogle = topEtiquetaNames
      .filter(nombre => keywords[nombre])
      .slice(0, 2);

    let desdeGoogle = [];
    for (const categoria of categoriasParaGoogle) {
      const librosGoogle = await buscarEnGoogle(categoria, librosLeidos, 6);
      desdeGoogle.push(...librosGoogle);
    }

    // Quitar duplicados de Google (mismo id)
    const googleIds = new Set();
    desdeGoogle = desdeGoogle.filter(l => {
      if (googleIds.has(l.id)) return false;
      googleIds.add(l.id);
      return true;
    });

    // ── 5. Mezclar resultados ─────────────────────────────────────────────
    //    Primero los de BD (más fiables, ya reseñados por la comunidad),
    //    luego los de Google (nuevos descubrimientos).
    //    Limitamos el total a 24.
    const recomendados = [
      ...desdeBD.slice(0, 16),
      ...desdeGoogle.slice(0, 8)
    ].slice(0, 24);

    const resultado = {
      recomendados,
      motivo:    'etiquetas',
      categorias: topEtiquetaNames.slice(0, 5)
    };

    recoCache.set(usuario_id, { ts: Date.now(), data: resultado });

    res.json(resultado);

  } catch (error) {
    next(error);
  }
};
