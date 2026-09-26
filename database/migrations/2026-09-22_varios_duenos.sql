-- ============================================================================
--  Varios dueños de SISVIA (pacto para-empresas · enmienda 7 · HU-20.5-7 · RN-15
--  · CB-22 · CB-23)
--
--  Antes habia un solo dueño y la marca se "pasaba". Ahora la empresa puede
--  tener varios (si crece o se vende una parte), asi que:
--    1. se va la regla de "uno solo";
--    2. en vez del traspaso hay tres operaciones, cada una en un solo paso y
--       anotada sola en el registro del equipo:
--         dar_marca_dueno(de, a)    -> el otro queda dueño TAMBIEN
--         pasar_marca_dueno(de, a)  -> el otro queda dueño y quien la pasa deja de serlo
--         quitarme_marca_dueno(yo)  -> renuncia a la suya; el ultimo no puede
--       Nadie le quita la marca a otro desde la app (RN-15): eso se hace aca,
--       en la base, y solo Martin entra aca.
--
--  Lo que NO cambia: la marca solo vive en un Administrador general activo, su
--  cuenta no se puede borrar, y las llaves publicas no pueden llamar a nada de esto.
--  Se puede correr dos veces.
-- ============================================================================

BEGIN;

-- 1. Ya no hay "un solo dueño"
DROP INDEX IF EXISTS usuarios_un_solo_dueno;
-- Sigue en pie: la marca solo en un Administrador general activo (HU-20.4)
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_dueno_superadmin_activo;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_dueno_superadmin_activo CHECK (NOT es_dueno OR (rol = 'superadmin' AND activo));

-- 2. Las tres operaciones. La vieja ya no va.
DROP FUNCTION IF EXISTS traspasar_dueno(UUID, UUID);

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

-- Solo el backend: con las llaves publicas nadie las puede llamar por la API.
DO $$
DECLARE
    v_funcion TEXT;
BEGIN
    FOREACH v_funcion IN ARRAY ARRAY['dar_marca_dueno(uuid, uuid)', 'pasar_marca_dueno(uuid, uuid)',
                                     'quitarme_marca_dueno(uuid)', 'marca_destino_valido(uuid, uuid)',
                                     'actividad_marca_dueno(usuarios, usuarios, text)'] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_funcion);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_funcion); END IF;
    END LOOP;
END $$;

COMMIT;

-- Verificacion: quienes son dueños hoy.
SELECT nombre_completo, cedula, es_dueno FROM usuarios WHERE es_dueno ORDER BY nombre_completo;

-- ============================================================================
--  DESPUES (A MANO) · LA SEGUNDA CUENTA DUEÑA
--  Para dejar dueña tambien a la cuenta "segundo al mando" (pedido del
--  2026-09-22), ejecuta:
--
--    UPDATE usuarios SET es_dueno = true WHERE cedula = '9876543210' AND rol = 'superadmin';
--    SELECT nombre_completo, es_dueno FROM usuarios WHERE es_dueno;
--
--  Tienen que salir dos filas.
-- ============================================================================
