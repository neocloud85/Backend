const CATEGORIAS = [
  "Fiction",
  "Fantasy",
  "Romance",
  "Mystery",
  "Science",
  "History",
  "Biography",
  "Computers",
  "Education",
  "Health",
  "Medical",
  "Business"
];

export const getCatalog = async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_KEY;

    const page = parseInt(req.query.page || "0");
    const categoriaQuery = req.query.cat;

    const maxResults = 20;

    // Si el usuario selecciona categoría → usarla
    // Si no → categoría rotativa según la página
    const categoria = categoriaQuery || CATEGORIAS[page % CATEGORIAS.length];

    const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(categoria)}&maxResults=${maxResults}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    const items = data.items || [];

    // Extraer etiquetas reales
    const etiquetas = new Set();
    items.forEach(b => {
      const cats = b.volumeInfo?.categories || [];
      cats.forEach(c => etiquetas.add(c));
    });

    res.json({
      items,
      etiquetas: [...etiquetas].sort(),
      categoriaUsada: categoria
    });

  } catch (error) {
    console.error("❌ Error en getCatalog:", error.message);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
