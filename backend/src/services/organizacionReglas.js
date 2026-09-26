// Reglas PURAS del nombre de la organizacion en documentos y correos
// (pacto para-empresas, HU-08 · CL-02). Sin base de datos, para node --test.
// El frontend usa la misma regla (lib/organizacion.js).
import { MARCA } from '../config/marca.js';

// La empresa del usuario, o la empresa a la que entro el superadmin; el
// superadmin afuera, el nombre del producto (HU-08.4).
export const organizacionDeUsuario = (usuario) =>
    usuario?.empresa_nombre || usuario?.empresaActivaNombre || MARCA.nombre;

// Cabecera de PDF y Word (HU-08.2): "Transportes del Sur · Regional Tolima · Sede Ibague".
export const lineaOrigen = ({ organizacion, sedeNombre, departamentoNombre }) => {
    const partes = [organizacion || MARCA.nombre];
    if (departamentoNombre) partes.push(`Regional ${departamentoNombre}`);
    if (sedeNombre) partes.push(sedeNombre);
    return partes.join(' · ');
};

// Pie de los correos (HU-08.3): la empresa de la que habla el correo y el producto.
export const pieDeCorreo = (organizacion) =>
    `${organizacion ? `${organizacion} · ` : ''}${MARCA.nombreLargo} · Este es un correo automatico, no responder.`;
