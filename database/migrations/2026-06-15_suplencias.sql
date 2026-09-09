-- ============================================================================
-- MIGRACION 2026-06-15 — Suplencia del Coordinador de sede (Pool · Paso 2)
-- ============================================================================
-- Ver diseño en docs/superpowers/specs/2026-06-14-suplencia-pool-design.md.
--
-- Un conductor del pool (usuarios.es_pool) puede reemplazar temporalmente al
-- Coordinador de sede de su sede. La tabla guarda el historial de suplencias
-- (quien, que sede, desde/hasta, quien la activo) y alimenta la vista
-- "Actividad del pool". "Vigente" se calcula al vuelo:
--   activa = true AND now() >= desde AND (hasta IS NULL OR now() <= hasta).
--
-- COMO APLICAR: Supabase Dashboard -> SQL Editor -> pegar y Run. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS suplencias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id             UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    sede_id           UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
    activada_por_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    motivo              TEXT,
    desde               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hasta               TIMESTAMPTZ,
    activa              BOOLEAN NOT NULL DEFAULT true,
    desactivada_por_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    desactivada_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suplencias_pool_activa   ON suplencias(pool_id, activa);
CREATE INDEX IF NOT EXISTS idx_suplencias_sede_activa ON suplencias(sede_id, activa);

-- Supabase activa RLS por defecto en tablas nuevas creadas desde el SQL Editor.
-- En este proyecto el frontend SOLO habla con el backend (que usa la service_role
-- key y aplica toda la autorizacion), asi que RLS se deja DESHABILITADO como en el
-- resto de las tablas (ver el bloque de RLS en database.sql). Sin esto, el insert
-- falla con "new row violates row-level security policy for table suplencias".
ALTER TABLE suplencias DISABLE ROW LEVEL SECURITY;
