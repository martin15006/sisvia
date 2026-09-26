-- ============================================================================
--  SISVIA — INSTALACION COMPLETA EN UN SOLO ARCHIVO
-- ============================================================================
--  Generado el 2026-09-06 juntando database.sql + los 6 seeds.
--  Las 17 migraciones de database/migrations/ YA ESTAN incluidas en el
--  esquema: no hay que correr ninguna aparte.
--
--  COMO USARLO (Supabase)
--    1. Dashboard -> SQL Editor -> New query
--    2. Pegar TODO este archivo
--    3. Run
--    4. Al final sale una tabla de verificacion con los conteos
--
--  QUE DEJA INSTALADO
--    28 tablas + 10 triggers + indices + RLS activo
--    1 empresa inicial "SISVIA" (multi-empresa, pacto para-empresas)
--    5 categorias, 39 items de chequeo, 5 preguntas de aptitud
--    5 regiones, 33 departamentos, 1.122 municipios, 5 sedes de muestra
--
--  ANTES DE CORRERLO
--    - Sirve para una base VACIA o recien creada.
--    - Re-ejecutarlo sobre una base CON CHEQUEOS YA HECHOS falla a proposito
--      en el seed 02: `DELETE FROM items_chequeo` choca contra la llave
--      foranea de respuestas_chequeo. Eso PROTEGE el historial, pero el
--      script se corta ahi. Si necesitas re-sembrar catalogos con datos
--      vivos, hazlo a mano.
--
--  DESPUES DE CORRERLO
--    No hay usuarios todavia: mira el ultimo bloque del archivo para crear
--    tu primer administrador y poder entrar.
--
--  OJO CON RLS
--    Row Level Security queda ACTIVO y SIN POLITICAS. Es a proposito: la
--    llave anonima viaja en el bundle publico del frontend, y asi queda
--    denegada. El backend usa service_role, que se salta RLS. No la apagues.
-- ============================================================================



-- ==========================================================================
-- PARTE 1 de 3 · ESQUEMA
-- Tablas, triggers, indices y RLS
-- ==========================================================================

-- ==
-- SISVIA — Schema completo
-- ==

-- Este archivo contiene el schema COMPLETO de la base de datos del proyecto,
-- organizado por fases y en orden de dependencia para que sea ejecutable
-- desde cero sobre una base de datos vacía de PostgreSQL / Supabase.

-- Estructura:
--   FASE 2 (geografía) 
--   FASE 1 (usuarios) 
--   FASE 2 (vehículos) 
--   FASE 3 (chequeo)

-- Convenciones:
--   - snake_case en español para tablas y columnas
--   - UUID con gen_random_uuid() para entidades de negocio
--   - SERIAL (INTEGER autoincremental) para catálogos pequeños
--   - TIMESTAMPTZ para todas las fechas
--   - CREATE IF NOT EXISTS para que sea re-ejecutable sin riesgo
--   - Soft delete con activo BOOLEAN en tablas que se editan mucho

-- Notas:
--   - La tabla `usuarios` referencia auth.users de Supabase Auth
--     (la maneja Supabase, no se crea aquí)
--   - Los seeds de catálogos y datos iniciales están en la carpeta seeds/
-- ==


-- ==
-- FASE 2 · ESTRUCTURA GEOGRÁFICA NACIONAL
-- ==
-- Permite escalar el sistema a nivel nacional sin migraciones futuras.
-- Jerarquía: Regiones → Departamentos → Ciudades → Sedes

-- 5 regiones naturales de Colombia (Andina, Caribe, Pacífica, Amazónica, Orinoquía)
CREATE TABLE IF NOT EXISTS regiones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 32 departamentos de Colombia
CREATE TABLE IF NOT EXISTS departamentos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    region_id   UUID NOT NULL REFERENCES regiones(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(nombre, region_id)
);

-- Ciudades / municipios
CREATE TABLE IF NOT EXISTS ciudades (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre            TEXT NOT NULL,
    departamento_id   UUID NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(nombre, departamento_id)
);

-- Sedes de la organizacion
CREATE TABLE IF NOT EXISTS sedes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      TEXT NOT NULL,
    ciudad_id   UUID NOT NULL REFERENCES ciudades(id) ON DELETE CASCADE,
    direccion   TEXT,
    activo      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==
-- FASE 1 · AUTENTICACIÓN Y USUARIOS
-- ==

-- Usuarios del sistema (admins en sus niveles + conductores)
-- La columna id referencia a auth.users de Supabase Auth (gestión de password,
-- email, tokens, etc.) Las demás columnas son metadata específica del proyecto.
CREATE TABLE IF NOT EXISTS usuarios (
    id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identificación
    cedula                  TEXT UNIQUE,
    nombre_completo         TEXT NOT NULL,
    telefono                TEXT,
    foto_url                TEXT,

    -- Rol y multi-tenant. Roles vigentes tras aplanar la jerarquia (12 jun 2026):
    -- el producto no usa macro-region ni ciudad; una "Regional" equivale a un
    -- departamento (Director Regional). Etiquetas visibles: superadmin = Director
    -- Nacional, admin_departamental = Director Regional, admin_sede = Coordinador
    -- de Flota. (En la BD viva quedaron dormidos admin_regional/admin_ciudad porque
    -- Postgres no permite quitar valores de un enum en caliente; aqui ya no van.)
    rol                     TEXT NOT NULL CHECK (rol IN (
                                'superadmin',
                                'admin_departamental',
                                'admin_sede',
                                'admin',         -- alias histórico = admin_sede
                                'conductor'
                            )),
    -- Scope territorial del administrador (Fase 4 multinivel). Cada admin llena
    -- SOLO la columna de su nivel; el superadmin no llena ninguna (alcance nacional):
    --   admin_sede        -> sede_id
    --   admin_departamental -> departamento_id (Director Regional)
    -- El conductor usa sede_id (su sede de trabajo).
    -- ciudad_id y region_id quedan OBSOLETAS desde el aplanamiento del 12 jun 2026
    -- (solo las usaban los roles eliminados); se conservan por compatibilidad.
    sede_id               UUID REFERENCES sedes(id) ON DELETE SET NULL,
    ciudad_id               UUID REFERENCES ciudades(id) ON DELETE SET NULL,
    departamento_id         UUID REFERENCES departamentos(id) ON DELETE SET NULL,
    region_id               UUID REFERENCES regiones(id) ON DELETE SET NULL,

    -- Datos del conductor (solo si rol = 'conductor')
    licencia_numero         TEXT,
    licencia_categoria      TEXT,
    licencia_vencimiento    DATE,

    -- Seguridad social (obligatoria para conductores, tarea #90)
    eps                     TEXT,
    arl                     TEXT,

    -- Pool de transporte (Paso 1, ver docs/diseno-pool-vip.md): el conductor es
    -- "del pool"; maneja los vehiculos VIP. (Paso 2: podra suplir al Coordinador.)
    es_pool                 BOOLEAN NOT NULL DEFAULT false,

    -- Flujo de cambio obligatorio de password
    debe_cambiar_password   BOOLEAN NOT NULL DEFAULT false,

    -- Estado
    activo                  BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auditoría de operaciones administrativas sobre usuarios
CREATE TABLE IF NOT EXISTS auditoria_usuarios (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_afectado_id     UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion_por_id           UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion                  TEXT NOT NULL,    -- 'creado', 'editado', 'desactivado', 'reactivado', 'password_reseteado', 'eliminado'
    detalles                JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==
-- FASE 2 · VEHÍCULOS DE LA FLOTA
-- ==

-- Vehículos de la organización
CREATE TABLE IF NOT EXISTS vehiculos (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identificación
    placa                   TEXT NOT NULL UNIQUE,
    vin                     TEXT UNIQUE,
    marca                   TEXT NOT NULL,
    linea                   TEXT,
    tipo                    TEXT NOT NULL CHECK (tipo IN (
                                'automovil', 'motocicleta', 'motocarro',
                                'camion', 'camioneta', 'tractocamion',
                                'microbus', 'buseta', 'bus'
                            )),
    modelo_anio             INTEGER,
    color                   TEXT,
    kilometraje_actual      INTEGER,

    -- Documentación y vencimientos
    soat_vencimiento        DATE,
    rtm_vencimiento         DATE,
    extintor_vencimiento    DATE,
    ultimo_cambio_aceite    DATE,
    runt_url                TEXT,        -- PDF del RUNT en Cloudinary

    -- Estado operativo
    estado                  TEXT NOT NULL DEFAULT 'operativo' CHECK (estado IN (
                                'operativo', 'observacion', 'alerta', 'critico', 'no_operativo'
                            )),
    nivel_criticidad        INTEGER NOT NULL DEFAULT 0 CHECK (nivel_criticidad BETWEEN 0 AND 100),
    notas                   TEXT,

    -- Multi-tenant
    sede_id               UUID NOT NULL REFERENCES sedes(id) ON DELETE RESTRICT,

    -- Pool de transporte (Paso 1, ver docs/diseno-pool-vip.md): vehiculo "especial"
    -- / de direccion (personal del Coordinador o exclusivo de un director). Solo lo
    -- maneja un conductor del pool (usuarios.es_pool).
    es_vip                  BOOLEAN NOT NULL DEFAULT false,

    -- Estado del registro
    activo                  BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Galería de fotos del vehículo (sube el admin al registrarlo)
CREATE TABLE IF NOT EXISTS fotos_vehiculo (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehiculo_id     UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    descripcion     TEXT,
    es_principal    BOOLEAN NOT NULL DEFAULT false,
    orden           INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auditoría de operaciones sobre vehículos
CREATE TABLE IF NOT EXISTS auditoria_vehiculos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehiculo_id     UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    accion_por_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    accion          TEXT NOT NULL,    -- 'creado', 'actualizado', 'desactivado', 'reactivado', 'eliminado', 'runt_actualizado'
    detalles        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==
-- FASE 3 · CHEQUEO PREOPERACIONAL — CATÁLOGOS
-- ==

-- Las 5 categorías del checklist preoperacional
CREATE TABLE IF NOT EXISTS categorias_chequeo (
    id          SERIAL PRIMARY KEY,
    nombre      TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    icono       TEXT,
    orden       INTEGER NOT NULL,
    activo      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Los 39 ítems normativos del checklist
CREATE TABLE IF NOT EXISTS items_chequeo (
    id                  SERIAL PRIMARY KEY,
    categoria_id        INTEGER NOT NULL REFERENCES categorias_chequeo(id),
    descripcion         TEXT NOT NULL,
    descripcion_larga   TEXT,
    orden               INTEGER NOT NULL,
    es_critico          BOOLEAN NOT NULL DEFAULT false,
    aplica_a_tipos      TEXT[],                -- ['camion','camioneta',...] NULL = aplica a todos
    activo              BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Las 5 preguntas de aptitud del conductor
CREATE TABLE IF NOT EXISTS preguntas_aptitud (
    id              SERIAL PRIMARY KEY,
    pregunta        TEXT NOT NULL,
    respuesta_apta  TEXT NOT NULL CHECK (respuesta_apta IN ('si','no')),
    orden           INTEGER NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==
-- FASE 3 · EXCEPCIONES POR VEHÍCULO
-- ==

-- Ítems del checklist que NO aplican a un vehículo específico
-- (excepción puntual más allá del filtro general por tipo)
CREATE TABLE IF NOT EXISTS excepciones_items_vehiculo (
    id          SERIAL PRIMARY KEY,
    vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
    item_id     INTEGER NOT NULL REFERENCES items_chequeo(id) ON DELETE CASCADE,
    razon       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(vehiculo_id, item_id)
);


-- ==
-- FASE 3 · CHEQUEOS (CABECERA + DETALLE)
-- ==

-- Cabecera de cada chequeo preoperacional o post-operacional
CREATE TABLE IF NOT EXISTS chequeos_preoperacionales (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehiculo_id             UUID NOT NULL REFERENCES vehiculos(id) ON DELETE RESTRICT,
    conductor_id            UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    sede_id               UUID NOT NULL,

    tipo                    TEXT NOT NULL CHECK (tipo IN ('preoperacional','postoperacional')),
    es_oficial              BOOLEAN NOT NULL DEFAULT false,

    fecha                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kilometraje             INTEGER NOT NULL,

    -- Resultado calculado al cerrar
    resultado_estado        TEXT CHECK (resultado_estado IN ('operativo','observacion','alerta','critico','no_operativo')),
    resultado_criticidad    INTEGER CHECK (resultado_criticidad BETWEEN 0 AND 100),
    items_cumple_count      INTEGER NOT NULL DEFAULT 0,
    items_no_cumple_count   INTEGER NOT NULL DEFAULT 0,
    items_no_aplica_count   INTEGER NOT NULL DEFAULT 0,
    tiene_falla_critica     BOOLEAN NOT NULL DEFAULT false,

    -- Ciclo de vida del chequeo
    cerrado                 BOOLEAN NOT NULL DEFAULT false,
    fecha_cierre            TIMESTAMPTZ,

    -- Abandono: cuando el conductor sale sin cerrar el chequeo (cierra sesion,
    -- cierra pestaña, o queda inactivo durante mas de 2 minutos). El admin recibe
    -- una alerta. Ver tarea #104.
    abandonado              BOOLEAN NOT NULL DEFAULT false,
    abandonado_en           TIMESTAMPTZ,
    motivo_abandono         TEXT CHECK (motivo_abandono IN (
                                'inactividad',     -- 2 min sin tocar la pantalla
                                'cerro_sesion',    -- pulso cerrar sesion (futuro)
                                'cerro_pestana',   -- onbeforeunload
                                'manual'           -- admin lo cancelo
                            )),

    notas_generales         TEXT,

    -- Items que le tocaron al iniciar (RN-07 del pacto para-empresas): el cierre
    -- espera esas respuestas y un cambio del catalogo no lo afecta (CB-04).
    catalogo_items          INTEGER[],

    -- Timestamps
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una respuesta por cada ítem del checklist dentro de un chequeo
CREATE TABLE IF NOT EXISTS respuestas_chequeo (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chequeo_id   UUID NOT NULL REFERENCES chequeos_preoperacionales(id) ON DELETE CASCADE,
    item_id      INTEGER NOT NULL REFERENCES items_chequeo(id),

    estado       TEXT NOT NULL CHECK (estado IN ('cumple','no_cumple','no_aplica')),
    observacion  TEXT,        -- obligatorio si estado='no_cumple' (validación en backend)

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(chequeo_id, item_id)
);

-- Una respuesta por cada pregunta de aptitud dentro de un chequeo
CREATE TABLE IF NOT EXISTS respuestas_aptitud (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chequeo_id   UUID NOT NULL REFERENCES chequeos_preoperacionales(id) ON DELETE CASCADE,
    pregunta_id  INTEGER NOT NULL REFERENCES preguntas_aptitud(id),

    respuesta    TEXT NOT NULL CHECK (respuesta IN ('si','no')),
    es_apto      BOOLEAN NOT NULL,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(chequeo_id, pregunta_id)
);


-- ==
-- FASE 3 · FOTOS DE EVIDENCIA DEL CHEQUEO
-- ==
-- Política: Máx 5 fotos por respuesta NO CUMPLE (validación en backend).
-- Borrado automático a los 12 meses salvo preservar_siempre = true.

CREATE TABLE IF NOT EXISTS fotos_chequeo (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    respuesta_id                UUID NOT NULL REFERENCES respuestas_chequeo(id) ON DELETE CASCADE,

    url                         TEXT NOT NULL,
    cloudinary_public_id        TEXT,
    descripcion                 TEXT,

    fecha_subida                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    preservar_siempre           BOOLEAN NOT NULL DEFAULT false,
    fecha_borrado_programado    TIMESTAMPTZ,     -- calculada por trigger

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==
-- FASE 3 · LOGS Y AUDITORÍA
-- ==

-- Cuando un conductor intenta hacer un chequeo pero el sistema lo bloquea
CREATE TABLE IF NOT EXISTS intentos_chequeo_bloqueado (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conductor_id        UUID NOT NULL REFERENCES usuarios(id),
    vehiculo_id         UUID REFERENCES vehiculos(id),
    sede_id           UUID,

    razon               TEXT NOT NULL CHECK (razon IN (
                            'conductor_no_apto',
                            'vehiculo_desactivado',
                            'vehiculo_no_existe',
                            'sesion_invalida',
                            'licencia_vencida'
                        )),
    detalle             TEXT,

    fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notificado_admin    BOOLEAN NOT NULL DEFAULT false,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auditoría de operaciones sobre chequeos
CREATE TABLE IF NOT EXISTS auditoria_chequeos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chequeo_id      UUID,
    accion_por_id   UUID NOT NULL REFERENCES usuarios(id),
    accion          TEXT NOT NULL,
    detalles        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Suplencias del pool (Paso 2, ver docs/superpowers/specs/2026-06-14-suplencia-pool-design.md):
-- un conductor del pool reemplaza temporalmente al Coordinador de sede. Puede cubrir un
-- solo sede (alcance='sede', sede_id) o toda una regional/departamento
-- (alcance='departamento', departamento_id) — Fase B.
CREATE TABLE IF NOT EXISTS suplencias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id             UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    alcance             TEXT NOT NULL DEFAULT 'sede',   -- 'sede' | 'departamento'
    sede_id           UUID REFERENCES sedes(id) ON DELETE CASCADE,   -- si alcance='sede'
    departamento_id     UUID REFERENCES departamentos(id) ON DELETE CASCADE,       -- si alcance='departamento'
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
CREATE INDEX IF NOT EXISTS idx_suplencias_departamento  ON suplencias(departamento_id);


-- ==
-- FASE 4 BLOQUE C · NOTIFICACIONES
-- ==

-- Notificaciones para los admins. Una notificacion se crea automaticamente
-- cuando ocurre un evento relevante (chequeo abandonado, vehiculo no operativo,
-- intento bloqueado, licencia por vencer). El admin la ve en la campanita del
-- header y puede marcarla como leida al hacer clic.
CREATE TABLE IF NOT EXISTS notificaciones (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- A quien le llega
    destinatario_id     UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Que tipo de evento la genero. Sin CHECK a proposito: la validacion de
    -- tipos vive en el codigo (notificaciones.service.js) para poder agregar
    -- tipos nuevos sin migrar la BD. Tipos actuales:
    --   chequeo_operativo, chequeo_observacion, chequeo_alerta, chequeo_critico,
    --   chequeo_no_operativo, chequeo_abandonado, intento_bloqueado_aptitud,
    --   intento_bloqueado_vehiculo, licencia_proxima_vencer, licencia_vencida,
    --   vehiculo_sin_runt, sistema
    tipo                TEXT NOT NULL,

    -- Texto visible al usuario
    titulo              TEXT NOT NULL,
    mensaje             TEXT NOT NULL,

    -- A donde ir si se hace clic (opcional)
    url_destino         TEXT,

    -- Contexto: ids de las entidades relacionadas (opcionales)
    chequeo_id          UUID,
    vehiculo_id         UUID,
    conductor_id        UUID,

    -- Estado de lectura
    leida               BOOLEAN NOT NULL DEFAULT false,
    leida_en            TIMESTAMPTZ,

    -- Timestamp
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ==
-- FUNCIONES Y TRIGGERS
-- ==

-- Función genérica: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger updated_at a todas las tablas que lo usan
DROP TRIGGER IF EXISTS trg_sedes_updated_at ON sedes;
CREATE TRIGGER trg_sedes_updated_at
    BEFORE UPDATE ON sedes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON usuarios;
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_vehiculos_updated_at ON vehiculos;
CREATE TRIGGER trg_vehiculos_updated_at
    BEFORE UPDATE ON vehiculos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trg_chequeos_updated_at ON chequeos_preoperacionales;
CREATE TRIGGER trg_chequeos_updated_at
    BEFORE UPDATE ON chequeos_preoperacionales
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at();


-- Función: calcular fecha_borrado_programado al subir una foto de chequeo
-- Si preservar_siempre = true, la fecha se pone NULL (la foto nunca se borra)
-- Si preservar_siempre = false, se calcula fecha_subida + 12 meses
CREATE OR REPLACE FUNCTION fotos_chequeo_calcular_borrado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.preservar_siempre = true THEN
        NEW.fecha_borrado_programado := NULL;
    ELSIF NEW.fecha_borrado_programado IS NULL THEN
        NEW.fecha_borrado_programado := NEW.fecha_subida + INTERVAL '12 months';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fotos_chequeo_borrado ON fotos_chequeo;
CREATE TRIGGER trg_fotos_chequeo_borrado
    BEFORE INSERT OR UPDATE OF preservar_siempre ON fotos_chequeo
    FOR EACH ROW
    EXECUTE FUNCTION fotos_chequeo_calcular_borrado();


-- ==
-- ÍNDICES (para queries frecuentes)
-- ==

-- Vehículos
CREATE INDEX IF NOT EXISTS idx_vehiculos_sede              ON vehiculos(sede_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado_activo       ON vehiculos(estado, activo);
CREATE INDEX IF NOT EXISTS idx_vehiculos_es_vip              ON vehiculos(es_vip);
CREATE INDEX IF NOT EXISTS idx_fotos_vehiculo_vehiculo       ON fotos_vehiculo(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_vehiculos_fecha     ON auditoria_vehiculos(vehiculo_id, created_at DESC);

-- Usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_sede               ON usuarios(sede_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_ciudad               ON usuarios(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_departamento         ON usuarios(departamento_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_region               ON usuarios(region_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_activo           ON usuarios(rol, activo);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuarios_fecha      ON auditoria_usuarios(usuario_afectado_id, created_at DESC);

-- Geografía
CREATE INDEX IF NOT EXISTS idx_sedes_ciudad                ON sedes(ciudad_id);
CREATE INDEX IF NOT EXISTS idx_ciudades_departamento         ON ciudades(departamento_id);
CREATE INDEX IF NOT EXISTS idx_departamentos_region          ON departamentos(region_id);

-- Chequeos
CREATE INDEX IF NOT EXISTS idx_chequeos_vehiculo             ON chequeos_preoperacionales(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_chequeos_conductor            ON chequeos_preoperacionales(conductor_id);
CREATE INDEX IF NOT EXISTS idx_chequeos_sede               ON chequeos_preoperacionales(sede_id);
CREATE INDEX IF NOT EXISTS idx_chequeos_fecha                ON chequeos_preoperacionales(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_chequeos_oficial_fecha
    ON chequeos_preoperacionales(es_oficial, fecha)
    WHERE es_oficial = true;

-- Indice parcial para chequeos abandonados (Tarea #104): solo indexa filas con
-- abandonado=true, mucho mas eficiente que un indice normal cuando la mayoria
-- de chequeos no estan abandonados. Lo usa el dashboard para listar los del dia.
CREATE INDEX IF NOT EXISTS idx_chequeos_abandonados
    ON chequeos_preoperacionales(abandonado_en DESC)
    WHERE abandonado = true;

-- Notificaciones (Bloque C)
CREATE INDEX IF NOT EXISTS idx_notificaciones_destinatario
    ON notificaciones(destinatario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_no_leidas
    ON notificaciones(destinatario_id)
    WHERE leida = false;

CREATE INDEX IF NOT EXISTS idx_respuestas_chequeo_chequeo    ON respuestas_chequeo(chequeo_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_aptitud_chequeo    ON respuestas_aptitud(chequeo_id);

-- Fotos del chequeo
CREATE INDEX IF NOT EXISTS idx_fotos_chequeo_respuesta       ON fotos_chequeo(respuesta_id);
CREATE INDEX IF NOT EXISTS idx_fotos_chequeo_borrado_pendiente
    ON fotos_chequeo(fecha_borrado_programado)
    WHERE preservar_siempre = false AND fecha_borrado_programado IS NOT NULL;

-- Intentos bloqueados
CREATE INDEX IF NOT EXISTS idx_intentos_bloqueado_conductor_fecha
    ON intentos_chequeo_bloqueado(conductor_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_intentos_bloqueado_no_notificados
    ON intentos_chequeo_bloqueado(sede_id, fecha)
    WHERE notificado_admin = false;


-- ==
-- ACTIVAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- ==
-- RLS ACTIVADO (2026-06-23, hallazgo de seguridad): la "anon key" de Supabase viaja
-- en el bundle PÚBLICO del frontend; con RLS apagado, cualquiera podía leer/escribir
-- la base directamente por la API REST, saltándose el backend. Con RLS activo y SIN
-- políticas, el rol anon (y authenticated) queda DENEGADO por defecto. El backend usa
-- service_role (BYPASSRLS) → sus consultas NO cambian. El Realtime anónimo de
-- notificaciones cae al polling de respaldo (useNotificaciones.js).
-- Ver migrations/2026-06-23_activar_rls.sql.
-- (Antes estaba DISABLE por BUG-008, que era sobre queries sujetas a RLS; el backend
-- con service_role nunca lo está, y el keepAlive ya mantiene la conexión caliente.)

ALTER TABLE regiones                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE departamentos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciudades                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_usuarios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_vehiculo              ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_vehiculos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_chequeo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_chequeo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE preguntas_aptitud           ENABLE ROW LEVEL SECURITY;
ALTER TABLE excepciones_items_vehiculo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chequeos_preoperacionales   ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_chequeo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_aptitud          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_chequeo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_chequeo_bloqueado  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_chequeos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE suplencias                  ENABLE ROW LEVEL SECURITY;


-- ==
-- INTENTOS DE LOGIN (anti fuerza bruta): 5 contraseñas falladas seguidas
-- por cuenta -> bloqueo de 15 minutos. El backend lo gestiona; ver
-- migrations/2026-06-20_login_intentos.sql
-- ==
CREATE TABLE IF NOT EXISTS intentos_login (
    email           text        PRIMARY KEY,
    intentos        integer     NOT NULL DEFAULT 0,
    bloqueado_hasta timestamptz,
    actualizado_en  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE intentos_login              ENABLE ROW LEVEL SECURITY;


-- ==========================================================================
-- EMPRESAS (2026-09-18, pacto para-empresas)
-- Igual a migrations/2026-09-18_empresas.sql. Crea la empresa "SISVIA" y deja
-- todo lo que se cargue sin empresa_id dentro de ella.
-- ==========================================================================

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

-- ---------------------------------------------------------------------------
-- 7. Escribir a SISVIA (HU-18): el mensaje de una empresa y su hilo
--    (migracion 2026-09-19_buzon.sql). Se borran con la empresa (CB-21).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 8. Actividad de la empresa y Dueño de SISVIA (HU-19 · HU-20 · RN-14 · RN-15)
--    (migracion 2026-09-21_actividad_y_dueno.sql). Cada registro de vehiculos,
--    usuarios y empresas se copia solo a la actividad; las sedes y el catalogo
--    propio los escribe el backend. La marca de dueño va a lo sumo en una cuenta.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividad (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- NULL: lo del equipo SISVIA sin empresa (sus cuentas) o de una empresa ya eliminada
    empresa_id      UUID REFERENCES empresas(id) ON DELETE SET NULL,
    empresa_nombre  TEXT,
    actor_id        UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    actor_nombre    TEXT NOT NULL,                  -- queda aunque la persona se elimine (CB-24)
    actor_cargo     TEXT,
    de_sisvia       BOOLEAN NOT NULL DEFAULT false, -- lo hizo alguien del equipo SISVIA
    tipo            TEXT NOT NULL CHECK (tipo IN ('vehiculo', 'usuario', 'sede', 'catalogo', 'empresa', 'equipo')),
    accion          TEXT NOT NULL,
    objeto_id       TEXT,                           -- id de lo que se toco (texto: el catalogo usa enteros)
    objeto          TEXT,                           -- su nombre: placa, persona, sede, item...
    detalles        JSONB,
    origen          TEXT UNIQUE,                    -- de que registro se copio (evita duplicar)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actividad_empresa ON actividad (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actividad_equipo  ON actividad (created_at DESC) WHERE de_sisvia;
ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;

-- El cargo con el que se muestra a quien hizo algo (mismas etiquetas que la app).
CREATE OR REPLACE FUNCTION actividad_cargo(p_rol TEXT, p_pool BOOLEAN) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p_rol
        WHEN 'superadmin' THEN 'Administrador general'
        WHEN 'admin_empresa' THEN 'Administrador de empresa'
        WHEN 'admin_departamental' THEN 'Director Regional'
        WHEN 'admin_sede' THEN 'Coordinador de sede'
        WHEN 'admin' THEN 'Coordinador de sede'
        WHEN 'conductor' THEN CASE WHEN p_pool THEN 'Pool de transporte' ELSE 'Conductor' END
        ELSE NULL END
$$;

-- ---------------------------------------------------------------------------
-- 2. Copiar cada registro a la actividad (los viejos y los que vengan)
-- ---------------------------------------------------------------------------

-- Vehiculos: van a la empresa del vehiculo.
CREATE OR REPLACE FUNCTION actividad_copiar_vehiculo(p auditoria_vehiculos) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO actividad (empresa_id, empresa_nombre, actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto, detalles, origen, created_at)
    SELECT v.empresa_id, e.nombre, p.accion_por_id, COALESCE(u.nombre_completo, 'Alguien que ya no está'), actividad_cargo(u.rol, u.es_pool),
           COALESCE(u.rol = 'superadmin', false), 'vehiculo', p.accion, v.id::text, COALESCE(p.detalles->>'placa', v.placa), p.detalles,
           'auditoria_vehiculos:' || p.id, p.created_at
    FROM vehiculos v
    JOIN empresas e ON e.id = v.empresa_id
    LEFT JOIN usuarios u ON u.id = p.accion_por_id
    WHERE v.id = p.vehiculo_id
    ON CONFLICT (origen) DO NOTHING;
END;
$$;

-- Usuarios: los de una empresa van a su actividad; los del equipo SISVIA, al
-- registro del equipo (sin empresa).
CREATE OR REPLACE FUNCTION actividad_copiar_usuario(p auditoria_usuarios) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO actividad (empresa_id, empresa_nombre, actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto, detalles, origen, created_at)
    SELECT e.id, e.nombre, p.accion_por_id, COALESCE(u.nombre_completo, 'Alguien que ya no está'), actividad_cargo(u.rol, u.es_pool),
           COALESCE(u.rol = 'superadmin', false), CASE WHEN af.rol = 'superadmin' THEN 'equipo' ELSE 'usuario' END,
           p.accion, af.id::text, COALESCE(p.detalles->>'nombre', af.nombre_completo), p.detalles,
           'auditoria_usuarios:' || p.id, p.created_at
    FROM usuarios af
    LEFT JOIN empresas e ON e.id = af.empresa_id AND af.rol <> 'superadmin'
    LEFT JOIN usuarios u ON u.id = p.accion_por_id
    WHERE af.id = p.usuario_afectado_id
    ON CONFLICT (origen) DO NOTHING;
END;
$$;

-- Lo que hizo el equipo SISVIA con las empresas y adentro de ellas. Los cambios
-- en vehiculos y usuarios ya se copian arriba con su detalle: su copia
-- "soporte" no se repite.
CREATE OR REPLACE FUNCTION actividad_copiar_empresa(p auditoria_empresas) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_ruta TEXT := COALESCE(p.detalles->>'ruta', '');
BEGIN
    IF p.accion = 'soporte' AND (v_ruta LIKE '/api/vehiculos%' OR v_ruta LIKE '/api/usuarios%') THEN
        RETURN;
    END IF;
    INSERT INTO actividad (empresa_id, empresa_nombre, actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto, detalles, origen, created_at)
    SELECT p.empresa_id, p.empresa_nombre, p.actor_id, COALESCE(u.nombre_completo, 'Alguien del equipo SISVIA'),
           COALESCE(actividad_cargo(u.rol, u.es_pool), 'Administrador general'), true,
           CASE WHEN v_ruta LIKE '/api/geo/sedes%' THEN 'sede'
                WHEN v_ruta LIKE '/api/catalogo-admin%' THEN 'catalogo'
                ELSE 'empresa' END,
           p.accion, CASE WHEN p.accion = 'soporte' THEN NULL ELSE p.empresa_id::text END,
           CASE WHEN p.accion = 'soporte' THEN p.detalles->>'elemento' ELSE p.empresa_nombre END, p.detalles,
           'auditoria_empresas:' || p.id, p.created_at
    FROM (SELECT 1) uno
    LEFT JOIN usuarios u ON u.id = p.actor_id
    ON CONFLICT (origen) DO NOTHING;
END;
$$;

-- Los que vengan: al escribirse. Si la copia falla, el registro de siempre se
-- guarda igual (solo queda un aviso en el log de la base).
CREATE OR REPLACE FUNCTION actividad_al_registrar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        CASE TG_TABLE_NAME
            WHEN 'auditoria_vehiculos' THEN PERFORM actividad_copiar_vehiculo(NEW);
            WHEN 'auditoria_usuarios'  THEN PERFORM actividad_copiar_usuario(NEW);
            WHEN 'auditoria_empresas'  THEN PERFORM actividad_copiar_empresa(NEW);
        END CASE;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'actividad: no se copio % %: %', TG_TABLE_NAME, NEW.id, SQLERRM;
    END;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS actividad_vehiculos ON auditoria_vehiculos;
CREATE TRIGGER actividad_vehiculos AFTER INSERT ON auditoria_vehiculos FOR EACH ROW EXECUTE FUNCTION actividad_al_registrar();
DROP TRIGGER IF EXISTS actividad_usuarios ON auditoria_usuarios;
CREATE TRIGGER actividad_usuarios AFTER INSERT ON auditoria_usuarios FOR EACH ROW EXECUTE FUNCTION actividad_al_registrar();
DROP TRIGGER IF EXISTS actividad_empresas ON auditoria_empresas;
CREATE TRIGGER actividad_empresas AFTER INSERT ON auditoria_empresas FOR EACH ROW EXECUTE FUNCTION actividad_al_registrar();

-- Los que ya estan (HU-19.2)
DO $$ BEGIN
    PERFORM actividad_copiar_vehiculo(a) FROM auditoria_vehiculos a;
    PERFORM actividad_copiar_usuario(a)  FROM auditoria_usuarios a;
    PERFORM actividad_copiar_empresa(a)  FROM auditoria_empresas a;
END $$;

-- ---------------------------------------------------------------------------
-- 3. La marca de dueño (RN-15)
-- ---------------------------------------------------------------------------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_dueno BOOLEAN NOT NULL DEFAULT false;
-- Puede haber varios dueños (enmienda 7): la marca no es unica.
-- Cada dueño es siempre un Administrador general activo: ni un error ni una
-- llamada directa pueden desactivarlo o cambiarle el rol (HU-20.4).
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_dueno_superadmin_activo;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_dueno_superadmin_activo CHECK (NOT es_dueno OR (rol = 'superadmin' AND activo));
-- ...y su cuenta no se borra (tampoco desde el panel de Supabase: primero se quita la marca)
CREATE OR REPLACE FUNCTION impedir_borrar_dueno() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.es_dueno THEN
        RAISE EXCEPTION 'La cuenta del dueño de SISVIA no se puede eliminar: primero quítate la marca.' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS usuarios_impedir_borrar_dueno ON usuarios;
CREATE TRIGGER usuarios_impedir_borrar_dueno BEFORE DELETE ON usuarios FOR EACH ROW EXECUTE FUNCTION impedir_borrar_dueno();

-- ---------------------------------------------------------------------------
-- 4. Dar, pasar y quitarse la marca, cada una en una sola operacion
--    (HU-20.5-7 · RN-15 · CB-22 · CB-23)
-- ---------------------------------------------------------------------------
-- Deja anotado en el registro del equipo quien hizo el cambio y sobre quien.
CREATE OR REPLACE FUNCTION actividad_marca_dueno(p_quien usuarios, p_sobre usuarios, p_accion TEXT) RETURNS void LANGUAGE sql AS $$
    INSERT INTO actividad (actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto)
    VALUES (p_quien.id, p_quien.nombre_completo, 'Administrador general', true, 'equipo', p_accion,
            CASE WHEN p_sobre IS NULL THEN NULL ELSE p_sobre.id::text END,
            CASE WHEN p_sobre IS NULL THEN p_quien.nombre_completo ELSE p_sobre.nombre_completo END);
$$;

-- El destino sirve si es otro Administrador general activo que todavia no es dueño (CB-22).
CREATE OR REPLACE FUNCTION marca_destino_valido(p_de UUID, p_a UUID) RETURNS usuarios LANGUAGE plpgsql AS $$
DECLARE
    v_destino usuarios%ROWTYPE;
BEGIN
    SELECT * INTO v_destino FROM usuarios
    WHERE id = p_a AND id <> p_de AND rol = 'superadmin' AND activo AND NOT es_dueno;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'destino_invalido';
    END IF;
    RETURN v_destino;
END;
$$;

-- HU-20.5: dar la marca. Los dos quedan dueños.
CREATE OR REPLACE FUNCTION dar_marca_dueno(p_de UUID, p_a UUID) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_de      usuarios%ROWTYPE;
    v_destino usuarios%ROWTYPE;
BEGIN
    SELECT * INTO v_de FROM usuarios WHERE id = p_de AND es_dueno FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ya_cambio';   -- quien la da ya no es dueño
    END IF;
    v_destino := marca_destino_valido(p_de, p_a);
    UPDATE usuarios SET es_dueno = true WHERE id = v_destino.id;
    PERFORM actividad_marca_dueno(v_de, v_destino, 'dio_marca');
END;
$$;

-- HU-20.6: pasarle la mia. El otro queda dueño y quien la pasa deja de serlo.
CREATE OR REPLACE FUNCTION pasar_marca_dueno(p_de UUID, p_a UUID) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_de      usuarios%ROWTYPE;
    v_destino usuarios%ROWTYPE;
BEGIN
    SELECT * INTO v_de FROM usuarios WHERE id = p_de AND es_dueno FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ya_cambio';
    END IF;
    v_destino := marca_destino_valido(p_de, p_a);
    UPDATE usuarios SET es_dueno = true  WHERE id = v_destino.id;
    UPDATE usuarios SET es_dueno = false WHERE id = p_de;
    PERFORM actividad_marca_dueno(v_de, v_destino, 'traspaso_dueno');
END;
$$;

-- HU-20.7: quitarse la propia. El ultimo dueño no puede: la app nunca queda sin
-- ninguno (CB-23). El FOR UPDATE de todos los dueños hace esperar al otro que
-- este haciendo lo mismo al mismo tiempo.
CREATE OR REPLACE FUNCTION quitarme_marca_dueno(p_quien UUID) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_yo      usuarios%ROWTYPE;
    v_cuantos INTEGER;
BEGIN
    PERFORM id FROM usuarios WHERE es_dueno ORDER BY id FOR UPDATE;
    SELECT count(*) INTO v_cuantos FROM usuarios WHERE es_dueno;
    SELECT * INTO v_yo FROM usuarios WHERE id = p_quien AND es_dueno;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ya_cambio';
    END IF;
    IF v_cuantos <= 1 THEN
        RAISE EXCEPTION 'ultimo_dueno';
    END IF;
    UPDATE usuarios SET es_dueno = false WHERE id = p_quien;
    PERFORM actividad_marca_dueno(v_yo, NULL, 'dejo_marca');
END;
$$;

-- Solo el backend: con la llave publica nadie las puede llamar por la API.
DO $$
DECLARE
    v_funcion TEXT;
BEGIN
    FOREACH v_funcion IN ARRAY ARRAY['dar_marca_dueno(uuid, uuid)', 'pasar_marca_dueno(uuid, uuid)', 'quitarme_marca_dueno(uuid)',
                                     'marca_destino_valido(uuid, uuid)', 'actividad_marca_dueno(usuarios, usuarios, text)',
                                     'actividad_copiar_vehiculo(auditoria_vehiculos)',
                                     'actividad_copiar_usuario(auditoria_usuarios)', 'actividad_copiar_empresa(auditoria_empresas)'] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_funcion);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_funcion); END IF;
    END LOOP;
END $$;

COMMIT;


-- ==========================================================================
-- PARTE 2 de 3 · DATOS INICIALES
-- Catalogos del chequeo y geografia de Colombia
-- ==========================================================================



-- ==========================================================================
-- SEED 01_categorias_chequeo
-- ==========================================================================

-- ==
-- Seed: 5 categorías del checklist preoperacional
-- ==
-- Orden de ejecución: 01 (antes de items y preguntas)
-- Idempotente: usa ON CONFLICT para no duplicar

INSERT INTO categorias_chequeo (nombre, descripcion, icono, orden) VALUES
    ('NIVELES',        'Fluidos del vehículo',                      '💧', 1),
    ('PEDALES',        'Acelerador, embrague y freno',              '🦶', 2),
    ('LUCES',          'Sistema de iluminación completo',           '💡', 3),
    ('SEGURIDAD VIAL', 'Kit de carretera obligatorio',              '🛟', 4),
    ('VARIOS',         'Estado mecánico y accesorios del vehículo', '🚛', 5)
ON CONFLICT DO NOTHING;  -- el nombre es unico por catalogo (base o de cada empresa)


-- ==========================================================================
-- SEED 02_items_chequeo
-- ==========================================================================

-- ==
-- Seed: 39 ítems normativos del checklist preoperacional
-- ==
-- Orden de ejecución: 02 (después de 01_categorias_chequeo)
-- Idempotente: borra los items anteriores y vuelve a insertar
--
-- Ítems CRÍTICOS (bloquean automáticamente el vehículo si NO CUMPLE):
--   - Líquido de frenos
--   - Freno (agarre) - pedal del freno
--   - Luces (altas, medias, bajas)
--   - Direccionales
--   - Stops (frenos)
--   - Freno de emergencia
-- ==

-- Limpiar para que la re-ejecución sea consistente
DELETE FROM items_chequeo;

-- Insertar usando subconsulta para resolver categoria_id por nombre
DO $$
DECLARE
    cat_niveles     INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'NIVELES');
    cat_pedales     INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'PEDALES');
    cat_luces       INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'LUCES');
    cat_seguridad   INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'SEGURIDAD VIAL');
    cat_varios      INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'VARIOS');
BEGIN
    INSERT INTO items_chequeo (categoria_id, descripcion, descripcion_larga, orden, es_critico) VALUES
        -- NIVELES (5 ítems)
        (cat_niveles, 'Líquido refrigerante de radiador', NULL,                                                                 1, false),
        (cat_niveles, 'Líquido de frenos',                NULL,                                                                 2, true),  -- CRÍTICO
        (cat_niveles, 'Aceite motor',                     NULL,                                                                 3, false),
        (cat_niveles, 'Nivel líquido hidráulico',         NULL,                                                                 4, false),
        (cat_niveles, 'Agua de limpiavidrios',            NULL,                                                                 5, false),

        -- PEDALES (3 ítems)
        (cat_pedales, 'Acelerador',                       'Verificar elemento antideslizante, rango de desplazamiento y graduación',  6, false),
        (cat_pedales, 'Clutch (cloche / embrague)',       'Verificar elemento antideslizante, rango de desplazamiento y graduación',  7, false),
        (cat_pedales, 'Freno (agarre)',                   'Verificar elemento antideslizante, rango de desplazamiento y graduación',  8, true),  -- CRÍTICO

        -- LUCES (7 ítems)
        (cat_luces,   'Luces (altas, medias, bajas)',     NULL,                                                                 9, true),  -- CRÍTICO
        (cat_luces,   'Direccionales',                    NULL,                                                                10, true),  -- CRÍTICO
        (cat_luces,   'Estacionarias',                    NULL,                                                                11, false),
        (cat_luces,   'Stops (frenos)',                   NULL,                                                                12, true),  -- CRÍTICO
        (cat_luces,   'Testigos del tablero',             NULL,                                                                13, false),
        (cat_luces,   'Luz de reversa',                   NULL,                                                                14, false),
        (cat_luces,   'Luces internas',                   NULL,                                                                15, false),

        -- SEGURIDAD VIAL / KIT DE CARRETERA (8 ítems)
        (cat_seguridad, 'Extintor (BC - ABC)',                                            NULL,                                  16, false),
        (cat_seguridad, 'Fecha de vencimiento del extintor',                              NULL,                                  17, false),
        (cat_seguridad, 'Cruceta acorde a los pernos',                                    NULL,                                  18, false),
        (cat_seguridad, '2 señales reflectivas en triángulo',                             'Con soporte para ubicación vertical o lámparas de luz amarilla intermitente', 19, false),
        (cat_seguridad, 'Caja de herramientas',                                           'Mínimo alicate, destornilladores, llaves de expansión y llaves fijas. Medidor de presión de aire en vehículo operativo', 20, false),
        (cat_seguridad, 'Linterna',                                                       NULL,                                  21, false),
        (cat_seguridad, 'Botiquín de primeros auxilios',                                  'Gasas antisépticas, tapabocas, esparadrapo, tijeras, vendas elásticas, guantes quirúrgicos, yodopovidona, curas', 22, false),
        (cat_seguridad, 'Gato',                                                           NULL,                                  23, false),

        -- VARIOS / ESTADO MECÁNICO Y ACCESORIOS (16 ítems)
        (cat_varios, 'Llantas',                          'Labrado de 2 mm de profundidad mínima y aire correcto',              24, false),
        (cat_varios, 'Batería',                          'Bornes, sin corrosión ni sulfatación',                               25, false),
        (cat_varios, 'Rines',                            'Verificar que no tengan golpes ni fisuras',                          26, false),
        (cat_varios, 'Cinturones de seguridad',          'En todos los puestos: ajuste de hebillas, estado de correas, anclajes a piso y parales, prueba de impacto', 27, false),
        (cat_varios, 'Alarma de reversa',                'Solo en vehículos operativos',                                       28, false),
        (cat_varios, 'Pito',                             NULL,                                                                 29, false),
        (cat_varios, 'Freno de emergencia',              NULL,                                                                 30, true),  -- CRÍTICO
        (cat_varios, 'Espejos laterales y cabina',       'Sin fisuras',                                                        31, false),
        (cat_varios, 'Estado carcasa luces',             NULL,                                                                 32, false),
        (cat_varios, 'Plumillas / limpiaparabrisas',     'No deben dejar marcas de agua durante el recorrido',                 33, false),
        (cat_varios, 'Aire acondicionado',               'Solo aplica si el vehículo tiene A/C',                               34, false),
        (cat_varios, 'Panorámico',                       'Sin fisuras',                                                        35, false),
        (cat_varios, 'Puertas',                          NULL,                                                                 36, false),
        (cat_varios, 'Cintas reflectivas',               NULL,                                                                 37, false),
        (cat_varios, 'Tapizado',                         NULL,                                                                 38, false),
        (cat_varios, 'Llanta de repuesto',               NULL,                                                                 39, false);
END $$;

-- Verificación rápida (ejecutar después del INSERT)
-- SELECT
--     c.nombre AS categoria,
--     COUNT(*) FILTER (WHERE i.es_critico) AS criticos,
--     COUNT(*) AS total
-- FROM items_chequeo i
-- JOIN categorias_chequeo c ON c.id = i.categoria_id
-- GROUP BY c.nombre, c.orden
-- ORDER BY c.orden;


-- ==========================================================================
-- SEED 03_preguntas_aptitud
-- ==========================================================================

-- ==
-- Seed: 5 preguntas de aptitud del conductor
-- ==
-- Orden de ejecución: 03 (independiente de las anteriores)
-- Idempotente: borra las preguntas anteriores y vuelve a insertar
--
-- Fuente: Paso 2 del flujo del conductor
-- ==

DELETE FROM preguntas_aptitud;

INSERT INTO preguntas_aptitud (pregunta, respuesta_apta, orden) VALUES
    ('¿Descansó lo suficiente (mínimo 6–8 horas de sueño)?',                                       'si', 1),
    ('¿Se siente bajo el efecto de algún medicamento que cause somnolencia?',                       'no', 2),
    ('¿Presenta mareo, visión borrosa o dolor de cabeza intenso?',                                  'no', 3),
    ('¿Ha consumido bebidas alcohólicas o sustancias psicoactivas en las últimas 24 horas?',        'no', 4),
    ('¿Se siente emocionalmente apto para conducir hoy?',                                           'si', 5);


-- ==========================================================================
-- SEED 04_regiones
-- ==========================================================================

-- ==
-- Seed: 5 regiones naturales de Colombia en Colombia
-- ==
-- Orden de ejecución: 04 (antes de 05_departamentos)
-- Idempotente: usa ON CONFLICT para no duplicar
--
-- Nota: los nombres llevan el prefijo "Región" tal como están en la BD
-- del proyecto. Si en otra implementación se prefieren sin prefijo,
-- ajustar también el seed 05_departamentos.

INSERT INTO regiones (nombre) VALUES
    ('Región Andina'),
    ('Región Caribe'),
    ('Región Pacífica'),
    ('Región Amazónica'),
    ('Región de la Orinoquía')
ON CONFLICT (nombre) DO NOTHING;


-- ==========================================================================
-- SEED 05_departamentos
-- ==========================================================================

-- ==
-- Seed: 32 departamentos de Colombia + Bogotá D.C. = 33 entidades territoriales
-- ==
-- Orden de ejecución: 05 (después de 04_regiones)
-- Idempotente: usa ON CONFLICT para no duplicar
--
-- Nota sobre Bogotá D.C.: técnicamente es Distrito Capital, no departamento.
-- Se incluye como entidad territorial dentro de la Región Andina por
-- coherencia con la gestión administrativa del pais, que la trata como
-- un nivel equivalente al de departamento para sus sedes.

DO $$
DECLARE
    reg_andina      UUID := (SELECT id FROM regiones WHERE nombre = 'Región Andina');
    reg_caribe      UUID := (SELECT id FROM regiones WHERE nombre = 'Región Caribe');
    reg_pacifica    UUID := (SELECT id FROM regiones WHERE nombre = 'Región Pacífica');
    reg_amazonica   UUID := (SELECT id FROM regiones WHERE nombre = 'Región Amazónica');
    reg_orinoquia   UUID := (SELECT id FROM regiones WHERE nombre = 'Región de la Orinoquía');
BEGIN
    INSERT INTO departamentos (nombre, region_id) VALUES
        -- Región Andina (11 entidades, incluyendo Bogotá D.C.)
        ('Antioquia',                       reg_andina),
        ('Bogotá D.C.',                     reg_andina),
        ('Boyacá',                          reg_andina),
        ('Caldas',                          reg_andina),
        ('Cundinamarca',                    reg_andina),
        ('Huila',                           reg_andina),
        ('Norte de Santander',              reg_andina),
        ('Quindío',                         reg_andina),
        ('Risaralda',                       reg_andina),
        ('Santander',                       reg_andina),
        ('Tolima',                          reg_andina),

        -- Región Caribe (8 departamentos)
        ('Atlántico',                       reg_caribe),
        ('Bolívar',                         reg_caribe),
        ('Cesar',                           reg_caribe),
        ('Córdoba',                         reg_caribe),
        ('La Guajira',                      reg_caribe),
        ('Magdalena',                       reg_caribe),
        ('San Andrés y Providencia',        reg_caribe),
        ('Sucre',                           reg_caribe),

        -- Región Pacífica (4 departamentos)
        ('Cauca',                           reg_pacifica),
        ('Chocó',                           reg_pacifica),
        ('Nariño',                          reg_pacifica),
        ('Valle del Cauca',                 reg_pacifica),

        -- Región Amazónica (6 departamentos)
        ('Amazonas',                        reg_amazonica),
        ('Caquetá',                         reg_amazonica),
        ('Guainía',                         reg_amazonica),
        ('Guaviare',                        reg_amazonica),
        ('Putumayo',                        reg_amazonica),
        ('Vaupés',                          reg_amazonica),

        -- Región de la Orinoquía (4 departamentos)
        ('Arauca',                          reg_orinoquia),
        ('Casanare',                        reg_orinoquia),
        ('Meta',                            reg_orinoquia),
        ('Vichada',                         reg_orinoquia)
    ON CONFLICT (nombre, region_id) DO NOTHING;
END $$;

-- Verificación rápida (ejecutar después del INSERT)
-- SELECT r.nombre AS region, COUNT(d.id) AS total
-- FROM regiones r
-- LEFT JOIN departamentos d ON d.region_id = r.id
-- GROUP BY r.nombre
-- ORDER BY r.nombre;
-- Debería devolver: Andina=11, Caribe=8, Pacífica=4, Amazónica=6, Orinoquía=4 (TOTAL=33)


-- ==========================================================================
-- SEED 06_geografia_capitales
-- ==========================================================================

-- ============================================================================
-- SEED 06 — Ciudades capitales de Colombia + sedes de muestra
-- ============================================================================
-- Contexto (Fase 4, multinivel #102): regiones (5) y departamentos (33) ya
-- estaban sembrados completos, pero ciudades y sedes solo tenian el minimo
-- del MVP (Ibague + 1 sede). Sin mas ciudades/sedes no se pueden asignar
-- administradores de otros niveles ni probar el alcance territorial.
--
-- Este seed agrega:
--   1) Las 33 ciudades capitales (una por departamento) + Espinal (Tolima).
--   2) 5 sedes de ejemplo como muestra para pruebas
--      (editables/desactivables; la gestion completa de geografia por UI es
--      la tarea #116).
--
-- IDEMPOTENTE: se puede ejecutar varias veces sin duplicar filas.
--   - ciudades: usa ON CONFLICT (nombre, departamento_id) DO NOTHING.
--   - sedes: usa WHERE NOT EXISTS (no hay constraint UNIQUE en esa tabla).
-- ============================================================================

-- ============================================
-- 1) CIUDADES CAPITALES (33) + Espinal
-- ============================================
INSERT INTO ciudades (nombre, departamento_id)
SELECT v.ciudad, d.id
FROM (VALUES
    ('Leticia',                 'Amazonas'),
    ('Medellín',                'Antioquia'),
    ('Arauca',                  'Arauca'),
    ('Barranquilla',            'Atlántico'),
    ('Bogotá',                  'Bogotá D.C.'),
    ('Cartagena',               'Bolívar'),
    ('Tunja',                   'Boyacá'),
    ('Manizales',               'Caldas'),
    ('Florencia',               'Caquetá'),
    ('Yopal',                   'Casanare'),
    ('Popayán',                 'Cauca'),
    ('Valledupar',              'Cesar'),
    ('Quibdó',                  'Chocó'),
    ('Montería',                'Córdoba'),
    ('Soacha',                  'Cundinamarca'),
    ('Inírida',                 'Guainía'),
    ('San José del Guaviare',   'Guaviare'),
    ('Neiva',                   'Huila'),
    ('Riohacha',                'La Guajira'),
    ('Santa Marta',             'Magdalena'),
    ('Villavicencio',           'Meta'),
    ('Pasto',                   'Nariño'),
    ('Cúcuta',                  'Norte de Santander'),
    ('Mocoa',                   'Putumayo'),
    ('Armenia',                 'Quindío'),
    ('Pereira',                 'Risaralda'),
    ('San Andrés',              'San Andrés y Providencia'),
    ('Bucaramanga',             'Santander'),
    ('Sincelejo',               'Sucre'),
    ('Ibagué',                  'Tolima'),
    ('Espinal',                 'Tolima'),
    ('Cali',                    'Valle del Cauca'),
    ('Mitú',                    'Vaupés'),
    ('Puerto Carreño',          'Vichada')
) AS v(ciudad, departamento)
JOIN departamentos d ON d.nombre = v.departamento
ON CONFLICT (nombre, departamento_id) DO NOTHING;

-- ============================================
-- 2) SEDES DE MUESTRA (reales, 5)
-- ============================================
-- Patron anti-duplicados: inserta solo si no existe esa sede en esa ciudad.

INSERT INTO sedes (nombre, ciudad_id, direccion)
SELECT 'Sede Bogotá Norte', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Bogotá' AND d.nombre = 'Bogotá D.C.'
  AND NOT EXISTS (
    SELECT 1 FROM sedes cf
    WHERE cf.nombre = 'Sede Bogotá Norte' AND cf.ciudad_id = c.id
  );

INSERT INTO sedes (nombre, ciudad_id, direccion)
SELECT 'Sede Medellín Centro', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Medellín' AND d.nombre = 'Antioquia'
  AND NOT EXISTS (
    SELECT 1 FROM sedes cf
    WHERE cf.nombre = 'Sede Medellín Centro' AND cf.ciudad_id = c.id
  );

INSERT INTO sedes (nombre, ciudad_id, direccion)
SELECT 'Sede Cali Sur', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Cali' AND d.nombre = 'Valle del Cauca'
  AND NOT EXISTS (
    SELECT 1 FROM sedes cf
    WHERE cf.nombre = 'Sede Cali Sur' AND cf.ciudad_id = c.id
  );

INSERT INTO sedes (nombre, ciudad_id, direccion)
SELECT 'Sede Neiva', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Neiva' AND d.nombre = 'Huila'
  AND NOT EXISTS (
    SELECT 1 FROM sedes cf
    WHERE cf.nombre = 'Sede Neiva' AND cf.ciudad_id = c.id
  );

INSERT INTO sedes (nombre, ciudad_id, direccion)
SELECT 'Sede Espinal', c.id, NULL
FROM ciudades c JOIN departamentos d ON d.id = c.departamento_id
WHERE c.nombre = 'Espinal' AND d.nombre = 'Tolima'
  AND NOT EXISTS (
    SELECT 1 FROM sedes cf
    WHERE cf.nombre = 'Sede Espinal' AND cf.ciudad_id = c.id
  );

-- ============================================
-- 3) VERIFICACION (debe dar: 34 ciudades, 6 sedes)
-- ============================================
SELECT
    (SELECT COUNT(*) FROM ciudades)           AS ciudades,
    (SELECT COUNT(*) FROM sedes)  AS sedes;


-- ==========================================================================
-- SEED 07_municipios
-- ==========================================================================
-- Los 1.122 municipios y areas no municipalizadas de Colombia (DIVIPOLA del
-- DANE). Completa las capitales del seed 06; no duplica lo que ya existe.

INSERT INTO ciudades (nombre, departamento_id)
SELECT v.nombre, d.id
FROM (VALUES
    ('Amazonas', 'El Encanto'),
    ('Amazonas', 'La Chorrera'),
    ('Amazonas', 'La Pedrera'),
    ('Amazonas', 'La Victoria'),
    ('Amazonas', 'Mirití - Paraná'),
    ('Amazonas', 'Puerto Alegría'),
    ('Amazonas', 'Puerto Arica'),
    ('Amazonas', 'Puerto Nariño'),
    ('Amazonas', 'Puerto Santander'),
    ('Amazonas', 'Tarapacá'),
    ('Antioquia', 'Abejorral'),
    ('Antioquia', 'Abriaquí'),
    ('Antioquia', 'Alejandría'),
    ('Antioquia', 'Amagá'),
    ('Antioquia', 'Amalfi'),
    ('Antioquia', 'Andes'),
    ('Antioquia', 'Angelópolis'),
    ('Antioquia', 'Angostura'),
    ('Antioquia', 'Anorí'),
    ('Antioquia', 'Anzá'),
    ('Antioquia', 'Apartadó'),
    ('Antioquia', 'Arboletes'),
    ('Antioquia', 'Argelia'),
    ('Antioquia', 'Armenia'),
    ('Antioquia', 'Barbosa'),
    ('Antioquia', 'Bello'),
    ('Antioquia', 'Belmira'),
    ('Antioquia', 'Betania'),
    ('Antioquia', 'Betulia'),
    ('Antioquia', 'Briceño'),
    ('Antioquia', 'Buriticá'),
    ('Antioquia', 'Cáceres'),
    ('Antioquia', 'Caicedo'),
    ('Antioquia', 'Caldas'),
    ('Antioquia', 'Campamento'),
    ('Antioquia', 'Cañasgordas'),
    ('Antioquia', 'Caracolí'),
    ('Antioquia', 'Caramanta'),
    ('Antioquia', 'Carepa'),
    ('Antioquia', 'Carolina'),
    ('Antioquia', 'Caucasia'),
    ('Antioquia', 'Chigorodó'),
    ('Antioquia', 'Cisneros'),
    ('Antioquia', 'Ciudad Bolívar'),
    ('Antioquia', 'Cocorná'),
    ('Antioquia', 'Concepción'),
    ('Antioquia', 'Concordia'),
    ('Antioquia', 'Copacabana'),
    ('Antioquia', 'Dabeiba'),
    ('Antioquia', 'Donmatías'),
    ('Antioquia', 'Ebéjico'),
    ('Antioquia', 'El Bagre'),
    ('Antioquia', 'El Carmen de Viboral'),
    ('Antioquia', 'El Santuario'),
    ('Antioquia', 'Entrerríos'),
    ('Antioquia', 'Envigado'),
    ('Antioquia', 'Fredonia'),
    ('Antioquia', 'Frontino'),
    ('Antioquia', 'Giraldo'),
    ('Antioquia', 'Girardota'),
    ('Antioquia', 'Gómez Plata'),
    ('Antioquia', 'Granada'),
    ('Antioquia', 'Guadalupe'),
    ('Antioquia', 'Guarne'),
    ('Antioquia', 'Guatapé'),
    ('Antioquia', 'Heliconia'),
    ('Antioquia', 'Hispania'),
    ('Antioquia', 'Itagüí'),
    ('Antioquia', 'Ituango'),
    ('Antioquia', 'Jardín'),
    ('Antioquia', 'Jericó'),
    ('Antioquia', 'La Ceja'),
    ('Antioquia', 'La Estrella'),
    ('Antioquia', 'La Pintada'),
    ('Antioquia', 'La Unión'),
    ('Antioquia', 'Liborina'),
    ('Antioquia', 'Maceo'),
    ('Antioquia', 'Marinilla'),
    ('Antioquia', 'Montebello'),
    ('Antioquia', 'Murindó'),
    ('Antioquia', 'Mutatá'),
    ('Antioquia', 'Nariño'),
    ('Antioquia', 'Nechí'),
    ('Antioquia', 'Necoclí'),
    ('Antioquia', 'Olaya'),
    ('Antioquia', 'Peñol'),
    ('Antioquia', 'Peque'),
    ('Antioquia', 'Pueblorrico'),
    ('Antioquia', 'Puerto Berrío'),
    ('Antioquia', 'Puerto Nare'),
    ('Antioquia', 'Puerto Triunfo'),
    ('Antioquia', 'Remedios'),
    ('Antioquia', 'Retiro'),
    ('Antioquia', 'Rionegro'),
    ('Antioquia', 'Sabanalarga'),
    ('Antioquia', 'Sabaneta'),
    ('Antioquia', 'Salgar'),
    ('Antioquia', 'San Andrés de Cuerquía'),
    ('Antioquia', 'San Carlos'),
    ('Antioquia', 'San Francisco'),
    ('Antioquia', 'San Jerónimo'),
    ('Antioquia', 'San José de la Montaña'),
    ('Antioquia', 'San Juan de Urabá'),
    ('Antioquia', 'San Luis'),
    ('Antioquia', 'San Pedro de los Milagros'),
    ('Antioquia', 'San Pedro de Urabá'),
    ('Antioquia', 'San Rafael'),
    ('Antioquia', 'San Roque'),
    ('Antioquia', 'San Vicente Ferrer'),
    ('Antioquia', 'Santa Bárbara'),
    ('Antioquia', 'Santa Fé de Antioquia'),
    ('Antioquia', 'Santa Rosa de Osos'),
    ('Antioquia', 'Santo Domingo'),
    ('Antioquia', 'Segovia'),
    ('Antioquia', 'Sonsón'),
    ('Antioquia', 'Sopetrán'),
    ('Antioquia', 'Támesis'),
    ('Antioquia', 'Tarazá'),
    ('Antioquia', 'Tarso'),
    ('Antioquia', 'Titiribí'),
    ('Antioquia', 'Toledo'),
    ('Antioquia', 'Turbo'),
    ('Antioquia', 'Uramita'),
    ('Antioquia', 'Urrao'),
    ('Antioquia', 'Valdivia'),
    ('Antioquia', 'Valparaíso'),
    ('Antioquia', 'Vegachí'),
    ('Antioquia', 'Venecia'),
    ('Antioquia', 'Vigía del Fuerte'),
    ('Antioquia', 'Yalí'),
    ('Antioquia', 'Yarumal'),
    ('Antioquia', 'Yolombó'),
    ('Antioquia', 'Yondó'),
    ('Antioquia', 'Zaragoza'),
    ('Arauca', 'Arauquita'),
    ('Arauca', 'Cravo Norte'),
    ('Arauca', 'Fortul'),
    ('Arauca', 'Puerto Rondón'),
    ('Arauca', 'Saravena'),
    ('Arauca', 'Tame'),
    ('Atlántico', 'Baranoa'),
    ('Atlántico', 'Campo de la Cruz'),
    ('Atlántico', 'Candelaria'),
    ('Atlántico', 'Galapa'),
    ('Atlántico', 'Juan de Acosta'),
    ('Atlántico', 'Luruaco'),
    ('Atlántico', 'Malambo'),
    ('Atlántico', 'Manatí'),
    ('Atlántico', 'Palmar de Varela'),
    ('Atlántico', 'Piojó'),
    ('Atlántico', 'Polonuevo'),
    ('Atlántico', 'Ponedera'),
    ('Atlántico', 'Puerto Colombia'),
    ('Atlántico', 'Repelón'),
    ('Atlántico', 'Sabanagrande'),
    ('Atlántico', 'Sabanalarga'),
    ('Atlántico', 'Santa Lucía'),
    ('Atlántico', 'Santo Tomás'),
    ('Atlántico', 'Soledad'),
    ('Atlántico', 'Suan'),
    ('Atlántico', 'Tubará'),
    ('Atlántico', 'Usiacurí'),
    ('Bolívar', 'Achí'),
    ('Bolívar', 'Altos del Rosario'),
    ('Bolívar', 'Arenal'),
    ('Bolívar', 'Arjona'),
    ('Bolívar', 'Arroyohondo'),
    ('Bolívar', 'Barranco de Loba'),
    ('Bolívar', 'Calamar'),
    ('Bolívar', 'Cantagallo'),
    ('Bolívar', 'Cicuco'),
    ('Bolívar', 'Clemencia'),
    ('Bolívar', 'Córdoba'),
    ('Bolívar', 'El Carmen de Bolívar'),
    ('Bolívar', 'El Guamo'),
    ('Bolívar', 'El Peñón'),
    ('Bolívar', 'Hatillo de Loba'),
    ('Bolívar', 'Magangué'),
    ('Bolívar', 'Mahates'),
    ('Bolívar', 'Margarita'),
    ('Bolívar', 'María la Baja'),
    ('Bolívar', 'Mompox'),
    ('Bolívar', 'Montecristo'),
    ('Bolívar', 'Morales'),
    ('Bolívar', 'Norosí'),
    ('Bolívar', 'Pinillos'),
    ('Bolívar', 'Regidor'),
    ('Bolívar', 'Río Viejo'),
    ('Bolívar', 'San Cristóbal'),
    ('Bolívar', 'San Estanislao'),
    ('Bolívar', 'San Fernando'),
    ('Bolívar', 'San Jacinto'),
    ('Bolívar', 'San Jacinto del Cauca'),
    ('Bolívar', 'San Juan Nepomuceno'),
    ('Bolívar', 'San Martín de Loba'),
    ('Bolívar', 'San Pablo'),
    ('Bolívar', 'Santa Catalina'),
    ('Bolívar', 'Santa Rosa'),
    ('Bolívar', 'Santa Rosa del Sur'),
    ('Bolívar', 'Simití'),
    ('Bolívar', 'Soplaviento'),
    ('Bolívar', 'Talaigua Nuevo'),
    ('Bolívar', 'Tiquisio'),
    ('Bolívar', 'Turbaco'),
    ('Bolívar', 'Turbaná'),
    ('Bolívar', 'Villanueva'),
    ('Bolívar', 'Zambrano'),
    ('Boyacá', 'Almeida'),
    ('Boyacá', 'Aquitania'),
    ('Boyacá', 'Arcabuco'),
    ('Boyacá', 'Belén'),
    ('Boyacá', 'Berbeo'),
    ('Boyacá', 'Betéitiva'),
    ('Boyacá', 'Boavita'),
    ('Boyacá', 'Boyacá'),
    ('Boyacá', 'Briceño'),
    ('Boyacá', 'Buenavista'),
    ('Boyacá', 'Busbanzá'),
    ('Boyacá', 'Caldas'),
    ('Boyacá', 'Campohermoso'),
    ('Boyacá', 'Cerinza'),
    ('Boyacá', 'Chinavita'),
    ('Boyacá', 'Chiquinquirá'),
    ('Boyacá', 'Chíquiza'),
    ('Boyacá', 'Chiscas'),
    ('Boyacá', 'Chita'),
    ('Boyacá', 'Chitaraque'),
    ('Boyacá', 'Chivatá'),
    ('Boyacá', 'Chivor'),
    ('Boyacá', 'Ciénega'),
    ('Boyacá', 'Cómbita'),
    ('Boyacá', 'Coper'),
    ('Boyacá', 'Corrales'),
    ('Boyacá', 'Covarachía'),
    ('Boyacá', 'Cubará'),
    ('Boyacá', 'Cucaita'),
    ('Boyacá', 'Cuítiva'),
    ('Boyacá', 'Duitama'),
    ('Boyacá', 'El Cocuy'),
    ('Boyacá', 'El Espino'),
    ('Boyacá', 'Firavitoba'),
    ('Boyacá', 'Floresta'),
    ('Boyacá', 'Gachantivá'),
    ('Boyacá', 'Gámeza'),
    ('Boyacá', 'Garagoa'),
    ('Boyacá', 'Guacamayas'),
    ('Boyacá', 'Guateque'),
    ('Boyacá', 'Guayatá'),
    ('Boyacá', 'Güicán de la Sierra'),
    ('Boyacá', 'Iza'),
    ('Boyacá', 'Jenesano'),
    ('Boyacá', 'Jericó'),
    ('Boyacá', 'La Capilla'),
    ('Boyacá', 'La Uvita'),
    ('Boyacá', 'La Victoria'),
    ('Boyacá', 'Labranzagrande'),
    ('Boyacá', 'Macanal'),
    ('Boyacá', 'Maripí'),
    ('Boyacá', 'Miraflores'),
    ('Boyacá', 'Mongua'),
    ('Boyacá', 'Monguí'),
    ('Boyacá', 'Moniquirá'),
    ('Boyacá', 'Motavita'),
    ('Boyacá', 'Muzo'),
    ('Boyacá', 'Nobsa'),
    ('Boyacá', 'Nuevo Colón'),
    ('Boyacá', 'Oicatá'),
    ('Boyacá', 'Otanche'),
    ('Boyacá', 'Pachavita'),
    ('Boyacá', 'Páez'),
    ('Boyacá', 'Paipa'),
    ('Boyacá', 'Pajarito'),
    ('Boyacá', 'Panqueba'),
    ('Boyacá', 'Pauna'),
    ('Boyacá', 'Paya'),
    ('Boyacá', 'Paz de Río'),
    ('Boyacá', 'Pesca'),
    ('Boyacá', 'Pisba'),
    ('Boyacá', 'Puerto Boyacá'),
    ('Boyacá', 'Quípama'),
    ('Boyacá', 'Ramiriquí'),
    ('Boyacá', 'Ráquira'),
    ('Boyacá', 'Rondón'),
    ('Boyacá', 'Saboyá'),
    ('Boyacá', 'Sáchica'),
    ('Boyacá', 'Samacá'),
    ('Boyacá', 'San Eduardo'),
    ('Boyacá', 'San José de Pare'),
    ('Boyacá', 'San Luis de Gaceno'),
    ('Boyacá', 'San Mateo'),
    ('Boyacá', 'San Miguel de Sema'),
    ('Boyacá', 'San Pablo de Borbur'),
    ('Boyacá', 'Santa María'),
    ('Boyacá', 'Santa Rosa de Viterbo'),
    ('Boyacá', 'Santa Sofía'),
    ('Boyacá', 'Santana'),
    ('Boyacá', 'Sativanorte'),
    ('Boyacá', 'Sativasur'),
    ('Boyacá', 'Siachoque'),
    ('Boyacá', 'Soatá'),
    ('Boyacá', 'Socha'),
    ('Boyacá', 'Socotá'),
    ('Boyacá', 'Sogamoso'),
    ('Boyacá', 'Somondoco'),
    ('Boyacá', 'Sora'),
    ('Boyacá', 'Soracá'),
    ('Boyacá', 'Sotaquirá'),
    ('Boyacá', 'Susacón'),
    ('Boyacá', 'Sutamarchán'),
    ('Boyacá', 'Sutatenza'),
    ('Boyacá', 'Tasco'),
    ('Boyacá', 'Tenza'),
    ('Boyacá', 'Tibaná'),
    ('Boyacá', 'Tibasosa'),
    ('Boyacá', 'Tinjacá'),
    ('Boyacá', 'Tipacoque'),
    ('Boyacá', 'Toca'),
    ('Boyacá', 'Togüí'),
    ('Boyacá', 'Tópaga'),
    ('Boyacá', 'Tota'),
    ('Boyacá', 'Tununguá'),
    ('Boyacá', 'Turmequé'),
    ('Boyacá', 'Tuta'),
    ('Boyacá', 'Tutazá'),
    ('Boyacá', 'Úmbita'),
    ('Boyacá', 'Ventaquemada'),
    ('Boyacá', 'Villa de Leyva'),
    ('Boyacá', 'Viracachá'),
    ('Boyacá', 'Zetaquira'),
    ('Caldas', 'Aguadas'),
    ('Caldas', 'Anserma'),
    ('Caldas', 'Aranzazu'),
    ('Caldas', 'Belalcázar'),
    ('Caldas', 'Chinchiná'),
    ('Caldas', 'Filadelfia'),
    ('Caldas', 'La Dorada'),
    ('Caldas', 'La Merced'),
    ('Caldas', 'Manzanares'),
    ('Caldas', 'Marmato'),
    ('Caldas', 'Marquetalia'),
    ('Caldas', 'Marulanda'),
    ('Caldas', 'Neira'),
    ('Caldas', 'Norcasia'),
    ('Caldas', 'Pácora'),
    ('Caldas', 'Palestina'),
    ('Caldas', 'Pensilvania'),
    ('Caldas', 'Riosucio'),
    ('Caldas', 'Risaralda'),
    ('Caldas', 'Salamina'),
    ('Caldas', 'Samaná'),
    ('Caldas', 'San José'),
    ('Caldas', 'Supía'),
    ('Caldas', 'Victoria'),
    ('Caldas', 'Villamaría'),
    ('Caldas', 'Viterbo'),
    ('Caquetá', 'Albania'),
    ('Caquetá', 'Belén de los Andaquíes'),
    ('Caquetá', 'Cartagena del Chairá'),
    ('Caquetá', 'Curillo'),
    ('Caquetá', 'El Doncello'),
    ('Caquetá', 'El Paujíl'),
    ('Caquetá', 'La Montañita'),
    ('Caquetá', 'Milán'),
    ('Caquetá', 'Morelia'),
    ('Caquetá', 'Puerto Rico'),
    ('Caquetá', 'San José del Fragua'),
    ('Caquetá', 'San Vicente del Caguán'),
    ('Caquetá', 'Solano'),
    ('Caquetá', 'Solita'),
    ('Caquetá', 'Valparaíso'),
    ('Casanare', 'Aguazul'),
    ('Casanare', 'Chámeza'),
    ('Casanare', 'Hato Corozal'),
    ('Casanare', 'La Salina'),
    ('Casanare', 'Maní'),
    ('Casanare', 'Monterrey'),
    ('Casanare', 'Nunchía'),
    ('Casanare', 'Orocué'),
    ('Casanare', 'Paz de Ariporo'),
    ('Casanare', 'Pore'),
    ('Casanare', 'Recetor'),
    ('Casanare', 'Sabanalarga'),
    ('Casanare', 'Sácama'),
    ('Casanare', 'San Luis de Palenque'),
    ('Casanare', 'Támara'),
    ('Casanare', 'Tauramena'),
    ('Casanare', 'Trinidad'),
    ('Casanare', 'Villanueva'),
    ('Cauca', 'Almaguer'),
    ('Cauca', 'Argelia'),
    ('Cauca', 'Balboa'),
    ('Cauca', 'Bolívar'),
    ('Cauca', 'Buenos Aires'),
    ('Cauca', 'Cajibío'),
    ('Cauca', 'Caldono'),
    ('Cauca', 'Caloto'),
    ('Cauca', 'Corinto'),
    ('Cauca', 'El Tambo'),
    ('Cauca', 'Florencia'),
    ('Cauca', 'Guachené'),
    ('Cauca', 'Guapi'),
    ('Cauca', 'Inzá'),
    ('Cauca', 'Jambaló'),
    ('Cauca', 'La Sierra'),
    ('Cauca', 'La Vega'),
    ('Cauca', 'López de Micay'),
    ('Cauca', 'Mercaderes'),
    ('Cauca', 'Miranda'),
    ('Cauca', 'Morales'),
    ('Cauca', 'Padilla'),
    ('Cauca', 'Páez'),
    ('Cauca', 'Patía'),
    ('Cauca', 'Piamonte'),
    ('Cauca', 'Piendamó - Tunía'),
    ('Cauca', 'Puerto Tejada'),
    ('Cauca', 'Puracé'),
    ('Cauca', 'Rosas'),
    ('Cauca', 'San Sebastián'),
    ('Cauca', 'Santa Rosa'),
    ('Cauca', 'Santander de Quilichao'),
    ('Cauca', 'Silvia'),
    ('Cauca', 'Sotará - Paispamba'),
    ('Cauca', 'Suárez'),
    ('Cauca', 'Sucre'),
    ('Cauca', 'Timbío'),
    ('Cauca', 'Timbiquí'),
    ('Cauca', 'Toribío'),
    ('Cauca', 'Totoró'),
    ('Cauca', 'Villa Rica'),
    ('Cesar', 'Aguachica'),
    ('Cesar', 'Agustín Codazzi'),
    ('Cesar', 'Astrea'),
    ('Cesar', 'Becerril'),
    ('Cesar', 'Bosconia'),
    ('Cesar', 'Chimichagua'),
    ('Cesar', 'Chiriguaná'),
    ('Cesar', 'Curumaní'),
    ('Cesar', 'El Copey'),
    ('Cesar', 'El Paso'),
    ('Cesar', 'Gamarra'),
    ('Cesar', 'González'),
    ('Cesar', 'La Gloria'),
    ('Cesar', 'La Jagua de Ibirico'),
    ('Cesar', 'La Paz'),
    ('Cesar', 'Manaure Balcón del Cesar'),
    ('Cesar', 'Pailitas'),
    ('Cesar', 'Pelaya'),
    ('Cesar', 'Pueblo Bello'),
    ('Cesar', 'Río de Oro'),
    ('Cesar', 'San Alberto'),
    ('Cesar', 'San Diego'),
    ('Cesar', 'San Martín'),
    ('Cesar', 'Tamalameque'),
    ('Chocó', 'Acandí'),
    ('Chocó', 'Alto Baudó'),
    ('Chocó', 'Atrato'),
    ('Chocó', 'Bagadó'),
    ('Chocó', 'Bahía Solano'),
    ('Chocó', 'Bajo Baudó'),
    ('Chocó', 'Bojayá'),
    ('Chocó', 'Carmen del Darién'),
    ('Chocó', 'Cértegui'),
    ('Chocó', 'Condoto'),
    ('Chocó', 'El Cantón del San Pablo'),
    ('Chocó', 'El Carmen de Atrato'),
    ('Chocó', 'El Litoral del San Juan'),
    ('Chocó', 'Istmina'),
    ('Chocó', 'Juradó'),
    ('Chocó', 'Lloró'),
    ('Chocó', 'Medio Atrato'),
    ('Chocó', 'Medio Baudó'),
    ('Chocó', 'Medio San Juan'),
    ('Chocó', 'Nóvita'),
    ('Chocó', 'Nuevo Belén de Bajirá'),
    ('Chocó', 'Nuquí'),
    ('Chocó', 'Río Iró'),
    ('Chocó', 'Río Quito'),
    ('Chocó', 'Riosucio'),
    ('Chocó', 'San José del Palmar'),
    ('Chocó', 'Sipí'),
    ('Chocó', 'Tadó'),
    ('Chocó', 'Unguía'),
    ('Chocó', 'Unión Panamericana'),
    ('Córdoba', 'Ayapel'),
    ('Córdoba', 'Buenavista'),
    ('Córdoba', 'Canalete'),
    ('Córdoba', 'Cereté'),
    ('Córdoba', 'Chimá'),
    ('Córdoba', 'Chinú'),
    ('Córdoba', 'Ciénaga de Oro'),
    ('Córdoba', 'Cotorra'),
    ('Córdoba', 'La Apartada'),
    ('Córdoba', 'Lorica'),
    ('Córdoba', 'Los Córdobas'),
    ('Córdoba', 'Momil'),
    ('Córdoba', 'Montelíbano'),
    ('Córdoba', 'Moñitos'),
    ('Córdoba', 'Planeta Rica'),
    ('Córdoba', 'Pueblo Nuevo'),
    ('Córdoba', 'Puerto Escondido'),
    ('Córdoba', 'Puerto Libertador'),
    ('Córdoba', 'Purísima de la Concepción'),
    ('Córdoba', 'Sahagún'),
    ('Córdoba', 'San Andrés de Sotavento'),
    ('Córdoba', 'San Antero'),
    ('Córdoba', 'San Bernardo del Viento'),
    ('Córdoba', 'San Carlos'),
    ('Córdoba', 'San José de Uré'),
    ('Córdoba', 'San Pelayo'),
    ('Córdoba', 'Tierralta'),
    ('Córdoba', 'Tuchín'),
    ('Córdoba', 'Valencia'),
    ('Cundinamarca', 'Agua de Dios'),
    ('Cundinamarca', 'Albán'),
    ('Cundinamarca', 'Anapoima'),
    ('Cundinamarca', 'Anolaima'),
    ('Cundinamarca', 'Apulo'),
    ('Cundinamarca', 'Arbeláez'),
    ('Cundinamarca', 'Beltrán'),
    ('Cundinamarca', 'Bituima'),
    ('Cundinamarca', 'Bojacá'),
    ('Cundinamarca', 'Cabrera'),
    ('Cundinamarca', 'Cachipay'),
    ('Cundinamarca', 'Cajicá'),
    ('Cundinamarca', 'Caparrapí'),
    ('Cundinamarca', 'Cáqueza'),
    ('Cundinamarca', 'Carmen de Carupa'),
    ('Cundinamarca', 'Chaguaní'),
    ('Cundinamarca', 'Chía'),
    ('Cundinamarca', 'Chipaque'),
    ('Cundinamarca', 'Choachí'),
    ('Cundinamarca', 'Chocontá'),
    ('Cundinamarca', 'Cogua'),
    ('Cundinamarca', 'Cota'),
    ('Cundinamarca', 'Cucunubá'),
    ('Cundinamarca', 'El Colegio'),
    ('Cundinamarca', 'El Peñón'),
    ('Cundinamarca', 'El Rosal'),
    ('Cundinamarca', 'Facatativá'),
    ('Cundinamarca', 'Fómeque'),
    ('Cundinamarca', 'Fosca'),
    ('Cundinamarca', 'Funza'),
    ('Cundinamarca', 'Fúquene'),
    ('Cundinamarca', 'Fusagasugá'),
    ('Cundinamarca', 'Gachalá'),
    ('Cundinamarca', 'Gachancipá'),
    ('Cundinamarca', 'Gachetá'),
    ('Cundinamarca', 'Gama'),
    ('Cundinamarca', 'Girardot'),
    ('Cundinamarca', 'Granada'),
    ('Cundinamarca', 'Guachetá'),
    ('Cundinamarca', 'Guaduas'),
    ('Cundinamarca', 'Guasca'),
    ('Cundinamarca', 'Guataquí'),
    ('Cundinamarca', 'Guatavita'),
    ('Cundinamarca', 'Guayabal de Síquima'),
    ('Cundinamarca', 'Guayabetal'),
    ('Cundinamarca', 'Gutiérrez'),
    ('Cundinamarca', 'Jerusalén'),
    ('Cundinamarca', 'Junín'),
    ('Cundinamarca', 'La Calera'),
    ('Cundinamarca', 'La Mesa'),
    ('Cundinamarca', 'La Palma'),
    ('Cundinamarca', 'La Peña'),
    ('Cundinamarca', 'La Vega'),
    ('Cundinamarca', 'Lenguazaque'),
    ('Cundinamarca', 'Machetá'),
    ('Cundinamarca', 'Madrid'),
    ('Cundinamarca', 'Manta'),
    ('Cundinamarca', 'Medina'),
    ('Cundinamarca', 'Mosquera'),
    ('Cundinamarca', 'Nariño'),
    ('Cundinamarca', 'Nemocón'),
    ('Cundinamarca', 'Nilo'),
    ('Cundinamarca', 'Nimaima'),
    ('Cundinamarca', 'Nocaima'),
    ('Cundinamarca', 'Pacho'),
    ('Cundinamarca', 'Paime'),
    ('Cundinamarca', 'Pandi'),
    ('Cundinamarca', 'Paratebueno'),
    ('Cundinamarca', 'Pasca'),
    ('Cundinamarca', 'Puerto Salgar'),
    ('Cundinamarca', 'Pulí'),
    ('Cundinamarca', 'Quebradanegra'),
    ('Cundinamarca', 'Quetame'),
    ('Cundinamarca', 'Quipile'),
    ('Cundinamarca', 'Ricaurte'),
    ('Cundinamarca', 'San Antonio del Tequendama'),
    ('Cundinamarca', 'San Bernardo'),
    ('Cundinamarca', 'San Cayetano'),
    ('Cundinamarca', 'San Francisco'),
    ('Cundinamarca', 'San Juan de Rioseco'),
    ('Cundinamarca', 'Sasaima'),
    ('Cundinamarca', 'Sesquilé'),
    ('Cundinamarca', 'Sibaté'),
    ('Cundinamarca', 'Silvania'),
    ('Cundinamarca', 'Simijaca'),
    ('Cundinamarca', 'Sopó'),
    ('Cundinamarca', 'Subachoque'),
    ('Cundinamarca', 'Suesca'),
    ('Cundinamarca', 'Supatá'),
    ('Cundinamarca', 'Susa'),
    ('Cundinamarca', 'Sutatausa'),
    ('Cundinamarca', 'Tabio'),
    ('Cundinamarca', 'Tausa'),
    ('Cundinamarca', 'Tena'),
    ('Cundinamarca', 'Tenjo'),
    ('Cundinamarca', 'Tibacuy'),
    ('Cundinamarca', 'Tibirita'),
    ('Cundinamarca', 'Tocaima'),
    ('Cundinamarca', 'Tocancipá'),
    ('Cundinamarca', 'Topaipí'),
    ('Cundinamarca', 'Ubalá'),
    ('Cundinamarca', 'Ubaque'),
    ('Cundinamarca', 'Ubaté'),
    ('Cundinamarca', 'Une'),
    ('Cundinamarca', 'Útica'),
    ('Cundinamarca', 'Venecia'),
    ('Cundinamarca', 'Vergara'),
    ('Cundinamarca', 'Vianí'),
    ('Cundinamarca', 'Villagómez'),
    ('Cundinamarca', 'Villapinzón'),
    ('Cundinamarca', 'Villeta'),
    ('Cundinamarca', 'Viotá'),
    ('Cundinamarca', 'Yacopí'),
    ('Cundinamarca', 'Zipacón'),
    ('Cundinamarca', 'Zipaquirá'),
    ('Guainía', 'Barrancominas'),
    ('Guainía', 'Cacahual'),
    ('Guainía', 'La Guadalupe'),
    ('Guainía', 'Morichal'),
    ('Guainía', 'Pana Pana'),
    ('Guainía', 'Puerto Colombia'),
    ('Guainía', 'San Felipe'),
    ('Guaviare', 'Calamar'),
    ('Guaviare', 'El Retorno'),
    ('Guaviare', 'Miraflores'),
    ('Huila', 'Acevedo'),
    ('Huila', 'Agrado'),
    ('Huila', 'Aipe'),
    ('Huila', 'Algeciras'),
    ('Huila', 'Altamira'),
    ('Huila', 'Baraya'),
    ('Huila', 'Campoalegre'),
    ('Huila', 'Colombia'),
    ('Huila', 'Elías'),
    ('Huila', 'Garzón'),
    ('Huila', 'Gigante'),
    ('Huila', 'Guadalupe'),
    ('Huila', 'Hobo'),
    ('Huila', 'Íquira'),
    ('Huila', 'Isnos'),
    ('Huila', 'La Argentina'),
    ('Huila', 'La Plata'),
    ('Huila', 'Nátaga'),
    ('Huila', 'Oporapa'),
    ('Huila', 'Paicol'),
    ('Huila', 'Palermo'),
    ('Huila', 'Palestina'),
    ('Huila', 'Pital'),
    ('Huila', 'Pitalito'),
    ('Huila', 'Rivera'),
    ('Huila', 'Saladoblanco'),
    ('Huila', 'San Agustín'),
    ('Huila', 'Santa María'),
    ('Huila', 'Suaza'),
    ('Huila', 'Tarqui'),
    ('Huila', 'Tello'),
    ('Huila', 'Teruel'),
    ('Huila', 'Tesalia'),
    ('Huila', 'Timaná'),
    ('Huila', 'Villavieja'),
    ('Huila', 'Yaguará'),
    ('La Guajira', 'Albania'),
    ('La Guajira', 'Barrancas'),
    ('La Guajira', 'Dibulla'),
    ('La Guajira', 'Distracción'),
    ('La Guajira', 'El Molino'),
    ('La Guajira', 'Fonseca'),
    ('La Guajira', 'Hatonuevo'),
    ('La Guajira', 'La Jagua del Pilar'),
    ('La Guajira', 'Maicao'),
    ('La Guajira', 'Manaure'),
    ('La Guajira', 'San Juan del Cesar'),
    ('La Guajira', 'Uribia'),
    ('La Guajira', 'Urumita'),
    ('La Guajira', 'Villanueva'),
    ('Magdalena', 'Algarrobo'),
    ('Magdalena', 'Aracataca'),
    ('Magdalena', 'Ariguaní'),
    ('Magdalena', 'Cerro de San Antonio'),
    ('Magdalena', 'Chivolo'),
    ('Magdalena', 'Ciénaga'),
    ('Magdalena', 'Concordia'),
    ('Magdalena', 'El Banco'),
    ('Magdalena', 'El Piñón'),
    ('Magdalena', 'El Retén'),
    ('Magdalena', 'Fundación'),
    ('Magdalena', 'Guamal'),
    ('Magdalena', 'Nueva Granada'),
    ('Magdalena', 'Pedraza'),
    ('Magdalena', 'Pijiño del Carmen'),
    ('Magdalena', 'Pivijay'),
    ('Magdalena', 'Plato'),
    ('Magdalena', 'Puebloviejo'),
    ('Magdalena', 'Remolino'),
    ('Magdalena', 'Sabanas de San Ángel'),
    ('Magdalena', 'Salamina'),
    ('Magdalena', 'San Sebastián de Buenavista'),
    ('Magdalena', 'San Zenón'),
    ('Magdalena', 'Santa Ana'),
    ('Magdalena', 'Santa Bárbara de Pinto'),
    ('Magdalena', 'Sitionuevo'),
    ('Magdalena', 'Tenerife'),
    ('Magdalena', 'Zapayán'),
    ('Magdalena', 'Zona Bananera'),
    ('Meta', 'Acacías'),
    ('Meta', 'Barranca de Upía'),
    ('Meta', 'Cabuyaro'),
    ('Meta', 'Castilla la Nueva'),
    ('Meta', 'Cubarral'),
    ('Meta', 'Cumaral'),
    ('Meta', 'El Calvario'),
    ('Meta', 'El Castillo'),
    ('Meta', 'El Dorado'),
    ('Meta', 'Fuente de Oro'),
    ('Meta', 'Granada'),
    ('Meta', 'Guamal'),
    ('Meta', 'La Macarena'),
    ('Meta', 'Lejanías'),
    ('Meta', 'Mapiripán'),
    ('Meta', 'Mesetas'),
    ('Meta', 'Puerto Concordia'),
    ('Meta', 'Puerto Gaitán'),
    ('Meta', 'Puerto Lleras'),
    ('Meta', 'Puerto López'),
    ('Meta', 'Puerto Rico'),
    ('Meta', 'Restrepo'),
    ('Meta', 'San Carlos de Guaroa'),
    ('Meta', 'San Juan de Arama'),
    ('Meta', 'San Juanito'),
    ('Meta', 'San Martín'),
    ('Meta', 'Uribe'),
    ('Meta', 'Vistahermosa'),
    ('Nariño', 'Albán'),
    ('Nariño', 'Aldana'),
    ('Nariño', 'Ancuya'),
    ('Nariño', 'Arboleda'),
    ('Nariño', 'Barbacoas'),
    ('Nariño', 'Belén'),
    ('Nariño', 'Buesaco'),
    ('Nariño', 'Chachagüí'),
    ('Nariño', 'Colón'),
    ('Nariño', 'Consacá'),
    ('Nariño', 'Contadero'),
    ('Nariño', 'Córdoba'),
    ('Nariño', 'Cuaspud Carlosama'),
    ('Nariño', 'Cumbal'),
    ('Nariño', 'Cumbitara'),
    ('Nariño', 'El Charco'),
    ('Nariño', 'El Peñol'),
    ('Nariño', 'El Rosario'),
    ('Nariño', 'El Tablón de Gómez'),
    ('Nariño', 'El Tambo'),
    ('Nariño', 'Francisco Pizarro'),
    ('Nariño', 'Funes'),
    ('Nariño', 'Guachucal'),
    ('Nariño', 'Guaitarilla'),
    ('Nariño', 'Gualmatán'),
    ('Nariño', 'Iles'),
    ('Nariño', 'Imués'),
    ('Nariño', 'Ipiales'),
    ('Nariño', 'La Cruz'),
    ('Nariño', 'La Florida'),
    ('Nariño', 'La Llanada'),
    ('Nariño', 'La Tola'),
    ('Nariño', 'La Unión'),
    ('Nariño', 'Leiva'),
    ('Nariño', 'Linares'),
    ('Nariño', 'Los Andes'),
    ('Nariño', 'Magüí'),
    ('Nariño', 'Mallama'),
    ('Nariño', 'Mosquera'),
    ('Nariño', 'Nariño'),
    ('Nariño', 'Olaya Herrera'),
    ('Nariño', 'Ospina'),
    ('Nariño', 'Policarpa'),
    ('Nariño', 'Potosí'),
    ('Nariño', 'Providencia'),
    ('Nariño', 'Puerres'),
    ('Nariño', 'Pupiales'),
    ('Nariño', 'Ricaurte'),
    ('Nariño', 'Roberto Payán'),
    ('Nariño', 'Samaniego'),
    ('Nariño', 'San Bernardo'),
    ('Nariño', 'San Lorenzo'),
    ('Nariño', 'San Pablo'),
    ('Nariño', 'San Pedro de Cartago'),
    ('Nariño', 'Sandoná'),
    ('Nariño', 'Santa Bárbara'),
    ('Nariño', 'Santacruz'),
    ('Nariño', 'Sapuyes'),
    ('Nariño', 'Taminango'),
    ('Nariño', 'Tangua'),
    ('Nariño', 'Tumaco'),
    ('Nariño', 'Túquerres'),
    ('Nariño', 'Yacuanquer'),
    ('Norte de Santander', 'Ábrego'),
    ('Norte de Santander', 'Arboledas'),
    ('Norte de Santander', 'Bochalema'),
    ('Norte de Santander', 'Bucarasica'),
    ('Norte de Santander', 'Cáchira'),
    ('Norte de Santander', 'Cácota'),
    ('Norte de Santander', 'Chinácota'),
    ('Norte de Santander', 'Chitagá'),
    ('Norte de Santander', 'Convención'),
    ('Norte de Santander', 'Cucutilla'),
    ('Norte de Santander', 'Durania'),
    ('Norte de Santander', 'El Carmen'),
    ('Norte de Santander', 'El Tarra'),
    ('Norte de Santander', 'El Zulia'),
    ('Norte de Santander', 'Gramalote'),
    ('Norte de Santander', 'Hacarí'),
    ('Norte de Santander', 'Herrán'),
    ('Norte de Santander', 'La Esperanza'),
    ('Norte de Santander', 'La Playa'),
    ('Norte de Santander', 'Labateca'),
    ('Norte de Santander', 'Los Patios'),
    ('Norte de Santander', 'Lourdes'),
    ('Norte de Santander', 'Mutiscua'),
    ('Norte de Santander', 'Ocaña'),
    ('Norte de Santander', 'Pamplona'),
    ('Norte de Santander', 'Pamplonita'),
    ('Norte de Santander', 'Puerto Santander'),
    ('Norte de Santander', 'Ragonvalia'),
    ('Norte de Santander', 'Salazar'),
    ('Norte de Santander', 'San Calixto'),
    ('Norte de Santander', 'San Cayetano'),
    ('Norte de Santander', 'Santiago'),
    ('Norte de Santander', 'Sardinata'),
    ('Norte de Santander', 'Silos'),
    ('Norte de Santander', 'Teorama'),
    ('Norte de Santander', 'Tibú'),
    ('Norte de Santander', 'Toledo'),
    ('Norte de Santander', 'Villa Caro'),
    ('Norte de Santander', 'Villa del Rosario'),
    ('Putumayo', 'Colón'),
    ('Putumayo', 'Orito'),
    ('Putumayo', 'Puerto Asís'),
    ('Putumayo', 'Puerto Caicedo'),
    ('Putumayo', 'Puerto Guzmán'),
    ('Putumayo', 'Puerto Leguízamo'),
    ('Putumayo', 'San Francisco'),
    ('Putumayo', 'San Miguel'),
    ('Putumayo', 'Santiago'),
    ('Putumayo', 'Sibundoy'),
    ('Putumayo', 'Valle del Guamuez'),
    ('Putumayo', 'Villagarzón'),
    ('Quindío', 'Buenavista'),
    ('Quindío', 'Calarcá'),
    ('Quindío', 'Circasia'),
    ('Quindío', 'Córdoba'),
    ('Quindío', 'Filandia'),
    ('Quindío', 'Génova'),
    ('Quindío', 'La Tebaida'),
    ('Quindío', 'Montenegro'),
    ('Quindío', 'Pijao'),
    ('Quindío', 'Quimbaya'),
    ('Quindío', 'Salento'),
    ('Risaralda', 'Apía'),
    ('Risaralda', 'Balboa'),
    ('Risaralda', 'Belén de Umbría'),
    ('Risaralda', 'Dosquebradas'),
    ('Risaralda', 'Guática'),
    ('Risaralda', 'La Celia'),
    ('Risaralda', 'La Virginia'),
    ('Risaralda', 'Marsella'),
    ('Risaralda', 'Mistrató'),
    ('Risaralda', 'Pueblo Rico'),
    ('Risaralda', 'Quinchía'),
    ('Risaralda', 'Santa Rosa de Cabal'),
    ('Risaralda', 'Santuario'),
    ('San Andrés y Providencia', 'Providencia'),
    ('Santander', 'Aguada'),
    ('Santander', 'Albania'),
    ('Santander', 'Aratoca'),
    ('Santander', 'Barbosa'),
    ('Santander', 'Barichara'),
    ('Santander', 'Barrancabermeja'),
    ('Santander', 'Betulia'),
    ('Santander', 'Bolívar'),
    ('Santander', 'Cabrera'),
    ('Santander', 'California'),
    ('Santander', 'Capitanejo'),
    ('Santander', 'Carcasí'),
    ('Santander', 'Cepitá'),
    ('Santander', 'Cerrito'),
    ('Santander', 'Charalá'),
    ('Santander', 'Charta'),
    ('Santander', 'Chima'),
    ('Santander', 'Chipatá'),
    ('Santander', 'Cimitarra'),
    ('Santander', 'Concepción'),
    ('Santander', 'Confines'),
    ('Santander', 'Contratación'),
    ('Santander', 'Coromoro'),
    ('Santander', 'Curití'),
    ('Santander', 'El Carmen de Chucurí'),
    ('Santander', 'El Guacamayo'),
    ('Santander', 'El Peñón'),
    ('Santander', 'El Playón'),
    ('Santander', 'Encino'),
    ('Santander', 'Enciso'),
    ('Santander', 'Florián'),
    ('Santander', 'Floridablanca'),
    ('Santander', 'Galán'),
    ('Santander', 'Gámbita'),
    ('Santander', 'Girón'),
    ('Santander', 'Guaca'),
    ('Santander', 'Guadalupe'),
    ('Santander', 'Guapotá'),
    ('Santander', 'Guavatá'),
    ('Santander', 'Güepsa'),
    ('Santander', 'Hato'),
    ('Santander', 'Jesús María'),
    ('Santander', 'Jordán'),
    ('Santander', 'La Belleza'),
    ('Santander', 'La Paz'),
    ('Santander', 'Landázuri'),
    ('Santander', 'Lebrija'),
    ('Santander', 'Los Santos'),
    ('Santander', 'Macaravita'),
    ('Santander', 'Málaga'),
    ('Santander', 'Matanza'),
    ('Santander', 'Mogotes'),
    ('Santander', 'Molagavita'),
    ('Santander', 'Ocamonte'),
    ('Santander', 'Oiba'),
    ('Santander', 'Onzaga'),
    ('Santander', 'Palmar'),
    ('Santander', 'Palmas del Socorro'),
    ('Santander', 'Páramo'),
    ('Santander', 'Piedecuesta'),
    ('Santander', 'Pinchote'),
    ('Santander', 'Puente Nacional'),
    ('Santander', 'Puerto Parra'),
    ('Santander', 'Puerto Wilches'),
    ('Santander', 'Rionegro'),
    ('Santander', 'Sabana de Torres'),
    ('Santander', 'San Andrés'),
    ('Santander', 'San Benito'),
    ('Santander', 'San Gil'),
    ('Santander', 'San Joaquín'),
    ('Santander', 'San José de Miranda'),
    ('Santander', 'San Miguel'),
    ('Santander', 'San Vicente de Chucurí'),
    ('Santander', 'Santa Bárbara'),
    ('Santander', 'Santa Helena del Opón'),
    ('Santander', 'Simacota'),
    ('Santander', 'Socorro'),
    ('Santander', 'Suaita'),
    ('Santander', 'Sucre'),
    ('Santander', 'Suratá'),
    ('Santander', 'Tona'),
    ('Santander', 'Valle de San José'),
    ('Santander', 'Vélez'),
    ('Santander', 'Vetas'),
    ('Santander', 'Villanueva'),
    ('Santander', 'Zapatoca'),
    ('Sucre', 'Buenavista'),
    ('Sucre', 'Caimito'),
    ('Sucre', 'Chalán'),
    ('Sucre', 'Colosó'),
    ('Sucre', 'Corozal'),
    ('Sucre', 'Coveñas'),
    ('Sucre', 'El Roble'),
    ('Sucre', 'Galeras'),
    ('Sucre', 'Guaranda'),
    ('Sucre', 'La Unión'),
    ('Sucre', 'Los Palmitos'),
    ('Sucre', 'Majagual'),
    ('Sucre', 'Morroa'),
    ('Sucre', 'Ovejas'),
    ('Sucre', 'Palmito'),
    ('Sucre', 'Sampués'),
    ('Sucre', 'San Benito Abad'),
    ('Sucre', 'San José de Toluviejo'),
    ('Sucre', 'San Juan de Betulia'),
    ('Sucre', 'San Luis de Sincé'),
    ('Sucre', 'San Marcos'),
    ('Sucre', 'San Onofre'),
    ('Sucre', 'San Pedro'),
    ('Sucre', 'Sucre'),
    ('Sucre', 'Tolú'),
    ('Tolima', 'Alpujarra'),
    ('Tolima', 'Alvarado'),
    ('Tolima', 'Ambalema'),
    ('Tolima', 'Anzoátegui'),
    ('Tolima', 'Armero'),
    ('Tolima', 'Ataco'),
    ('Tolima', 'Cajamarca'),
    ('Tolima', 'Carmen de Apicalá'),
    ('Tolima', 'Casabianca'),
    ('Tolima', 'Chaparral'),
    ('Tolima', 'Coello'),
    ('Tolima', 'Coyaima'),
    ('Tolima', 'Cunday'),
    ('Tolima', 'Dolores'),
    ('Tolima', 'Falan'),
    ('Tolima', 'Flandes'),
    ('Tolima', 'Fresno'),
    ('Tolima', 'Guamo'),
    ('Tolima', 'Herveo'),
    ('Tolima', 'Honda'),
    ('Tolima', 'Icononzo'),
    ('Tolima', 'Lérida'),
    ('Tolima', 'Líbano'),
    ('Tolima', 'Mariquita'),
    ('Tolima', 'Melgar'),
    ('Tolima', 'Murillo'),
    ('Tolima', 'Natagaima'),
    ('Tolima', 'Ortega'),
    ('Tolima', 'Palocabildo'),
    ('Tolima', 'Piedras'),
    ('Tolima', 'Planadas'),
    ('Tolima', 'Prado'),
    ('Tolima', 'Purificación'),
    ('Tolima', 'Rioblanco'),
    ('Tolima', 'Roncesvalles'),
    ('Tolima', 'Rovira'),
    ('Tolima', 'Saldaña'),
    ('Tolima', 'San Antonio'),
    ('Tolima', 'San Luis'),
    ('Tolima', 'Santa Isabel'),
    ('Tolima', 'Suárez'),
    ('Tolima', 'Valle de San Juan'),
    ('Tolima', 'Venadillo'),
    ('Tolima', 'Villahermosa'),
    ('Tolima', 'Villarrica'),
    ('Valle del Cauca', 'Alcalá'),
    ('Valle del Cauca', 'Andalucía'),
    ('Valle del Cauca', 'Ansermanuevo'),
    ('Valle del Cauca', 'Argelia'),
    ('Valle del Cauca', 'Bolívar'),
    ('Valle del Cauca', 'Buenaventura'),
    ('Valle del Cauca', 'Buga'),
    ('Valle del Cauca', 'Bugalagrande'),
    ('Valle del Cauca', 'Caicedonia'),
    ('Valle del Cauca', 'Calima'),
    ('Valle del Cauca', 'Candelaria'),
    ('Valle del Cauca', 'Cartago'),
    ('Valle del Cauca', 'Dagua'),
    ('Valle del Cauca', 'El Águila'),
    ('Valle del Cauca', 'El Cairo'),
    ('Valle del Cauca', 'El Cerrito'),
    ('Valle del Cauca', 'El Dovio'),
    ('Valle del Cauca', 'Florida'),
    ('Valle del Cauca', 'Ginebra'),
    ('Valle del Cauca', 'Guacarí'),
    ('Valle del Cauca', 'Jamundí'),
    ('Valle del Cauca', 'La Cumbre'),
    ('Valle del Cauca', 'La Unión'),
    ('Valle del Cauca', 'La Victoria'),
    ('Valle del Cauca', 'Obando'),
    ('Valle del Cauca', 'Palmira'),
    ('Valle del Cauca', 'Pradera'),
    ('Valle del Cauca', 'Restrepo'),
    ('Valle del Cauca', 'Riofrío'),
    ('Valle del Cauca', 'Roldanillo'),
    ('Valle del Cauca', 'San Pedro'),
    ('Valle del Cauca', 'Sevilla'),
    ('Valle del Cauca', 'Toro'),
    ('Valle del Cauca', 'Trujillo'),
    ('Valle del Cauca', 'Tuluá'),
    ('Valle del Cauca', 'Ulloa'),
    ('Valle del Cauca', 'Versalles'),
    ('Valle del Cauca', 'Vijes'),
    ('Valle del Cauca', 'Yotoco'),
    ('Valle del Cauca', 'Yumbo'),
    ('Valle del Cauca', 'Zarzal'),
    ('Vaupés', 'Carurú'),
    ('Vaupés', 'Pacoa'),
    ('Vaupés', 'Papunahua'),
    ('Vaupés', 'Taraira'),
    ('Vaupés', 'Yavaraté'),
    ('Vichada', 'Cumaribo'),
    ('Vichada', 'La Primavera'),
    ('Vichada', 'Santa Rosalía')
) AS v(departamento, nombre)
JOIN departamentos d ON d.nombre = v.departamento
WHERE NOT EXISTS (
    SELECT 1 FROM ciudades c
    WHERE c.departamento_id = d.id AND lower(c.nombre) = lower(v.nombre)
);


-- ==========================================================================
-- PARTE 3 de 3 · VERIFICACION
-- Si algun numero da 0, ese pedazo no entro
-- ==========================================================================


-- La empresa inicial "SISVIA" se creo antes de los seeds: sus limites se
-- ajustan a las sedes de muestra que se acaban de cargar.
UPDATE empresas SET limite_sedes = GREATEST(1, (SELECT count(*) FROM sedes WHERE activo)),
                    limite_vehiculos = GREATEST(1, (SELECT count(*) FROM vehiculos WHERE activo))
WHERE lower(nombre) = 'sisvia';

SELECT 'categorias_chequeo' AS tabla, COUNT(*) AS filas, 5   AS esperado FROM categorias_chequeo
UNION ALL SELECT 'items_chequeo',      COUNT(*), 39 FROM items_chequeo
UNION ALL SELECT 'preguntas_aptitud',  COUNT(*), 5  FROM preguntas_aptitud
UNION ALL SELECT 'regiones',           COUNT(*), 5  FROM regiones
UNION ALL SELECT 'departamentos',      COUNT(*), 33 FROM departamentos
UNION ALL SELECT 'ciudades',           COUNT(*), 1122 FROM ciudades
UNION ALL SELECT 'sedes',              COUNT(*), 5  FROM sedes
UNION ALL SELECT 'usuarios',           COUNT(*), 0  FROM usuarios
UNION ALL SELECT 'vehiculos',          COUNT(*), 0  FROM vehiculos
UNION ALL SELECT 'empresas',           COUNT(*), 1  FROM empresas
ORDER BY tabla;



-- ==========================================================================
-- PASO FINAL (A MANO) · TU PRIMER ADMINISTRADOR
-- Sin esto no hay con quien iniciar sesion
-- ==========================================================================


-- La tabla `usuarios` apunta a `auth.users`, que la maneja Supabase Auth.
-- Por eso el usuario se crea en DOS pasos y el segundo va aqui.
--
--   PASO 1 · en el Dashboard de Supabase
--     Authentication -> Users -> Add user -> Create new user
--       Email:    el tuyo
--       Password: la que quieras
--       Marca "Auto Confirm User" (si no, no puede entrar)
--     Copia el UUID que queda en la columna "User UID".
--
--   PASO 2 · descomenta el INSERT de abajo, pega el UUID y ejecutalo.
--
-- El rol 'superadmin' es el equipo SISVIA: ve TODAS las empresas y no tiene
-- sede ni empresa asignada.

-- OJO: la tabla `usuarios` NO tiene columna `email` (el correo vive en
-- auth.users) ni `apellido`. El nombre va completo en `nombre_completo`.

-- INSERT INTO usuarios (id, nombre_completo, cedula, rol, activo)
-- VALUES (
--     'PEGA-AQUI-EL-USER-UID',            -- el UUID del paso 1
--     'Juan Sebastián Martín Moncada',
--     '1000000000',                       -- cedula: sirve para iniciar sesion
--     'superadmin',
--     true
-- );

-- Y tu marca de dueño de SISVIA (HU-20.6): solo una cuenta la tiene; ve el
-- "Registro del equipo" y nadie la puede desactivar ni eliminar desde la app.
-- UPDATE usuarios SET es_dueno = true WHERE cedula = '1000000000' AND rol = 'superadmin';

-- Comprobacion:
-- SELECT nombre_completo, cedula, rol, activo, es_dueno FROM usuarios;
