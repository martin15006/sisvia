/**
 * Helpers para URLs de Cloudinary.
 *
 * Nota: para que los PDFs se muestren inline en el navegador es responsabilidad
 * del backend subirlos con resource_type "image" + format "pdf" (ya implementado
 * en backend/src/controllers/vehiculos.controller.js -> subirRunt). Con esa
 * configuración Cloudinary sirve el PDF con Content-Disposition: inline y los
 * navegadores modernos los muestran con su visor PDF integrado sin necesidad
 * de viewers externos.
 */
