-- ============================================================================
--  IP y navegador en el Registro del equipo (pacto portada-publica, enmienda 1)
--
--  Desde aca, lo que hace el equipo SISVIA y queda en el Registro del equipo
--  guarda la IP de la conexion y el navegador desde donde se hizo (HU-07 · RN-07).
--  Lo de la gente de las empresas no la guarda: el backend solo la manda cuando
--  quien actua es superadmin.
--   - actividad:            tipo nuevo 'solicitud' (marcar y borrar solicitudes de
--                           cita, HU-04.5) y columnas ip y navegador.
--   - auditoria_empresas,
--     auditoria_usuarios,
--     auditoria_vehiculos:  columnas ip y navegador; sus copias al registro las pasan.
--   - dar/pasar/quitarme la marca de dueño: reciben ip y navegador (opcionales, asi
--     el backend de antes del push las sigue llamando igual).
--
--  Es aditiva y se puede correr dos veces. Los renglones de antes quedan sin IP.
-- ============================================================================

BEGIN;

-- 1. El registro: el tipo 'solicitud', la IP y el navegador.
ALTER TABLE actividad ADD COLUMN IF NOT EXISTS ip TEXT CHECK (ip IS NULL OR char_length(ip) <= 64);
ALTER TABLE actividad ADD COLUMN IF NOT EXISTS navegador TEXT CHECK (navegador IS NULL OR char_length(navegador) <= 300);
ALTER TABLE actividad DROP CONSTRAINT IF EXISTS actividad_tipo_check;
ALTER TABLE actividad ADD CONSTRAINT actividad_tipo_check
    CHECK (tipo IN ('vehiculo', 'usuario', 'sede', 'catalogo', 'empresa', 'equipo', 'solicitud'));

-- 2. Las auditorias de donde se copia el registro.
ALTER TABLE auditoria_empresas  ADD COLUMN IF NOT EXISTS ip TEXT CHECK (ip IS NULL OR char_length(ip) <= 64);
ALTER TABLE auditoria_empresas  ADD COLUMN IF NOT EXISTS navegador TEXT CHECK (navegador IS NULL OR char_length(navegador) <= 300);
ALTER TABLE auditoria_usuarios  ADD COLUMN IF NOT EXISTS ip TEXT CHECK (ip IS NULL OR char_length(ip) <= 64);
ALTER TABLE auditoria_usuarios  ADD COLUMN IF NOT EXISTS navegador TEXT CHECK (navegador IS NULL OR char_length(navegador) <= 300);
ALTER TABLE auditoria_vehiculos ADD COLUMN IF NOT EXISTS ip TEXT CHECK (ip IS NULL OR char_length(ip) <= 64);
ALTER TABLE auditoria_vehiculos ADD COLUMN IF NOT EXISTS navegador TEXT CHECK (navegador IS NULL OR char_length(navegador) <= 300);

-- 3. Las copias al registro pasan la IP y el navegador.
CREATE OR REPLACE FUNCTION actividad_copiar_vehiculo(p auditoria_vehiculos) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO actividad (empresa_id, empresa_nombre, actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto, detalles, origen, created_at, ip, navegador)
    SELECT v.empresa_id, e.nombre, p.accion_por_id, COALESCE(u.nombre_completo, 'Alguien que ya no está'), actividad_cargo(u.rol, u.es_pool),
           COALESCE(u.rol = 'superadmin', false), 'vehiculo', p.accion, v.id::text, COALESCE(p.detalles->>'placa', v.placa), p.detalles,
           'auditoria_vehiculos:' || p.id, p.created_at, p.ip, p.navegador
    FROM vehiculos v
    JOIN empresas e ON e.id = v.empresa_id
    LEFT JOIN usuarios u ON u.id = p.accion_por_id
    WHERE v.id = p.vehiculo_id
    ON CONFLICT (origen) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION actividad_copiar_usuario(p auditoria_usuarios) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO actividad (empresa_id, empresa_nombre, actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto, detalles, origen, created_at, ip, navegador)
    SELECT e.id, e.nombre, p.accion_por_id, COALESCE(u.nombre_completo, 'Alguien que ya no está'), actividad_cargo(u.rol, u.es_pool),
           COALESCE(u.rol = 'superadmin', false), CASE WHEN af.rol = 'superadmin' THEN 'equipo' ELSE 'usuario' END,
           p.accion, af.id::text, COALESCE(p.detalles->>'nombre', af.nombre_completo), p.detalles,
           'auditoria_usuarios:' || p.id, p.created_at, p.ip, p.navegador
    FROM usuarios af
    LEFT JOIN empresas e ON e.id = af.empresa_id AND af.rol <> 'superadmin'
    LEFT JOIN usuarios u ON u.id = p.accion_por_id
    WHERE af.id = p.usuario_afectado_id
    ON CONFLICT (origen) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION actividad_copiar_empresa(p auditoria_empresas) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_ruta TEXT := COALESCE(p.detalles->>'ruta', '');
BEGIN
    IF p.accion = 'soporte' AND (v_ruta LIKE '/api/vehiculos%' OR v_ruta LIKE '/api/usuarios%') THEN
        RETURN;
    END IF;
    INSERT INTO actividad (empresa_id, empresa_nombre, actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto, detalles, origen, created_at, ip, navegador)
    SELECT p.empresa_id, p.empresa_nombre, p.actor_id, COALESCE(u.nombre_completo, 'Alguien del equipo SISVIA'),
           COALESCE(actividad_cargo(u.rol, u.es_pool), 'Administrador general'), true,
           CASE WHEN v_ruta LIKE '/api/geo/sedes%' THEN 'sede'
                WHEN v_ruta LIKE '/api/catalogo-admin%' THEN 'catalogo'
                ELSE 'empresa' END,
           p.accion, CASE WHEN p.accion = 'soporte' THEN NULL ELSE p.empresa_id::text END,
           CASE WHEN p.accion = 'soporte' THEN p.detalles->>'elemento' ELSE p.empresa_nombre END, p.detalles,
           'auditoria_empresas:' || p.id, p.created_at, p.ip, p.navegador
    FROM (SELECT 1) uno
    LEFT JOIN usuarios u ON u.id = p.actor_id
    ON CONFLICT (origen) DO NOTHING;
END;
$$;

-- 4. La marca de dueño con IP y navegador. Cambian los parametros: se borran las
--    de antes (si quedaran las dos, la API no sabria cual llamar).
DROP FUNCTION IF EXISTS dar_marca_dueno(uuid, uuid);
DROP FUNCTION IF EXISTS pasar_marca_dueno(uuid, uuid);
DROP FUNCTION IF EXISTS quitarme_marca_dueno(uuid);
DROP FUNCTION IF EXISTS actividad_marca_dueno(usuarios, usuarios, text);

CREATE OR REPLACE FUNCTION actividad_marca_dueno(p_quien usuarios, p_sobre usuarios, p_accion TEXT, p_ip TEXT DEFAULT NULL, p_navegador TEXT DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
    INSERT INTO actividad (actor_id, actor_nombre, actor_cargo, de_sisvia, tipo, accion, objeto_id, objeto, ip, navegador)
    VALUES (p_quien.id, p_quien.nombre_completo, 'Administrador general', true, 'equipo', p_accion,
            CASE WHEN p_sobre IS NULL THEN NULL ELSE p_sobre.id::text END,
            CASE WHEN p_sobre IS NULL THEN p_quien.nombre_completo ELSE p_sobre.nombre_completo END,
            p_ip, p_navegador);
$$;

CREATE OR REPLACE FUNCTION dar_marca_dueno(p_de UUID, p_a UUID, p_ip TEXT DEFAULT NULL, p_navegador TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
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
    PERFORM actividad_marca_dueno(v_de, v_destino, 'dio_marca', p_ip, p_navegador);
END;
$$;

CREATE OR REPLACE FUNCTION pasar_marca_dueno(p_de UUID, p_a UUID, p_ip TEXT DEFAULT NULL, p_navegador TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
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
    PERFORM actividad_marca_dueno(v_de, v_destino, 'traspaso_dueno', p_ip, p_navegador);
END;
$$;

CREATE OR REPLACE FUNCTION quitarme_marca_dueno(p_quien UUID, p_ip TEXT DEFAULT NULL, p_navegador TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
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
    PERFORM actividad_marca_dueno(v_yo, NULL, 'dejo_marca', p_ip, p_navegador);
END;
$$;

-- Solo el backend: con la llave publica nadie las puede llamar por la API.
DO $$
DECLARE
    v_funcion TEXT;
BEGIN
    FOREACH v_funcion IN ARRAY ARRAY['dar_marca_dueno(uuid, uuid, text, text)', 'pasar_marca_dueno(uuid, uuid, text, text)',
                                     'quitarme_marca_dueno(uuid, text, text)', 'actividad_marca_dueno(usuarios, usuarios, text, text, text)',
                                     'actividad_copiar_vehiculo(auditoria_vehiculos)', 'actividad_copiar_usuario(auditoria_usuarios)',
                                     'actividad_copiar_empresa(auditoria_empresas)'] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_funcion);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_funcion); END IF;
    END LOOP;
END $$;

COMMIT;

-- Verificacion: las columnas nuevas (6 filas de auditorias + 2 del registro) y el tipo 'solicitud'.
SELECT table_name || '.' || column_name AS que, data_type AS valor FROM information_schema.columns
WHERE column_name IN ('ip', 'navegador') AND table_name IN ('actividad', 'auditoria_empresas', 'auditoria_usuarios', 'auditoria_vehiculos')
UNION ALL
SELECT 'actividad acepta solicitud', (pg_get_constraintdef(oid) LIKE '%solicitud%')::text FROM pg_constraint WHERE conname = 'actividad_tipo_check';
