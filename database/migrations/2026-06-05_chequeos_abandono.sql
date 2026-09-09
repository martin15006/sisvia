-- Migracion para agregar columnas de abandono a chequeos_preoperacionales.
-- Tarea #104: reporte de chequeo cancelado/abandonado al admin.
--
-- COMO APLICAR (en Supabase Dashboard → SQL Editor):
--   1. Copia este archivo completo
--   2. Pegalo en el SQL Editor
--   3. Run
--
-- Idempotente: si las columnas ya existen, no falla.

ALTER TABLE chequeos_preoperacionales
    ADD COLUMN IF NOT EXISTS abandonado        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS abandonado_en     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS motivo_abandono   TEXT;

-- Constraint para validar valores permitidos del motivo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chequeos_motivo_abandono_check'
    ) THEN
        ALTER TABLE chequeos_preoperacionales
            ADD CONSTRAINT chequeos_motivo_abandono_check
            CHECK (motivo_abandono IS NULL OR motivo_abandono IN (
                'inactividad',
                'cerro_sesion',
                'cerro_pestana',
                'manual'
            ));
    END IF;
END $$;

-- Indice para filtrar rapidamente chequeos abandonados del dia en el dashboard
CREATE INDEX IF NOT EXISTS idx_chequeos_abandonados
    ON chequeos_preoperacionales (abandonado_en DESC)
    WHERE abandonado = true;
