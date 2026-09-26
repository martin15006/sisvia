// Configuracion del transporte de correo (Gmail via SMTP con nodemailer).
//
// El correo es OPCIONAL: si no hay credenciales en el .env, el envio se omite
// (correoHabilitado = false) y la app sigue funcionando igual. Asi se puede
// desarrollar local sin configurar nada.
// Interruptor: CORREO_ACTIVO=0 lo apaga aunque haya credenciales (para probar sin
// mandarle correos a nadie); 1 o sin la variable, encendido.
import nodemailer from 'nodemailer';
import { MARCA } from './marca.js';
import { estadoDelCorreo } from '../services/correoReglas.js';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const ESTADO = estadoDelCorreo({ usuario: GMAIL_USER, clave: GMAIL_APP_PASSWORD, activo: process.env.CORREO_ACTIVO });
export const correoHabilitado = ESTADO.encendido;
// Por que esta apagado (para el aviso al arrancar): 'CORREO_ACTIVO=0' o 'sin GMAIL_USER / GMAIL_APP_PASSWORD'.
export const motivoCorreoApagado = ESTADO.motivo;

// Remitente que vera el destinatario (el nombre del producto sale de marca.js, CL-02).
export const REMITENTE = GMAIL_USER
    ? `"${MARCA.nombre}" <${GMAIL_USER}>`
    : MARCA.nombre;

// Un solo transporter reutilizable. Solo se crea si hay credenciales.
export const transporter = correoHabilitado
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
    : null;
