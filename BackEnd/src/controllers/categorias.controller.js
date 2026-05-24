// src/controllers/categorias.controller.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Necesario para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const obtenerCategoriasGlobales = (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', '..', 'data', 'categorias.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const categorias = JSON.parse(data);

    res.json({
      status: 'success',
      categorias
    });

  } catch (error) {
    console.error('Error cargando categorías globales:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'No se pudieron cargar las categorías globales'
    });
  }
};
