-- SISVIA · 2026-09-16 · Motos, carros y motocarros como tipo de vehiculo.
-- Solo AGREGA tipos: los vehiculos existentes no cambian.
-- Correr una vez en el SQL Editor de Supabase. database.sql e INSTALAR_TODO.sql
-- ya traen la lista nueva (para instalaciones desde cero no hace falta esto).

ALTER TABLE vehiculos DROP CONSTRAINT IF EXISTS vehiculos_tipo_check;

ALTER TABLE vehiculos ADD CONSTRAINT vehiculos_tipo_check CHECK (tipo IN (
    'automovil', 'motocicleta', 'motocarro',
    'camion', 'camioneta', 'tractocamion',
    'microbus', 'buseta', 'bus'
));

-- Verificacion: debe mostrar la lista con automovil, motocicleta y motocarro.
SELECT pg_get_constraintdef(oid) AS tipos_permitidos
FROM pg_constraint
WHERE conname = 'vehiculos_tipo_check';
