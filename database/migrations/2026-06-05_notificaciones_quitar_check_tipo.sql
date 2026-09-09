-- Migracion: quitar el CHECK constraint del tipo de notificacion.
--
-- Motivo: el CHECK obligaba a correr una migracion cada vez que se agrega un
-- tipo de notificacion nuevo. Ahora la validacion de tipos vive en el codigo
-- (notificaciones.service.js), que es mas flexible para un sistema en evolucion.
--
-- COMO APLICAR (Supabase Dashboard -> SQL Editor -> Run):

ALTER TABLE notificaciones
    DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
