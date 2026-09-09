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
