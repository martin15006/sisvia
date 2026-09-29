// Enlaces de contacto de la portada, armados desde marca.js (CL-02 · RN-03).
import { MARCA } from "../../lib/marca.js";

export const enlaceWhatsApp = () =>
    `https://wa.me/${MARCA.contacto.whatsapp}?text=${encodeURIComponent(`Hola, quiero conocer ${MARCA.nombre} para mi empresa`)}`;

export const enlaceCorreo = () =>
    `mailto:${MARCA.contacto.correo}?subject=${encodeURIComponent(`Quiero conocer ${MARCA.nombre}`)}`;
