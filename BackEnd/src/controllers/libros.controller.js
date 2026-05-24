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
    // Rotación de keys (opcional, pero recomendado)
    const apiKeys = [
      process.env.GOOGLE_BOOKS_KEY,
      process.env.GOOGLE_BOOKS_KEY_2
    ].filter(Boolean);

    if (apiKeys.length === 0) {
      return res.status(500).json({ error: "No hay API keys configuradas" });
    }

    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    const page = parseInt(req.query.page || "0", 10);
    const categoriaQuery = req.query.cat || null;
    const maxResults = 20;

    // Si el frontend manda cat, usamos esa; si no, rotamos
    const categoria =
      categoriaQuery && CATEGORIAS.includes(categoriaQuery)
        ? categoriaQuery
        : CATEGORIAS[page % CATEGORIAS.length];

    const startIndex = page * maxResults;

    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(
      categoria
    )}&maxResults=${maxResults}&startIndex=${startIndex}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    const items = data.items || [];

    res.json({
      items,
      categoriaUsada: categoria,
      page,
      maxResults
    });

  } catch (error) {
    console.error("❌ Error en getCatalog:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
