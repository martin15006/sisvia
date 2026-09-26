-- ============================================================================
--  Escribir a SISVIA (pacto para-empresas · HU-18 · RN-12 · RN-13 · CB-21)
--
--  El Administrador de empresa le escribe al equipo SISVIA (una falla, una duda,
--  mas cupo del plan, un traspaso o una idea) con un adjunto opcional, y el
--  equipo responde en el mismo hilo hasta marcarlo Resuelto.
--   - buzon_mensajes:   el mensaje, con los datos que se llenan solos (pantalla,
--                       navegador) y su estado: nuevo -> en_revision -> resuelto.
--   - buzon_respuestas: el hilo (de SISVIA o de la empresa).
--  Las dos tablas tienen empresa_id con ON DELETE CASCADE: al eliminar una
--  empresa (HU-05) se van con ella (CB-21). El adjunto vive en Cloudinary en
--  modo privado; aca se guarda solo su identificador (RNF-10).
--
--  Es compatible con el codigo que esta hoy en produccion (tablas nuevas que
--  nadie usa todavia). Se puede correr dos veces.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS buzon_mensajes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    autor_id          UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    autor_nombre      TEXT NOT NULL,          -- queda aunque el usuario ya no este
    autor_cargo       TEXT,
    tipo              TEXT NOT NULL CHECK (tipo IN ('falla', 'duda', 'cupo', 'traspaso', 'idea')),
    mensaje           TEXT NOT NULL CHECK (char_length(btrim(mensaje)) BETWEEN 1 AND 2000),
    estado            TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'en_revision', 'resuelto')),
    pantalla          TEXT CHECK (char_length(pantalla) <= 300),   -- desde donde escribio (HU-18.3)
    navegador         TEXT CHECK (char_length(navegador) <= 300),
    adjunto_id        TEXT,                   -- public_id en Cloudinary (privado)
    adjunto_recurso   TEXT CHECK (adjunto_recurso IN ('image', 'raw')),
    adjunto_formato   TEXT,                   -- image/png, image/jpeg, application/pdf
    adjunto_nombre    TEXT,
    adjunto_bytes     INTEGER CHECK (adjunto_bytes BETWEEN 1 AND 5242880),
    resuelto_en       TIMESTAMPTZ,
    resuelto_por      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- ultima respuesta o cambio de estado
);
CREATE INDEX IF NOT EXISTS idx_buzon_mensajes_empresa ON buzon_mensajes (empresa_id, actualizado_en DESC);
CREATE INDEX IF NOT EXISTS idx_buzon_mensajes_estado  ON buzon_mensajes (estado, created_at DESC);
ALTER TABLE buzon_mensajes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS buzon_respuestas (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mensaje_id        UUID NOT NULL REFERENCES buzon_mensajes(id) ON DELETE CASCADE,
    empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    autor_id          UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    autor_nombre      TEXT NOT NULL,
    de_sisvia         BOOLEAN NOT NULL,       -- true = la escribio el equipo SISVIA
    texto             TEXT NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 2000),
    adjunto_id        TEXT,
    adjunto_recurso   TEXT CHECK (adjunto_recurso IN ('image', 'raw')),
    adjunto_formato   TEXT,
    adjunto_nombre    TEXT,
    adjunto_bytes     INTEGER CHECK (adjunto_bytes BETWEEN 1 AND 5242880),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_buzon_respuestas_mensaje ON buzon_respuestas (mensaje_id, created_at);
CREATE INDEX IF NOT EXISTS idx_buzon_respuestas_empresa ON buzon_respuestas (empresa_id);
ALTER TABLE buzon_respuestas ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verificacion: deben aparecer las dos tablas, con RLS activo (true).
SELECT relname AS tabla, relrowsecurity AS rls_activo
FROM pg_class
WHERE relname IN ('buzon_mensajes', 'buzon_respuestas')
ORDER BY relname;
