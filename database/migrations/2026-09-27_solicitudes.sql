-- ============================================================================
--  Solicitudes de cita desde la portada (pacto portada-publica)
--
--  Una empresa que todavia no usa SISVIA deja sus datos en la portada publica
--  para que el equipo SISVIA la contacte y acuerden la cita (HU-02). El equipo
--  las ve en "Solicitudes", las marca como contactadas o las borra (HU-04).
--   - Guarda datos de personas: solo con la autorizacion marcada (HU-02.7), que
--     queda con su fecha y hora en autorizo_datos_en.
--   - Borrar es de verdad (DELETE): sirve para el spam y para quien pida que
--     borren sus datos.
--   - No es dato de ninguna empresa (no tiene empresa_id): la ve solo el
--     superadmin, por el backend con service_role. RLS activo y sin politicas.
--
--  Es aditiva: el codigo que esta hoy en produccion no la nota. Se puede correr
--  dos veces.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS solicitudes (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa                TEXT NOT NULL CHECK (char_length(empresa) BETWEEN 1 AND 120),
    ciudad                 TEXT NOT NULL CHECK (char_length(ciudad) BETWEEN 1 AND 80),
    vehiculos              INTEGER CHECK (vehiculos BETWEEN 1 AND 9999),
    nombre                 TEXT NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 100),
    telefono               TEXT NOT NULL CHECK (char_length(telefono) BETWEEN 8 AND 16),  -- normalizado: 3001234567 o +573001234567
    correo                 TEXT CHECK (correo IS NULL OR char_length(correo) <= 254),
    mensaje                TEXT CHECK (mensaje IS NULL OR char_length(mensaje) <= 1000),
    autorizo_datos_en      TIMESTAMPTZ NOT NULL,
    estado                 TEXT NOT NULL DEFAULT 'nueva' CHECK (estado IN ('nueva', 'contactada')),
    contactada_por         UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    contactada_por_nombre  TEXT,                  -- queda aunque el usuario ya no este
    contactada_en          TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_nuevas ON solicitudes(estado) WHERE estado = 'nueva';

COMMIT;

-- Verificacion: la tabla nueva con RLS activo (true).
SELECT 'solicitudes' AS que, relrowsecurity::text AS valor FROM pg_class WHERE relname = 'solicitudes';
