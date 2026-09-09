import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import helloRoutes from './routes/hello.routes.js';
import authRouter from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import vehiculosRoutes from './routes/vehiculos.routes.js';
import chequeosRoutes from './routes/chequeos.routes.js';
import catalogoAdminRoutes from './routes/catalogoAdmin.routes.js';
import fotosChequeoRoutes from './routes/fotosChequeo.routes.js';
import geoRoutes from './routes/geo.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import notificacionesRoutes from './routes/notificaciones.routes.js';
import suplenciasRoutes from './routes/suplencias.routes.js';
import exportRoutes from './routes/export.routes.js';
import escalacionRoutes from './routes/escalacion.routes.js';
import { iniciarKeepAlive, detenerKeepAlive } from './utils/keepAlive.js';
import { iniciarCronVencimientos, detenerCronVencimientos } from './jobs/vencimientos.job.js';
import { verificarCorreo } from './services/email.service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Detras del proxy de Railway: confiar en 1 salto para leer la IP real del cliente
// (necesario para que el rate-limit por IP cuente bien y no agrupe a todos en una sola IP).
app.set('trust proxy', 1);
// No revelar el framework (fingerprinting).
app.disable('x-powered-by');

// Helmet: cabeceras de seguridad. Config CONSERVADORA para un API solo-JSON que vive en
// otro origen que el frontend (Cloudflare): SIN CSP (el del sitio va en frontend/public/_headers)
// y SIN las politicas cross-origin-isolation, para no interferir con el fetch del front -> backend.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
}));

// Limite anti-fuerza-bruta POR IP en el login. Complementa el bloqueo por cuenta de
// loginIntentos.service: frena el password-spraying (rotar muchas cuentas desde una IP).
// 50 intentos / 15 min por IP es holgado incluso para una oficina con IP compartida.
const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesion. Espera unos minutos e intenta de nuevo.' },
});

// CORS: en development aceptamos localhost y cualquier IP LAN (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
// para permitir pruebas desde celulares conectados al mismo wifi. En produccion se respeta
// estrictamente la variable CORS_ORIGIN del .env.
const esDev = process.env.NODE_ENV !== 'production';

app.use(cors({
    origin: (origin, callback) => {
        // Peticiones sin origin (Thunder Client, curl, mismo origen) siempre permitidas
        if (!origin) return callback(null, true);

        // En produccion solo CORS_ORIGIN literal
        if (!esDev) {
            return callback(
                origin === process.env.CORS_ORIGIN ? null : new Error(`Origen no permitido: ${origin}`),
                origin === process.env.CORS_ORIGIN
            );
        }

        // En dev: aceptar localhost y rangos LAN privados (RFC 1918)
        const permitidoDev = /^http:\/\/(localhost|127\.0\.0\.1|10\.[\d.]+|192\.168\.[\d.]+|172\.(1[6-9]|2[0-9]|3[01])\.[\d.]+)(:\d+)?$/;
        if (permitidoDev.test(origin)) return callback(null, true);

        callback(new Error(`Origen no permitido en dev: ${origin}`));
    },
}));

app.use(express.json());

app.set('etag', false);
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use('/api', helloRoutes);
app.use('/api/auth/login', limiteLogin);
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/chequeos', chequeosRoutes);
app.use('/api/catalogo-admin', catalogoAdminRoutes);
app.use('/api/respuestas', fotosChequeoRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/suplencias', suplenciasRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/escalacion', escalacionRoutes);

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const servidor = app.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Prueba: http://localhost:${PORT}/api/hello`);
    console.log(`Test Supabase: http://localhost:${PORT}/api/test-supabase`);
    // Esperamos el primer latido antes de seguir, asi las primeras requests llegan con la conexion caliente
    await iniciarKeepAlive();
    // Programar el aviso diario de vencimientos (SOAT/RTM/extintor/licencia)
    iniciarCronVencimientos();
    // Verificar credenciales de correo (no bloquea el arranque)
    verificarCorreo();
});

const cerrarLimpio = (senal) => {
    console.log(`\nRecibida senal ${senal}, cerrando servidor...`);
    detenerKeepAlive();
    detenerCronVencimientos();
    servidor.close(() => process.exit(0));
};

process.on('SIGINT', () => cerrarLimpio('SIGINT'));
process.on('SIGTERM', () => cerrarLimpio('SIGTERM'));