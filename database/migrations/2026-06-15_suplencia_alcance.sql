-- ============================================================================
-- MIGRACION 2026-06-15 (b) — Suplencia Fase B: alcance multi-sede
-- ============================================================================
-- Ver docs/diseno-pool-vip.md. La suplencia ahora puede cubrir:
--   - alcance = 'sede'        -> un solo sede (sede_id)
--   - alcance = 'departamento'  -> TODOS las sedes de un departamento/regional
--                                   (departamento_id); el pool elige cual gestiona
--                                   con el "sede activa" (uno a la vez).
--
-- COMO APLICAR: Supabase SQL Editor -> pegar y Run. Idempotente.
-- (La tabla suplencias ya tiene RLS deshabilitado de la migracion anterior.)
-- ============================================================================

ALTER TABLE suplencias
    ADD COLUMN IF NOT EXISTS alcance TEXT NOT NULL DEFAULT 'sede';

ALTER TABLE suplencias
    ADD COLUMN IF NOT EXISTS departamento_id UUID REFERENCES departamentos(id) ON DELETE CASCADE;

-- sede_id pasa a ser opcional: es NULL cuando alcance = 'departamento'.
ALTER TABLE suplencias
    ALTER COLUMN sede_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_suplencias_departamento ON suplencias(departamento_id);
