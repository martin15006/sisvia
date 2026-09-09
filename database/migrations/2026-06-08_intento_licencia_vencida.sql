-- Migracion: agregar 'licencia_vencida' a las razones de intento bloqueado.
-- Tarea #106: bloquear el chequeo si la licencia del conductor esta vencida.
--
-- COMO APLICAR (Supabase Dashboard -> SQL Editor -> Run):

ALTER TABLE intentos_chequeo_bloqueado
    DROP CONSTRAINT IF EXISTS intentos_chequeo_bloqueado_razon_check;

ALTER TABLE intentos_chequeo_bloqueado
    ADD CONSTRAINT intentos_chequeo_bloqueado_razon_check
    CHECK (razon IN (
        'conductor_no_apto',
        'vehiculo_desactivado',
        'vehiculo_no_existe',
        'sesion_invalida',
        'licencia_vencida'
    ));
