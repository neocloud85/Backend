// app.js
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

import { authRoutes }           from './routes/auth.routes.js';
import { usuariosRoutes }       from './routes/usuarios.routes.js';
import { resenasRoutes }        from './routes/resenas.routes.js';
import { recomendacionesRoutes} from './routes/recomendaciones.route.js';
import { amistadRoutes }        from './routes/amistad.routes.js';
import { librosRoutes }         from './routes/libros.routes.js';
import { categoriasRoutes }     from './routes/categorias.routes.js';
import { booksProxyRoutes }     from './routes/booksProxy.routes.js';
import { adminRoutes }          from './routes/admin.routes.js';
import { mensajesRoutes }       from './routes/mensajes.routes.js';
import { PORT }                 from './config/config.js';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:4200',
  'https://frontend-one-cyan-4z5mhm9vnk.vercel.app'
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// ─── RUTAS REST ───────────────────────────────────────────────────────────────
app.use('/api',               authRoutes);
app.use('/api/usuarios',      usuariosRoutes);
app.use('/api/resenas',       resenasRoutes);
app.use('/api/recomendaciones', recomendacionesRoutes);
app.use('/api/amistad',       amistadRoutes);
app.use('/api/libros',        librosRoutes);
app.use('/api/categorias',    categoriasRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/books',         booksProxyRoutes);
app.use('/api/mensajes',      mensajesRoutes);

app.get('/', (_, res) => res.json({ message: 'API Bookverse', version: '1.0.0', status: 'OK' }));
app.use((_, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// ─── SERVIDOR HTTP + SOCKET.IO ────────────────────────────────────────────────
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Middleware de autenticación para Socket.IO
// El cliente envía el JWT en el handshake: { auth: { token } }
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No autenticado'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = String(decoded.id ?? decoded.userId ?? decoded.sub);
    next();
  } catch {
    next(new Error('Token inválido'));
  }
});

// Cada usuario entra a su sala privada con su propio ID
// para recibir mensajes directos
io.on('connection', socket => {
  const userId = socket.userId;
  socket.join(`user:${userId}`);
  console.log(`Socket conectado: usuario ${userId}`);

  socket.on('disconnect', () => {
    console.log(`Socket desconectado: usuario ${userId}`);
  });
});

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('Socket.IO activo');
});
