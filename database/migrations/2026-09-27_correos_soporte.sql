-- ============================================================================
--  Correos de Soporte: uno por conversacion (pacto correos-de-soporte)
--
--  Hoy cada mensaje de Soporte sale tambien por correo, a todo el equipo SISVIA.
--  Desde aca, a cada persona le llega UN correo por conversacion hasta que la
--  abra (HU-01), el que responde se queda con la conversacion (HU-02) y cada
--  Administrador puede apagar estos correos en Mi perfil (HU-03).
--   - usuarios.correos_soporte:   el interruptor de Mi perfil (prendido de entrada).
--   - buzon_mensajes.atiende_id:  quien del equipo SISVIA respondio por ultima vez.
--   - buzon_correo_estado:        por conversacion y persona, cuando le llego el
--                                 ultimo correo y cuando la vio.
--   - reclamar_correo_buzon:      decide a quien le toca correo y lo anota en la
--                                 misma operacion (dos mensajes a la vez no mandan
--                                 dos correos, CB-01).
--   - marcar_visto_buzon:         "la vio", con la hora de la base (no la del PC).
--   - liberar_correo_buzon:       si el correo fallo, lo deja como no avisado (CB-02).
--
--  Es aditiva: el codigo que esta hoy en produccion no la nota (columnas con
--  valor por defecto, tabla y funciones que nadie usa todavia). Se puede correr
--  dos veces.
-- ============================================================================

BEGIN;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correos_soporte BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE buzon_mensajes ADD COLUMN IF NOT EXISTS atiende_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS buzon_correo_estado (
    mensaje_id        UUID NOT NULL REFERENCES buzon_mensajes(id) ON DELETE CASCADE,
    usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ultimo_correo_en  TIMESTAMPTZ,   -- vacio: nunca le llego un correo de esta conversacion
    visto_en          TIMESTAMPTZ,   -- la ultima vez que la abrio (o respondio, o la escribio)
    PRIMARY KEY (mensaje_id, usuario_id)
);
ALTER TABLE buzon_correo_estado ENABLE ROW LEVEL SECURITY;

-- A quien de p_usuarios le toca correo de esta conversacion (HU-01.1-4): nunca le
-- llego uno, o la vio despues del ultimo; y no la vio en los ultimos p_ventana
-- (la esta mirando). A los que les toca, les anota el correo y los devuelve con
-- la hora anterior (para liberarlo si el envio falla). Cada fila se bloquea antes
-- de decidir, en orden, asi dos llamadas a la vez nunca reclaman la misma.
CREATE OR REPLACE FUNCTION reclamar_correo_buzon(p_mensaje UUID, p_usuarios UUID[], p_ventana INTERVAL DEFAULT INTERVAL '10 minutes')
RETURNS TABLE (usuario_id UUID, correo_anterior TIMESTAMPTZ, correo_nuevo TIMESTAMPTZ) LANGUAGE plpgsql AS $$
DECLARE
    v_usuario UUID;
    v_fila    buzon_correo_estado%ROWTYPE;
BEGIN
    FOR v_usuario IN SELECT DISTINCT u FROM unnest(p_usuarios) AS u WHERE u IS NOT NULL ORDER BY u LOOP
        INSERT INTO buzon_correo_estado AS e (mensaje_id, usuario_id) VALUES (p_mensaje, v_usuario) ON CONFLICT DO NOTHING;
        SELECT * INTO v_fila FROM buzon_correo_estado AS e
        WHERE e.mensaje_id = p_mensaje AND e.usuario_id = v_usuario FOR UPDATE;
        IF (v_fila.ultimo_correo_en IS NULL OR v_fila.visto_en > v_fila.ultimo_correo_en)
           AND (v_fila.visto_en IS NULL OR v_fila.visto_en <= now() - p_ventana) THEN
            usuario_id := v_usuario;
            correo_anterior := v_fila.ultimo_correo_en;
            correo_nuevo := clock_timestamp();
            UPDATE buzon_correo_estado AS e SET ultimo_correo_en = correo_nuevo
            WHERE e.mensaje_id = p_mensaje AND e.usuario_id = v_usuario;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

-- "La vio" (RN-01): al abrirla, responder o escribirla.
CREATE OR REPLACE FUNCTION marcar_visto_buzon(p_mensaje UUID, p_usuario UUID) RETURNS void LANGUAGE sql AS $$
    INSERT INTO buzon_correo_estado AS e (mensaje_id, usuario_id, visto_en) VALUES (p_mensaje, p_usuario, now())
    ON CONFLICT (mensaje_id, usuario_id) DO UPDATE SET visto_en = now();
$$;

-- El correo no salio (CB-02): vuelve a como estaba, si nadie lo reclamo despues.
CREATE OR REPLACE FUNCTION liberar_correo_buzon(p_mensaje UUID, p_usuario UUID, p_anterior TIMESTAMPTZ, p_reclamado TIMESTAMPTZ)
RETURNS void LANGUAGE sql AS $$
    UPDATE buzon_correo_estado AS e SET ultimo_correo_en = p_anterior
    WHERE e.mensaje_id = p_mensaje AND e.usuario_id = p_usuario AND e.ultimo_correo_en = p_reclamado;
$$;

-- Solo el backend: con la llave publica nadie las puede llamar por la API.
DO $$
DECLARE
    v_funcion TEXT;
BEGIN
    FOREACH v_funcion IN ARRAY ARRAY['reclamar_correo_buzon(uuid, uuid[], interval)', 'marcar_visto_buzon(uuid, uuid)',
                                     'liberar_correo_buzon(uuid, uuid, timestamptz, timestamptz)'] LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_funcion);
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_funcion); END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_funcion); END IF;
    END LOOP;
END $$;

COMMIT;

-- Verificacion: la tabla nueva con RLS activo (true) y las dos columnas nuevas.
SELECT 'buzon_correo_estado' AS que, relrowsecurity::text AS valor FROM pg_class WHERE relname = 'buzon_correo_estado'
UNION ALL
SELECT table_name || '.' || column_name, data_type FROM information_schema.columns
WHERE (table_name, column_name) IN (('usuarios', 'correos_soporte'), ('buzon_mensajes', 'atiende_id'));
