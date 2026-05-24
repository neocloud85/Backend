// Cache para no repetir peticiones
const cacheDetalles = new Map();

async function getCategoriasReales(id, apiKey) {
  if (cacheDetalles.has(id)) return cacheDetalles.get(id);

  const url = `https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`;

  try {
    const res = await fetch(url);

    console.log("DETALLE STATUS:", res.status, "ID:", id);

    if (!res.ok) {
      console.log("ERROR DETALLE:", await res.text());
      return [];
    }
    
    const data = await res.json();
    const cats = data.volumeInfo?.categories || [];

    console.log("CATEGORÍAS DEL DETALLE:", id, cats);
    
    const limpias = cats.flatMap(cat =>
      cat.split('/').map(c => c.trim())
    );

    cacheDetalles.set(id, limpias);
    return limpias;

  } catch (err) {
    console.log("EXCEPCIÓN DETALLE:", err.message);
    return [];
  }
}

export const getCatalog = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "0");
    const maxResults = 20;
    const startIndex = page * maxResults;

    const apiKey = process.env.GOOGLE_BOOKS_KEY;

    const url = `https://www.googleapis.com/books/v1/volumes?q=best+books&maxResults=${maxResults}&startIndex=${startIndex}&key=${apiKey}`;

    // 1. Obtener libros del catálogo
    const response = await fetch(url);
    const data = await response.json();
    const items = data.items || [];

    console.log("=== CATEGORÍAS DEL BUSCADOR ===");
    items.forEach(b => console.log(b.id, b.volumeInfo?.categories));

    // 2. Obtener categorías reales SOLO de 3 libros
    const etiquetasSet = new Set();
    const sample = items.slice(0, 3);

    console.log("=== OBTENIENDO DETALLES ===");

    for (const book of sample) {
      const categorias = await getCategoriasReales(book.id, apiKey);
      categorias.forEach(c => etiquetasSet.add(c));
    }

    console.log("=== ETIQUETAS FINALES ===", [...etiquetasSet]);

    res.json({
      items,
      etiquetas: [...etiquetasSet].sort()
    });

  } catch (error) {
    console.error("❌ Error en getCatalog:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
