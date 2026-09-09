// Configuracion del transporte de correo (Gmail via SMTP con nodemailer).
//
// El correo es OPCIONAL: si no hay credenciales en el .env, el envio se omite
// (correoHabilitado = false) y la app sigue funcionando igual. Asi se puede
// desarrollar local sin configurar nada.
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

export const correoHabilitado = Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);

// Remitente que vera el destinatario.
export const REMITENTE = GMAIL_USER
    ? `"SISVIA" <${GMAIL_USER}>`
    : 'SISVIA';

// Un solo transporter reutilizable. Solo se crea si hay credenciales.
export const transporter = correoHabilitado
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
    : null;
