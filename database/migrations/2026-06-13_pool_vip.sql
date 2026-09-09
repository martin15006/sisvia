-- ============================================================================
-- MIGRACION 2026-06-13 — Pool de transporte / vehiculos VIP (Paso 1)
-- ============================================================================
-- Ver diseño completo en docs/diseno-pool-vip.md.
--
-- Paso 1 (cargo pool + vehiculos especiales):
--   - vehiculos.es_vip  : el vehiculo es "especial / de direccion" (personal del
--                         Coordinador o exclusivo de un director). Solo lo maneja
--                         un conductor del pool.
--   - usuarios.es_pool  : el conductor es "del pool de transporte". Maneja los
--                         vehiculos VIP (y, en el Paso 2, podra suplir al
--                         Coordinador de sede por un periodo).
--
-- Regla de manejo: pool -> solo vehiculos VIP; conductor normal -> solo no-VIP.
--
-- COMO APLICAR: Supabase Dashboard -> SQL Editor -> pegar y Run.
-- Idempotente (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE vehiculos
    ADD COLUMN IF NOT EXISTS es_vip BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS es_pool BOOLEAN NOT NULL DEFAULT false;

-- Indice para filtrar rapido los vehiculos VIP/no-VIP en el flujo del conductor
CREATE INDEX IF NOT EXISTS idx_vehiculos_es_vip ON vehiculos(es_vip);
