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
