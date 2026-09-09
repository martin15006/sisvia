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
