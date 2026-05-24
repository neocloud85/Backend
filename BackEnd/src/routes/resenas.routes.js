    import {Router} from 'express';
    import { addResena, getMyReviews, hasReview,getAllReviews, getResenasSeguidos, getTopLibros } from '../controllers/resenas.controller.js';
    import { authMiddleware } from '../middleware/authMiddleware.js';

    const router = Router();

    // Crear reseña
    router.post('/', authMiddleware, addResena);
    router.get('/mias', authMiddleware, getMyReviews);
    router.get('/mia/:libro_id', authMiddleware, hasReview);
    router.get('/otros', authMiddleware, getAllReviews);
    router.get('/seguidos', authMiddleware, getResenasSeguidos);
    router.get('/top', getTopLibros);




    export const resenasRoutes = router;
