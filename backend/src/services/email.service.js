// Servicio de envio de correos + plantillas HTML con branding del producto.
//
// enviarCorreo() nunca tumba el flujo principal: si no hay credenciales (correo
// deshabilitado) o el envio falla, loguea y devuelve { enviado:false } sin lanzar.
import { transporter, correoHabilitado, REMITENTE } from '../config/email.js';
import { supabase } from '../config/supabase.js';
import { LOGO_PATH, COLORES, fechaLarga, lineaOrigen, cabeceraDeSede } from './export/branding.js';
import { resolverDestinatariosSede } from './notificaciones.service.js';

const APP_URL = process.env.CORS_ORIGIN || '';

// Envia un correo. `para` puede ser un email o un array de emails.
export const enviarCorreo = async ({ para, asunto, html }) => {
    const destinos = (Array.isArray(para) ? para : [para]).filter(Boolean);
    if (!correoHabilitado) {
        console.log(`[correo] deshabilitado (sin credenciales) — se omite: "${asunto}"`);
        return { enviado: false, omitido: true };
    }
    if (destinos.length === 0) {
        return { enviado: false, sinDestinatarios: true };
    }
    try {
        await transporter.sendMail({
            from: REMITENTE,
            to: destinos,
            subject: asunto,
            html,
            attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: 'logomarca' }],
        });
        return { enviado: true, cantidad: destinos.length };
    } catch (err) {
        console.error('[correo] error enviando:', err.message);
        return { enviado: false, error: err.message };
    }
};

// Mapa id -> email de TODOS los usuarios de Supabase Auth (los emails viven en
// Auth, no en la tabla usuarios). Pagina hasta traerlos todos (no se queda en la
// primera pagina). Reutilizable por el correo de falla critica y el digest.
export const obtenerMapaEmails = async () => {
    const mapa = new Map();
    const perPage = 1000;
    let page = 1;
    // Tope de seguridad por si la API no devuelve menos de perPage nunca.
    for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) {
            console.error('[correo] error listando usuarios auth:', error.message);
            break;
        }
        const usuarios = data?.users || [];
        for (const u of usuarios) if (u.email) mapa.set(u.id, u.email);
        if (usuarios.length < perPage) break;
        page++;
    }
    return mapa;
};

// Resuelve los correos de una lista de IDs de usuario.
export const emailsDeUsuarios = async (ids) => {
    const set = new Set((ids || []).filter(Boolean));
    if (set.size === 0) return [];
    const mapa = await obtenerMapaEmails();
    return [...set].map((id) => mapa.get(id)).filter(Boolean);
};

// Verifica las credenciales de Gmail al arrancar y lo dice claro en consola
// (fail loud): asi no pasa desapercibido que el correo quedo mal configurado.
export const verificarCorreo = async () => {
    if (!correoHabilitado) {
        console.log('[correo] deshabilitado (sin GMAIL_USER / GMAIL_APP_PASSWORD) — la app funciona, pero no envia correos.');
        return false;
    }
    try {
        await transporter.verify();
        console.log('[correo] credenciales de Gmail OK — los correos se enviaran.');
        return true;
    } catch (err) {
        console.error('[correo] ⚠ credenciales de Gmail INVALIDAS o sin conexion:', err.message);
        return false;
    }
};

// ---- Plantillas HTML (estilos inline: los clientes de correo no leen <style>) ----

const layout = (titulo, cuerpoHtml) => `
<div style="margin:0;padding:0;background:#f1efe8;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;">
    <div style="background:${COLORES.primario};padding:18px 24px;display:flex;align-items:center;">
      <img src="cid:logomarca" width="42" height="42" alt="SISVIA" style="background:#fff;border-radius:6px;padding:4px;vertical-align:middle;" />
      <span style="color:#fff;font-size:18px;font-weight:bold;margin-left:12px;vertical-align:middle;">${titulo}</span>
    </div>
    <div style="padding:22px 24px;">
      ${cuerpoHtml}
    </div>
    <div style="padding:14px 24px;background:#fafafa;border-top:1px solid #e5e5e5;color:#5f5e5a;font-size:12px;">
      SISVIA · Control de vehículos · Este es un correo automatico, no responder.
    </div>
  </div>
</div>`;

const boton = (texto, url) => url
    ? `<a href="${url}" style="display:inline-block;margin-top:16px;background:${COLORES.primario};color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:bold;">${texto}</a>`
    : '';

// Correo inmediato de falla critica (vehiculo no operativo).
export const plantillaFallaCritica = ({ placa, conductor, criticidad, fecha, chequeoId, origen }) => {
    const url = chequeoId && APP_URL ? `${APP_URL}/admin/chequeos/${chequeoId}` : '';
    const cuerpo = `
    <div style="background:#FBEAEA;border-left:4px solid ${COLORES.critico};padding:12px 16px;border-radius:6px;">
      <div style="font-size:16px;font-weight:bold;color:${COLORES.critico};">Vehiculo NO OPERATIVO</div>
      <div style="font-size:13px;color:#5f5e5a;margin-top:2px;">Una falla critica fue detectada en un chequeo.</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
      <tr><td style="padding:6px 0;color:#5f5e5a;width:140px;">Vehiculo</td><td style="padding:6px 0;font-weight:bold;">${placa || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#5f5e5a;">Conductor</td><td style="padding:6px 0;">${conductor || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#5f5e5a;">Criticidad</td><td style="padding:6px 0;">${criticidad != null ? `${criticidad}%` : '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#5f5e5a;">Fecha</td><td style="padding:6px 0;">${fechaLarga(fecha)}</td></tr>
      ${origen ? `<tr><td style="padding:6px 0;color:#5f5e5a;">Sede</td><td style="padding:6px 0;">${origen}</td></tr>` : ''}
    </table>
    <div style="margin-top:12px;font-size:13px;color:#5f5e5a;">El vehiculo no puede operar hasta que un administrador lo revise y autorice.</div>
    ${boton('Ver el chequeo', url)}`;
    return layout('Falla critica en un vehiculo', cuerpo);
};

// Correo-resumen diario de documentos por vencer (un correo por admin).
export const plantillaDigestVencimientos = ({ items, sedeNombre }) => {
    const filas = items.map((it) => {
        const color = it.dias <= 0 ? COLORES.critico : it.dias <= 7 ? COLORES.critico : it.dias <= 15 ? COLORES.alerta : '#1a1a1a';
        const faltan = it.dias <= 0 ? 'VENCIDO' : `${it.dias} dia${it.dias === 1 ? '' : 's'}`;
        return `<tr style="border-top:1px solid #f0f0f0;">
          <td style="padding:8px 6px;font-size:13px;">${it.categoria}</td>
          <td style="padding:8px 6px;font-size:13px;">${it.sujeto}</td>
          <td style="padding:8px 6px;font-size:13px;">${fechaLarga(it.vence)}</td>
          <td style="padding:8px 6px;font-size:13px;font-weight:bold;color:${color};">${faltan}</td>
        </tr>`;
    }).join('');
    const cuerpo = `
    <div style="font-size:14px;">Documentos por vencer${sedeNombre ? ` en <b>${sedeNombre}</b>` : ''}:</div>
    <table style="width:100%;border-collapse:collapse;margin-top:14px;">
      <tr style="background:${COLORES.grisFondo};">
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Documento</td>
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Vehiculo / Conductor</td>
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Vence</td>
        <td style="padding:8px 6px;font-size:11px;text-transform:uppercase;color:#5f5e5a;">Faltan</td>
      </tr>
      ${filas}
    </table>
    <div style="margin-top:12px;font-size:13px;color:#5f5e5a;">Renueva estos documentos a tiempo para que los vehiculos puedan seguir operando.</div>`;
    return layout('Documentos por vencer', cuerpo);
};

// Informe escalado de un admin a su superior (nota + resumen opcional del area).
export const plantillaInforme = ({ deQuien, cargo, area, asunto, mensaje, resumen }) => {
    const filaResumen = (etiqueta, valor, color) => `
      <td style="padding:10px 14px;text-align:center;background:#fafafa;border:1px solid #eee;">
        <div style="font-size:22px;font-weight:bold;color:${color || '#1a1a1a'};">${valor}</div>
        <div style="font-size:11px;color:#5f5e5a;text-transform:uppercase;">${etiqueta}</div>
      </td>`;
    const bloqueResumen = resumen ? `
    <div style="margin-top:18px;font-size:13px;color:#5f5e5a;font-weight:bold;">Resumen del área${area ? ` (${area})` : ''}:</div>
    <table style="width:100%;border-collapse:collapse;margin-top:8px;"><tr>
      ${filaResumen('Vehículos', resumen.vehiculos)}
      ${filaResumen('Críticos', resumen.criticos, resumen.criticos > 0 ? COLORES.critico : '#1a1a1a')}
      ${filaResumen('No operativos', resumen.noOperativos, resumen.noOperativos > 0 ? COLORES.critico : '#1a1a1a')}
      ${filaResumen('Chequeos hoy', resumen.chequeosHoy)}
    </tr></table>` : '';
    const cuerpo = `
    <div style="font-size:13px;color:#5f5e5a;">Informe enviado por <b>${deQuien}</b>${cargo ? ` · ${cargo}` : ''}${area ? ` · ${area}` : ''}.</div>
    <div style="font-size:17px;font-weight:bold;color:${COLORES.primarioOscuro};margin-top:12px;">${asunto || 'Informe'}</div>
    <div style="margin-top:8px;font-size:14px;white-space:pre-line;">${(mensaje || '').replace(/</g, '&lt;')}</div>
    ${bloqueResumen}`;
    return layout('Informe de un administrador', cuerpo);
};

// ---- Orquestadores (resuelven destinatarios + arman el correo) ----

// Correo inmediato de falla critica a los admins de la sede afectada.
export const enviarCorreoFallaCritica = async ({ sedeId, placa, conductor, criticidad, fecha, chequeoId }) => {
    const para = await emailsDeUsuarios(await resolverDestinatariosSede(sedeId));
    if (para.length === 0) return { enviado: false, sinDestinatarios: true };
    const origen = lineaOrigen(await cabeceraDeSede(sedeId));
    const html = plantillaFallaCritica({ placa, conductor, criticidad, fecha, chequeoId, origen });
    return enviarCorreo({ para, asunto: `Falla critica: ${placa || 'vehiculo'} NO OPERATIVO`, html });
};
