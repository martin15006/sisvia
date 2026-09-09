import { Router } from 'express';
import multer from 'multer';
import { subirFoto } from '../controllers/upload.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const tiposPermitidos = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
        ];
        if (tiposPermitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imagenes JPEG, PNG, WEBP, GIF'));
        }
    },
});


// solo los admin pueden subir fotos 
router.use(verificarToken, soloAdmin);

router.post('/foto', upload.single('foto'), subirFoto);

export default router;