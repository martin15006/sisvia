import { cloudinary } from '../config/cloudinary.js';

export const subirFoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }

        const folder = req.body.folder || 'general';

        const resultado = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `sisvia/${folder}`,
                    resource_type: 'auto',
                    transformation: [
                        { width: 1200, height: 1200, crop: 'limit' },
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' },
                    ],
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        res.json({
            url: resultado.secure_url,
            public_id: resultado.public_id,
            width: resultado.width,
            bytes: resultado.bytes,
            formato: resultado.format,
        });
    } catch (err) {
        console.error('Error subiendo foto:', err);
        res.status(500).json({ error: 'Error al subir la foto' });
    }
};