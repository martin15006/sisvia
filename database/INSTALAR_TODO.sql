-- ============================================================================
--  SISVIA — INSTALACION COMPLETA EN UN SOLO ARCHIVO
-- ============================================================================
--  Generado el 2026-09-06 juntando database.sql + los 6 seeds.
--  Las 12 migraciones de database/migrations/ YA ESTAN incluidas en el
--  esquema: no hay que correr ninguna aparte.
--
--  COMO USARLO (Supabase)
--    1. Dashboard -> SQL Editor -> New query
--    2. Pegar TODO este archivo
--    3. Run
--    4. Al final sale una tabla de verificacion con los conteos
--
--  QUE DEJA INSTALADO
--    22 tablas + 2 triggers + indices + RLS activo
--    5 categorias, 39 items de chequeo, 5 preguntas de aptitud
--    5 regiones, 33 departamentos, 34 ciudades, 5 sedes de muestra
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
ON CONFLICT (nombre) DO NOTHING;


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
-- PARTE 3 de 3 · VERIFICACION
-- Si algun numero da 0, ese pedazo no entro
-- ==========================================================================


SELECT 'categorias_chequeo' AS tabla, COUNT(*) AS filas, 5   AS esperado FROM categorias_chequeo
UNION ALL SELECT 'items_chequeo',      COUNT(*), 39 FROM items_chequeo
UNION ALL SELECT 'preguntas_aptitud',  COUNT(*), 5  FROM preguntas_aptitud
UNION ALL SELECT 'regiones',           COUNT(*), 5  FROM regiones
UNION ALL SELECT 'departamentos',      COUNT(*), 33 FROM departamentos
UNION ALL SELECT 'ciudades',           COUNT(*), 34 FROM ciudades
UNION ALL SELECT 'sedes',              COUNT(*), 5  FROM sedes
UNION ALL SELECT 'usuarios',           COUNT(*), 0  FROM usuarios
UNION ALL SELECT 'vehiculos',          COUNT(*), 0  FROM vehiculos
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
-- El rol 'superadmin' ve TODO el sistema y no necesita sede asignada.

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

-- Comprobacion:
-- SELECT nombre_completo, cedula, rol, activo FROM usuarios;
