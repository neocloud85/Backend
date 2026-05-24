// ===============================
//  CONTROLADOR DE CATÁLOGO
// ===============================

const CATEGORIAS = [
  "Fiction",
  "Fantasy",
  "Romance",
  "Mystery",
  "Science",
  "History",
  "Biography",
  "Computers"
];

export const getCatalog = async (req, res) => {
  try {
    // ===============================
    // 1. Rotación de API keys
    // ===============================
    const apiKeys = [
      process.env.GOOGLE_BOOKS_KEY,
      process.env.GOOGLE_BOOKS_KEY_2
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      return res.status(500).json({ error: "No hay API keys configuradas" });
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // ===============================
    // 2. Parámetros
    // ===============================
    const page = parseInt(req.query.page || "0", 10);
    const categoriaQuery = req.query.cat || null;
    const maxResults = 20;

    // ===============================
    // 3. Categoría seleccionada
    // ===============================
    const categoria =
      categoriaQuery && CATEGORIAS.includes(categoriaQuery)
        ? categoriaQuery
        : CATEGORIAS[page % CATEGORIAS.length];

    // ===============================
    // 4. Paginación real
    // ===============================
    const startIndex = page * maxResults;

    // ===============================
    // 5. Obtener totalItems SOLO en página 0
    // ===============================
    let totalItems = null;

    if (page === 0) {
      const countUrl = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
        categoria
      )}&maxResults=1&key=${apiKey}`;

      const countRes = await fetch(countUrl);
      const countData = await countRes.json();
      totalItems = countData.totalItems || 0;
    }

    // ===============================
    // 6. Petición principal
    // ===============================
    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
      categoria
    )}&maxResults=${maxResults}&startIndex=${startIndex}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    const items = data.items || [];

    // ===============================
    // 7. Respuesta
    // ===============================
    res.json({
      items,
      categoriaUsada: categoria,
      page,
      maxResults,
      totalItems
    });

  } catch (error) {
    console.error("❌ Error en getCatalog:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
