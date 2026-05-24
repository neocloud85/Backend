// src/controllers/booksProxy.controller.js
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const keywordsPath = path.join(__dirname, "../data/categoriasKeywords.json");
const keywords = JSON.parse(fs.readFileSync(keywordsPath, "utf8"));

const cache = new Map();
const CACHE_TIME = 24 * 60 * 60 * 1000; // 24h

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url);

    if (res.status !== 503) return res;

    console.log(`Google Books devolvió 503. Reintentando (${i + 1}/${retries})...`);
    await delay(300 + i * 200);
  }
  return null;
}


const CATEGORIAS_GENERALES = Object.keys(keywords);

function asignarCategoria(book) {
  const texto = `
    ${book.volumeInfo.title || ''}
    ${book.volumeInfo.description || ''}
    ${(book.volumeInfo.categories || []).join(' ')}
  `.toLowerCase();

  // 1. Coincidencia por palabras clave
  for (const categoria of CATEGORIAS_GENERALES) {
    const palabras = keywords[categoria];
    if (palabras.some(p => texto.includes(p.toLowerCase()))) {
      return categoria;
    }
  }

  // 2. Coincidencia con categorías originales de Google Books
  const cats = book.volumeInfo.categories || [];
  for (const c of cats) {
    const base = c.split('/')[0].trim();
    if (CATEGORIAS_GENERALES.includes(base)) {
      return base;
    }
  }

  // 3. Fallback seguro
  return "Fiction";
}


export const obtenerLibrosPorCategoria = async (req, res) => {
  const cat = req.query.cat;
  const max = req.query.max || 5;

  if (!cat) {
    return res.status(400).json({ error: "Falta parámetro 'cat'" });
  }

  const cacheKey = `${cat}-${max}`;
  const now = Date.now();

  // Cache
  if (cache.has(cacheKey)) {
    const { timestamp, data } = cache.get(cacheKey);
    if (now - timestamp < CACHE_TIME) {
      return res.json(data);
    }
  }

  const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
    cat
  )}&maxResults=${max}&key=${process.env.GOOGLE_BOOKS_KEY}`;

  const response = await fetchWithRetry(url);

  if (!response) {
    return res.status(503).json({ error: "Google Books no responde" });
  }

  const data = await response.json();

  // Guardar en cache
  cache.set(cacheKey, { timestamp: now, data });

  res.json(data);
};
