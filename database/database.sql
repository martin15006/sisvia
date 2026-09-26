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
    -- departamento (Director Regional). Etiquetas visibles: superadmin =
    -- Administrador general, admin_departamental = Director Regional,
    -- admin_sede = Coordinador de sede. (En la BD viva quedaron dormidos admin_regional/admin_ciudad porque
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


-- ==
-- FIN DEL SCHEMA
-- ==
-- Después correr los seeds en orden:
--   seeds/01_categorias_chequeo.sql
--   seeds/02_items_chequeo.sql
--   seeds/03_preguntas_aptitud.sql
--   seeds/04_regiones.sql
--   seeds/05_departamentos.sql

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
