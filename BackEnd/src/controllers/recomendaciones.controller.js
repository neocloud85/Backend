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

// ─── Cache por usuario (1 hora) ──────────────────────────────────────────────
const recoCache = new Map();
const CACHE_TTL  = 60 * 60 * 1000;

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
 * Busca en Google Books con una query y devuelve hasta maxResults libros
 * normalizados, excluyendo los que el usuario ya leyó.
 * Sin langRestrict para maximizar resultados.
 */
async function buscarEnGoogle(query, librosYaVistos, maxResults = 10) {
  const apiKey = process.env.GOOGLE_BOOKS_KEY || process.env.GOOGLE_API_KEY || '';

  const url = `https://www.googleapis.com/books/v1/volumes`
    + `?q=${encodeURIComponent(query)}`
    + `&maxResults=40`
    + `&orderBy=relevance`
    + `&printType=books`
    + (apiKey ? `&key=${apiKey}` : '');   // funciona sin key (con límite menor)

  try {
    const res = await fetchWithRetry(url);
    if (!res || !res.ok) return [];

    const data = await res.json();
    const items = data.items || [];

    return items
      .filter(item =>
        !librosYaVistos.has(item.id) &&
        item.volumeInfo?.title &&
        item.volumeInfo?.imageLinks?.thumbnail   // solo libros con portada
      )
      .slice(0, maxResults)
      .map(item => ({
        id:          item.id,
        titulo:      item.volumeInfo.title,
        autor:       (item.volumeInfo.authors || []).join(', ') || 'Desconocido',
        descripcion: item.volumeInfo.description || '',
        imagen:      item.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:'),
        fromGoogle:  true
      }));
  } catch {
    return [];
  }
}

function deduplicar(libros) {
  const seen = new Set();
  return libros.filter(l => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
}

// ─── Controlador ─────────────────────────────────────────────────────────────
export const recomendaciones = async (req, res, next) => {
  try {
    const usuario_id = req.user.id;

    // Cache
    const cached = recoCache.get(usuario_id);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return res.json(cached.data);
    }

    // ── 1. Historial del usuario ───────────────────────────────────────────
    const [historial] = await db.query(
      `SELECT r.libro_id, r.puntuacion, l.titulo, l.autor
       FROM resenas r
       JOIN libros l ON l.id = r.libro_id
       WHERE r.usuario_id = ?
       ORDER BY r.puntuacion DESC`,
      [usuario_id]
    );

    const librosLeidos = new Set(historial.map(h => h.libro_id));
    const ids = [...librosLeidos];

    // ── Sin historial ─────────────────────────────────────────────────────
    if (historial.length === 0) {
      const [topBD] = await db.query(
        `SELECT l.*, AVG(r.puntuacion) AS nota_media, COUNT(r.id) AS total_resenas
         FROM libros l JOIN resenas r ON r.libro_id = l.id
         GROUP BY l.id HAVING total_resenas >= 1
         ORDER BY nota_media DESC LIMIT 8`
      );

      // Google: varios géneros populares en paralelo para tener suficientes
      const googleLibros = deduplicar((await Promise.all([
        buscarEnGoogle('bestseller novels',          librosLeidos, 10),
        buscarEnGoogle('award winning fiction',      librosLeidos, 10),
        buscarEnGoogle('most popular books 2024',    librosLeidos, 10),
      ])).flat());

      const recomendados = deduplicar([...topBD, ...googleLibros]).slice(0, 24);
      const resultado = { recomendados, motivo: 'top_global', categorias: [] };
      recoCache.set(usuario_id, { ts: Date.now(), data: resultado });
      return res.json(resultado);
    }

    // ── 2. Puntuar etiquetas ──────────────────────────────────────────────
    const [etiquetasLibros] = await db.query(
      `SELECT le.etiqueta_id, e.nombre, r.puntuacion
       FROM libro_etiqueta le
       JOIN etiqueta e ON e.id = le.etiqueta_id
       JOIN resenas r  ON r.libro_id = le.libro_id
       WHERE le.libro_id IN (?) AND r.usuario_id = ?`,
      [ids, usuario_id]
    );

    const scoreMap = new Map();
    for (const { etiqueta_id, nombre, puntuacion } of etiquetasLibros) {
      const e = scoreMap.get(etiqueta_id) || { nombre, score: 0 };
      e.score += puntuacion;
      scoreMap.set(etiqueta_id, e);
    }

    const etiquetasOrdenadas = [...scoreMap.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 6);

    const topEtiquetaIds    = etiquetasOrdenadas.map(([id]) => id);
    const topEtiquetaNames  = etiquetasOrdenadas.map(([, e]) => e.nombre);

    // Si no hay etiquetas en BD, inferir categorías desde títulos/autores
    // usando el diccionario de keywords
    let categoriasInferidas = [];
    if (topEtiquetaNames.length === 0) {
      const textoHistorial = historial.map(h => `${h.titulo} ${h.autor}`).join(' ').toLowerCase();
      for (const [categoria, palabras] of Object.entries(keywords)) {
        if (palabras.some(p => textoHistorial.includes(p.toLowerCase()))) {
          categoriasInferidas.push(categoria);
          if (categoriasInferidas.length >= 3) break;
        }
      }
    }

    const categoriasFinales = topEtiquetaNames.length > 0 ? topEtiquetaNames : categoriasInferidas;

    // ── 3. Libros desde BD ────────────────────────────────────────────────
    let desdeBD = [];
    if (topEtiquetaIds.length > 0) {
      const [rows] = await db.query(
        `SELECT l.*,
                COUNT(DISTINCT le.etiqueta_id) AS coincidencias,
                AVG(r2.puntuacion)             AS nota_media
         FROM libros l
         JOIN libro_etiqueta le ON le.libro_id = l.id
         LEFT JOIN resenas r2   ON r2.libro_id  = l.id
         WHERE le.etiqueta_id IN (?)
         AND   l.id NOT IN (?)
         GROUP BY l.id
         ORDER BY coincidencias DESC, nota_media DESC
         LIMIT 16`,
        [topEtiquetaIds, ids]
      );
      desdeBD = rows;
    }

    // ── 4. Google Books — múltiples queries en paralelo ───────────────────
    const queriesGoogle = [];

    // a) Por etiquetas/categorías top (subject: si está en diccionario)
    for (const nombre of categoriasFinales.slice(0, 3)) {
      queriesGoogle.push(keywords[nombre] ? `subject:"${nombre}"` : nombre);
    }

    // b) Por los autores de libros mejor valorados (>= 4 estrellas)
    const autoresFav = historial
      .filter(h => h.puntuacion >= 4 && h.autor && h.autor !== 'Desconocido')
      .map(h => h.autor)
      .slice(0, 2);
    for (const autor of autoresFav) {
      queriesGoogle.push(`inauthor:"${autor}"`);
    }

    // c) Título del libro favorito para encontrar similares
    if (historial[0]?.titulo) {
      const palabrasTitulo = historial[0].titulo.split(' ').slice(0, 4).join(' ');
      queriesGoogle.push(`"${palabrasTitulo}"`);
    }

    // d) Si no hay nada todavía, fallback a géneros populares
    if (queriesGoogle.length === 0) {
      queriesGoogle.push('bestseller fiction', 'award winning novels');
    }

    // Ejecutar en paralelo
    const resultadosGoogle = await Promise.all(
      queriesGoogle.map(q => buscarEnGoogle(q, librosLeidos, 8))
    );

    let desdeGoogle = deduplicar(resultadosGoogle.flat());

    // Quitar los que ya están en desdeBD
    const bdIds = new Set(desdeBD.map(l => l.id));
    desdeGoogle = desdeGoogle.filter(l => !bdIds.has(l.id));

    // ── 5. Mezclar ────────────────────────────────────────────────────────
    const recomendados = deduplicar([...desdeBD, ...desdeGoogle]).slice(0, 24);

    // Si aun así hay muy pocos, rellenar con más Google
    if (recomendados.length < 8) {
      const extra = await buscarEnGoogle('popular fiction novels', librosLeidos, 16);
      recomendados.push(...extra.filter(l => !new Set(recomendados.map(r => r.id)).has(l.id)));
    }

    const resultado = {
      recomendados: recomendados.slice(0, 24),
      motivo:       topEtiquetaNames.length > 0 ? 'etiquetas' : 'inferido',
      categorias:   categoriasFinales.slice(0, 5)
    };

    recoCache.set(usuario_id, { ts: Date.now(), data: resultado });
    res.json(resultado);

  } catch (error) {
    next(error);
  }
};
