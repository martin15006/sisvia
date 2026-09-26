-- ============================================================================
--  Actividad de la empresa y Dueño de SISVIA (pacto para-empresas · HU-19 · HU-20
--  · RN-14 · RN-15 · CB-22 a CB-25)
--
--  1. Tabla `actividad`: una sola lista de lo que pasa en cada empresa (vehiculos,
--     usuarios, sedes, catalogo propio y lo que hizo el equipo SISVIA adentro) y
--     de lo que hace el equipo SISVIA en general (sus cuentas, las empresas).
--     Guarda el nombre y el cargo de quien lo hizo, y el nombre de lo que toco:
--     si despues se eliminan, el registro se sigue entendiendo (CB-24).
--     Solo crece: la app no la edita ni la borra (RN-14).
--  2. Cada registro que ya se escribe (auditoria_vehiculos, auditoria_usuarios,
--     auditoria_empresas) se copia solo a la actividad: los viejos una vez
--     (HU-19.2) y los nuevos al escribirse (disparador). Asi no queda hueco entre
--     esta migracion y el codigo nuevo, y nada se olvida de registrarse. Las
--     sedes y el catalogo propio los escribe el backend directo.
--     Lo que apuntaba a algo ya eliminado no se puede asignar a una empresa y
--     queda afuera. Se puede correr dos veces: no duplica (columna `origen`).
--  3. Marca de dueño (`usuarios.es_dueno`, RN-15): a lo sumo una, solo en un
--     Administrador general activo, y esa cuenta no se puede borrar.
--  4. `traspasar_dueno(de, a)`: pasa la marca y lo anota, en una sola operacion
--     (CB-23). Solo la puede llamar el backend (service_role).
--
--  Es compatible con el codigo que esta hoy en produccion. Se puede correr dos veces.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. La actividad
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
-- A lo sumo un dueño
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_un_solo_dueno ON usuarios (es_dueno) WHERE es_dueno;
-- El dueño es siempre un Administrador general activo: ni un error ni una
-- llamada directa pueden desactivarlo o cambiarle el rol (HU-20.4).
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_dueno_superadmin_activo;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_dueno_superadmin_activo CHECK (NOT es_dueno OR (rol = 'superadmin' AND activo));
-- ...y su cuenta no se borra (tampoco desde el panel de Supabase: primero se pasa la marca)
CREATE OR REPLACE FUNCTION impedir_borrar_dueno() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.es_dueno THEN
        RAISE EXCEPTION 'La cuenta del dueño de SISVIA no se puede eliminar: primero quítate la marca.'  -- (enmienda 7: ver 2026-09-22_varios_duenos.sql) USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS usuarios_impedir_borrar_dueno ON usuarios;
CREATE TRIGGER usuarios_impedir_borrar_dueno BEFORE DELETE ON usuarios FOR EACH ROW EXECUTE FUNCTION impedir_borrar_dueno();

-- ---------------------------------------------------------------------------
-- 4. Pasar la marca, en una sola operacion (HU-20.5 · CB-22 · CB-23)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION traspasar_dueno(p_de UUID, p_a UUID) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_filas   INTEGER;
    v_de      usuarios%ROWTYPE;
    v_destino usuarios%ROWTYPE;
BEGIN
    SELECT * INTO v_destino FROM usuarios WHERE id = p_a AND id <> p_de AND rol = 'superadmin' AND activo;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'destino_invalido';
    END IF;
    -- Si dos traspasos llegan a la vez, el segundo espera al primero y ya no
    -- encuentra la marca donde estaba: no hace nada (CB-23).
    UPDATE usuarios SET es_dueno = false WHERE id = p_de AND es_dueno RETURNING * INTO v_de;
    GET DIAGNOSTICS v_filas = ROW_COUNT;
    IF v_filas = 0 THEN
        RAISE EXCEPTION 'ya_cambio';
    END IF;
    UPDATE usuarios SET es_dueno = true WHERE id = p_a;
    INSERT INTO actividad (actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto)
    VALUES (v_de.id, v_de.nombre_completo, 'Administrador general', true, 'equipo', 'traspaso_dueno', v_destino.id::text, v_destino.nombre_completo);
END;
$$;
-- Solo el backend: con la llave publica nadie las puede llamar por la API.
DO $$
DECLARE
    v_funcion TEXT;
BEGIN
    FOREACH v_funcion IN ARRAY ARRAY['traspasar_dueno(uuid, uuid)', 'actividad_copiar_vehiculo(auditoria_vehiculos)',
                                     'actividad_copiar_usuario(auditoria_usuarios)', 'actividad_copiar_empresa(auditoria_empresas)'] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_funcion);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_funcion); END IF;
    END LOOP;
END $$;

COMMIT;

-- Verificacion: la tabla con RLS activo y cuantos registros viejos se copiaron.
SELECT 'actividad' AS que, relrowsecurity AS rls_activo, (SELECT count(*) FROM actividad) AS registros_copiados
FROM pg_class WHERE relname = 'actividad';

-- ============================================================================
--  DESPUES (A MANO) · TU MARCA DE DUEÑO (HU-20.6)
--  Cambia la cedula por la tuya y ejecuta solo estas dos lineas:
--
--    UPDATE usuarios SET es_dueno = true WHERE cedula = 'TU-CEDULA' AND rol = 'superadmin';
--    SELECT nombre_completo, es_dueno FROM usuarios WHERE es_dueno;
--
--  Tiene que salir una sola fila: la tuya.
-- ============================================================================
