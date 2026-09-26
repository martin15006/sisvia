-- ============================================================================
--  SISVIA · 2026-09-18 · Empresas (pacto para-empresas, OB-01 y OB-02)
-- ============================================================================
--  Convierte SISVIA en multi-empresa. Es una migracion de EXPANSION:
--  el codigo que hoy esta en produccion sigue funcionando despues de correrla,
--  porque las columnas nuevas traen como valor por defecto la empresa "SISVIA".
--  Asi se puede correr en cualquier momento, antes de subir el codigo nuevo.
--
--  Que hace:
--    1. Tabla `empresas` y la empresa inicial "SISVIA" (con limites = lo que ya
--       tiene activo).
--    2. `empresa_id` en sedes, usuarios, vehiculos, chequeos, intentos
--       bloqueados y suplencias; todo lo existente queda en "SISVIA".
--       Los superadmin (equipo SISVIA) quedan sin empresa.
--    3. Rol nuevo `admin_empresa` (Administrador de empresa).
--    4. Catalogo base y propio: `empresa_id` vacio = base. Tabla de bloqueos.
--    5. Baja de vehiculos por traspaso y placa unica entre los no dados de baja.
--    6. Registro de las acciones sobre empresas.
--
--  Como correrla: Supabase -> SQL Editor -> pegar este archivo -> Run.
--  Al final muestra los conteos para comparar con los de antes.
--  Si algo falla, no se aplica nada (esta dentro de una transaccion).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Empresas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              TEXT NOT NULL,
    nit                 TEXT,
    ciudad_id           UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    telefono            TEXT,
    correo              TEXT,
    limite_sedes        INTEGER NOT NULL CHECK (limite_sedes >= 1),
    limite_vehiculos    INTEGER NOT NULL CHECK (limite_vehiculos >= 1),
    activa              BOOLEAN NOT NULL DEFAULT true,
    desactivada_en      TIMESTAMPTZ,
    ultimo_respaldo_en  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Nombre unico sin importar mayusculas (CB-14).
CREATE UNIQUE INDEX IF NOT EXISTS empresas_nombre_unico ON empresas (lower(nombre));
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Empresa inicial: todo lo que existe hoy es de ella (HU-07).
INSERT INTO empresas (nombre, limite_sedes, limite_vehiculos)
SELECT 'SISVIA',
       GREATEST(1, (SELECT count(*) FROM sedes WHERE activo)),
       GREATEST(1, (SELECT count(*) FROM vehiculos WHERE activo))
WHERE NOT EXISTS (SELECT 1 FROM empresas WHERE lower(nombre) = 'sisvia');

-- ---------------------------------------------------------------------------
-- 2. empresa_id en los datos de cada empresa
--    Valor por defecto = "SISVIA": el codigo viejo no la conoce y sigue andando.
--    El codigo nuevo siempre la manda explicita.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    v_sisvia UUID := (SELECT id FROM empresas WHERE lower(nombre) = 'sisvia');
    v_tabla  TEXT;
BEGIN
    FOREACH v_tabla IN ARRAY ARRAY['sedes', 'vehiculos', 'chequeos_preoperacionales', 'intentos_chequeo_bloqueado', 'suplencias'] LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE', v_tabla);
        EXECUTE format('UPDATE %I SET empresa_id = %L WHERE empresa_id IS NULL', v_tabla, v_sisvia);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET DEFAULT %L', v_tabla, v_sisvia);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN empresa_id SET NOT NULL', v_tabla);
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_empresa ON %I (empresa_id)', v_tabla, v_tabla);
    END LOOP;

    -- Usuarios: el superadmin (equipo SISVIA) no tiene empresa; todos los demas si.
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
    UPDATE usuarios SET empresa_id = v_sisvia WHERE empresa_id IS NULL AND rol <> 'superadmin';
    EXECUTE format('ALTER TABLE usuarios ALTER COLUMN empresa_id SET DEFAULT %L', v_sisvia);
    CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios (empresa_id);
END $$;

-- El default de usuarios pondria empresa a un superadmin nuevo: se la saca el
-- trigger, y la regla asegura que nadie mas quede sin empresa.
CREATE OR REPLACE FUNCTION usuarios_superadmin_sin_empresa() RETURNS trigger AS $$
BEGIN
    IF NEW.rol = 'superadmin' THEN
        NEW.empresa_id := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_superadmin_sin_empresa ON usuarios;
CREATE TRIGGER trg_usuarios_superadmin_sin_empresa
    BEFORE INSERT OR UPDATE OF rol, empresa_id ON usuarios
    FOR EACH ROW EXECUTE FUNCTION usuarios_superadmin_sin_empresa();

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_empresa_segun_rol;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_empresa_segun_rol
    CHECK (rol = 'superadmin' OR empresa_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 3. Rol nuevo: Administrador de empresa
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_nombre TEXT;
BEGIN
    SELECT conname INTO v_nombre
    FROM pg_constraint
    WHERE conrelid = 'usuarios'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%superadmin%' AND pg_get_constraintdef(oid) LIKE '%conductor%';
    IF v_nombre IS NOT NULL THEN
        EXECUTE format('ALTER TABLE usuarios DROP CONSTRAINT %I', v_nombre);
    END IF;
END $$;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN (
    'superadmin', 'admin_empresa', 'admin_departamental', 'admin_sede',
    'admin',  -- alias historico = admin_sede
    'conductor'
));

-- ---------------------------------------------------------------------------
-- 4. Catalogo: base (empresa_id vacio) y propio de cada empresa
-- ---------------------------------------------------------------------------
ALTER TABLE categorias_chequeo ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE items_chequeo      ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
ALTER TABLE preguntas_aptitud  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_categorias_empresa ON categorias_chequeo (empresa_id);
CREATE INDEX IF NOT EXISTS idx_items_empresa      ON items_chequeo (empresa_id);
CREATE INDEX IF NOT EXISTS idx_preguntas_empresa  ON preguntas_aptitud (empresa_id);

-- El nombre de categoria era unico en todo el sistema; ahora es unico dentro
-- del catalogo base y dentro de cada empresa. (Que una propia no repita el
-- nombre de una base lo controla la app: CB-08.)
ALTER TABLE categorias_chequeo DROP CONSTRAINT IF EXISTS categorias_chequeo_nombre_key;
CREATE UNIQUE INDEX IF NOT EXISTS categorias_nombre_por_catalogo
    ON categorias_chequeo (COALESCE(empresa_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nombre));

CREATE TABLE IF NOT EXISTS bloqueos_catalogo (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN ('categoria', 'item', 'pregunta')),
    elemento_id     INTEGER NOT NULL,       -- id del elemento BASE bloqueado
    bloqueado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (empresa_id, tipo, elemento_id)
);
ALTER TABLE bloqueos_catalogo ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. Baja por traspaso y placa unica entre los vehiculos no dados de baja
-- ---------------------------------------------------------------------------
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS dado_de_baja BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS baja_motivo  TEXT;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS baja_en      TIMESTAMPTZ;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS baja_por     UUID REFERENCES usuarios(id) ON DELETE SET NULL;
ALTER TABLE vehiculos DROP CONSTRAINT IF EXISTS vehiculos_placa_key;
CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_placa_unica_vigente ON vehiculos (placa) WHERE NOT dado_de_baja;

-- ---------------------------------------------------------------------------
-- 6. Registro de las acciones sobre empresas (RNF-05, RN-11)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria_empresas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id      UUID REFERENCES empresas(id) ON DELETE SET NULL,
    empresa_nombre  TEXT NOT NULL,          -- queda aunque la empresa se elimine
    actor_id        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion          TEXT NOT NULL,          -- 'creada', 'limites', 'desactivada', 'baja_vehiculo', ...
    detalles        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_empresas_empresa ON auditoria_empresas (empresa_id, created_at DESC);
ALTER TABLE auditoria_empresas ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verificacion: compara estos conteos con los de antes de correrla.
-- ---------------------------------------------------------------------------
SELECT 'empresas' AS que, count(*) AS total FROM empresas
UNION ALL SELECT 'sedes (todas en SISVIA)', count(*) FROM sedes WHERE empresa_id = (SELECT id FROM empresas WHERE lower(nombre) = 'sisvia')
UNION ALL SELECT 'sedes (total)', count(*) FROM sedes
UNION ALL SELECT 'usuarios de empresa', count(*) FROM usuarios WHERE empresa_id IS NOT NULL
UNION ALL SELECT 'usuarios superadmin (sin empresa)', count(*) FROM usuarios WHERE rol = 'superadmin' AND empresa_id IS NULL
UNION ALL SELECT 'usuarios (total)', count(*) FROM usuarios
UNION ALL SELECT 'vehiculos (total)', count(*) FROM vehiculos
UNION ALL SELECT 'chequeos (total)', count(*) FROM chequeos_preoperacionales
UNION ALL SELECT 'catalogo base: categorias', count(*) FROM categorias_chequeo WHERE empresa_id IS NULL
UNION ALL SELECT 'catalogo base: items', count(*) FROM items_chequeo WHERE empresa_id IS NULL
UNION ALL SELECT 'catalogo base: preguntas', count(*) FROM preguntas_aptitud WHERE empresa_id IS NULL;
