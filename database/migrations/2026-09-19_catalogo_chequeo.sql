-- ============================================================================
--  Catalogo por empresa en el chequeo (pacto para-empresas · HU-15 · CB-04)
--
--  Cada chequeo guarda, al iniciar, que items le tocaron (RN-07: el catalogo de
--  su empresa, filtrado por el tipo de vehiculo y sus excepciones). Asi:
--   - si alguien cambia o bloquea el catalogo mientras el conductor responde,
--     su chequeo en curso no cambia (CB-04);
--   - el cierre sabe cuantas respuestas esperar (antes eran 39 fijas).
--
--  Es compatible con el codigo que esta hoy en produccion: la columna es
--  opcional y los chequeos viejos quedan sin ella (el cierre los trata como antes).
--  Se puede correr dos veces.
-- ============================================================================

ALTER TABLE chequeos_preoperacionales
    ADD COLUMN IF NOT EXISTS catalogo_items INTEGER[];

COMMENT ON COLUMN chequeos_preoperacionales.catalogo_items IS
    'Ids de items_chequeo que le tocaron a este chequeo al iniciar (RN-07). NULL en chequeos anteriores a 2026-09-19.';

-- Verificacion: debe aparecer la columna.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'chequeos_preoperacionales' AND column_name = 'catalogo_items';
