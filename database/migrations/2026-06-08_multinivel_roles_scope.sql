-- Migracion: fundacion de roles multinivel (Fase 4, Tarea #102).
--
-- 1. Agrega los 5 roles de admin al enum rol_usuario (hoy solo tiene admin/conductor).
-- 2. Agrega las columnas de scope territorial a usuarios.
--
-- COMO APLICAR (Supabase Dashboard -> SQL Editor):
--   Pega TODO y dale Run. Si la parte del enum (ALTER TYPE) diera error por
--   ejecutarse en bloque, corre PRIMERO las 5 lineas ALTER TYPE una por una,
--   y luego el resto.
--
-- Idempotente: usa IF NOT EXISTS en todo.

-- ============================================================
-- 1. Roles multinivel en el enum rol_usuario
-- ============================================================
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_sede';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_ciudad';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_departamental';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'admin_regional';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'superadmin';

-- ============================================================
-- 2. Columnas de scope territorial en usuarios
--    (sede_id ya existe). Cada admin llena solo la de su nivel.
-- ============================================================
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS ciudad_id        UUID REFERENCES ciudades(id)       ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS departamento_id  UUID REFERENCES departamentos(id)  ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS region_id        UUID REFERENCES regiones(id)       ON DELETE SET NULL;

-- ============================================================
-- 3. Indices para los filtros de scope
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_ciudad        ON usuarios(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_departamento  ON usuarios(departamento_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_region        ON usuarios(region_id);
