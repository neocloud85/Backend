// app.js
import express from 'express';
import cors from 'cors';
import { authRoutes } from './routes/auth.routes.js';
import {usuariosRoutes} from './routes/usuarios.routes.js';
import { resenasRoutes } from './routes/resenas.routes.js';
import { recomendacionesRoutes } from './routes/recomendaciones.route.js';
import { amistadRoutes } from './routes/amistad.routes.js';
import { librosRoutes } from './routes/libros.routes.js';
import { categoriasRoutes } from './routes/categorias.routes.js';
import { booksProxyRoutes } from './routes/booksProxy.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { mensajesRoutes } from './routes/mensajes.routes.js';
import { PORT, CORS_ORIGIN } from './config/config.js';
import * as dotenv from "dotenv";
dotenv.config();

const app = express();

const corsOptions = {
    origin: [
        'http://localhost:4200',
        'https://frontend-one-cyan-4z5mhm9vnk.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};


app.use(cors(corsOptions));
app.use(express.json());

// Rutas
app.use('/api', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/resenas', resenasRoutes);
app.use('/api/recomendaciones', recomendacionesRoutes);
app.use('/api/amistad', amistadRoutes);
app.use('/api/libros', librosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/books', booksProxyRoutes);
app.use('/api/mensajes', mensajesRoutes);
// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        message: 'API REST Bookverse con Express.js',
        version: '1.0.0',
        status: 'OK'
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// Servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log("API KEY:", process.env.GOOGLE_BOOKS_KEY);

});