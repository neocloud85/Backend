import fetch from "node-fetch";
import db from "../src/config/database.js";

async function poblarLibros(query = "fantasy", max = 40) {
  try {
    console.log(`Buscando libros sobre: ${query}`);

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=40`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) {
      console.log("No se encontraron libros.");
      return;
    }

    for (const item of data.items) {
      const id = item.id;
      const info = item.volumeInfo;

      const titulo = info.title || "Sin título";
      const autor = info.authors?.join(", ") || "Autor desconocido";
      const descripcion = info.description || "";
      const imagen = info.imageLinks?.thumbnail || null;
      const categorias = info.categories || [];

      // 1. Insertar libro si no existe
      await db.query(
        `INSERT IGNORE INTO libros (id, titulo, autor, descripcion, imagen)
         VALUES (?, ?, ?, ?, ?)`,
        [id, titulo, autor, descripcion, imagen]
      );

      // 2. Insertar etiquetas y relaciones
      for (const nombre of categorias) {
        const [insert] = await db.query(
          "INSERT IGNORE INTO etiqueta (nombre) VALUES (?)",
          [nombre]
        );

        const etiqueta_id = insert.insertId;

        if (etiqueta_id) {
          await db.query(
            "INSERT IGNORE INTO libro_etiqueta (libro_id, etiqueta_id) VALUES (?, ?)",
            [id, etiqueta_id]
          );
        }
      }

      console.log(`Libro añadido: ${titulo}`);
    }

    console.log("Población completada.");

  } catch (error) {
    console.error("Error poblando libros:", error);
  }
}

poblarLibros("fantasy");
