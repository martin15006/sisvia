-- Migracion: aplanar roles de administrador (12 jun 2026).
--
-- El producto no usa los niveles macro-region ni ciudad: una "Regional"
-- equivale a un departamento (Director Regional). Se eliminan del USO los roles
-- admin_regional y admin_ciudad.
--
-- Postgres no permite quitar valores de un enum en caliente, asi que en la BD
-- viva esos valores quedan DORMIDOS en el tipo rol_usuario (cero filas que los
-- usen). El database.sql canonico ya define el rol con solo los 4 valores
-- vigentes para un clon desde cero.
--
-- COMO APLICAR (Supabase Dashboard -> SQL Editor): pega y Run.

-- ==
-- 1. Verificar quien usa los roles a eliminar (revisar ANTES de borrar)
-- ==
-- SELECT id, nombre_completo, cedula, rol FROM usuarios
-- WHERE rol IN ('admin_regional', 'admin_ciudad');

-- ==
-- 2. Eliminar las cuentas de esos roles. Como usuarios.id referencia a
--    auth.users(id) ON DELETE CASCADE, basta con borrar de auth.users: la fila
--    de la tabla usuarios se borra sola en cascada. (Hacerlo desde la app con el
--    boton "eliminar usuario" tiene el mismo efecto.)
-- ==
DELETE FROM auth.users
WHERE id IN (
    SELECT id FROM usuarios WHERE rol IN ('admin_regional', 'admin_ciudad')
);

-- ==
-- 3. Columnas que quedan SIN USO (solo las usaban los roles eliminados):
--    usuarios.region_id  -> obsoleta
--    usuarios.ciudad_id  -> obsoleta
--    Se dejan en su lugar (nullable) para no arriesgar un DROP en caliente.
-- ==
