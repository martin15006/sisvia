-- ==
-- Seed: 39 ítems normativos del checklist preoperacional
-- ==
-- Orden de ejecución: 02 (después de 01_categorias_chequeo)
-- Idempotente: borra los items anteriores y vuelve a insertar
--
-- Ítems CRÍTICOS (bloquean automáticamente el vehículo si NO CUMPLE):
--   - Líquido de frenos
--   - Freno (agarre) - pedal del freno
--   - Luces (altas, medias, bajas)
--   - Direccionales
--   - Stops (frenos)
--   - Freno de emergencia
-- ==

-- Limpiar para que la re-ejecución sea consistente
DELETE FROM items_chequeo;

-- Insertar usando subconsulta para resolver categoria_id por nombre
DO $$
DECLARE
    cat_niveles     INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'NIVELES');
    cat_pedales     INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'PEDALES');
    cat_luces       INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'LUCES');
    cat_seguridad   INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'SEGURIDAD VIAL');
    cat_varios      INTEGER := (SELECT id FROM categorias_chequeo WHERE nombre = 'VARIOS');
BEGIN
    INSERT INTO items_chequeo (categoria_id, descripcion, descripcion_larga, orden, es_critico) VALUES
        -- NIVELES (5 ítems)
        (cat_niveles, 'Líquido refrigerante de radiador', NULL,                                                                 1, false),
        (cat_niveles, 'Líquido de frenos',                NULL,                                                                 2, true),  -- CRÍTICO
        (cat_niveles, 'Aceite motor',                     NULL,                                                                 3, false),
        (cat_niveles, 'Nivel líquido hidráulico',         NULL,                                                                 4, false),
        (cat_niveles, 'Agua de limpiavidrios',            NULL,                                                                 5, false),

        -- PEDALES (3 ítems)
        (cat_pedales, 'Acelerador',                       'Verificar elemento antideslizante, rango de desplazamiento y graduación',  6, false),
        (cat_pedales, 'Clutch (cloche / embrague)',       'Verificar elemento antideslizante, rango de desplazamiento y graduación',  7, false),
        (cat_pedales, 'Freno (agarre)',                   'Verificar elemento antideslizante, rango de desplazamiento y graduación',  8, true),  -- CRÍTICO

        -- LUCES (7 ítems)
        (cat_luces,   'Luces (altas, medias, bajas)',     NULL,                                                                 9, true),  -- CRÍTICO
        (cat_luces,   'Direccionales',                    NULL,                                                                10, true),  -- CRÍTICO
        (cat_luces,   'Estacionarias',                    NULL,                                                                11, false),
        (cat_luces,   'Stops (frenos)',                   NULL,                                                                12, true),  -- CRÍTICO
        (cat_luces,   'Testigos del tablero',             NULL,                                                                13, false),
        (cat_luces,   'Luz de reversa',                   NULL,                                                                14, false),
        (cat_luces,   'Luces internas',                   NULL,                                                                15, false),

        -- SEGURIDAD VIAL / KIT DE CARRETERA (8 ítems)
        (cat_seguridad, 'Extintor (BC - ABC)',                                            NULL,                                  16, false),
        (cat_seguridad, 'Fecha de vencimiento del extintor',                              NULL,                                  17, false),
        (cat_seguridad, 'Cruceta acorde a los pernos',                                    NULL,                                  18, false),
        (cat_seguridad, '2 señales reflectivas en triángulo',                             'Con soporte para ubicación vertical o lámparas de luz amarilla intermitente', 19, false),
        (cat_seguridad, 'Caja de herramientas',                                           'Mínimo alicate, destornilladores, llaves de expansión y llaves fijas. Medidor de presión de aire en vehículo operativo', 20, false),
        (cat_seguridad, 'Linterna',                                                       NULL,                                  21, false),
        (cat_seguridad, 'Botiquín de primeros auxilios',                                  'Gasas antisépticas, tapabocas, esparadrapo, tijeras, vendas elásticas, guantes quirúrgicos, yodopovidona, curas', 22, false),
        (cat_seguridad, 'Gato',                                                           NULL,                                  23, false),

        -- VARIOS / ESTADO MECÁNICO Y ACCESORIOS (16 ítems)
        (cat_varios, 'Llantas',                          'Labrado de 2 mm de profundidad mínima y aire correcto',              24, false),
        (cat_varios, 'Batería',                          'Bornes, sin corrosión ni sulfatación',                               25, false),
        (cat_varios, 'Rines',                            'Verificar que no tengan golpes ni fisuras',                          26, false),
        (cat_varios, 'Cinturones de seguridad',          'En todos los puestos: ajuste de hebillas, estado de correas, anclajes a piso y parales, prueba de impacto', 27, false),
        (cat_varios, 'Alarma de reversa',                'Solo en vehículos operativos',                                       28, false),
        (cat_varios, 'Pito',                             NULL,                                                                 29, false),
        (cat_varios, 'Freno de emergencia',              NULL,                                                                 30, true),  -- CRÍTICO
        (cat_varios, 'Espejos laterales y cabina',       'Sin fisuras',                                                        31, false),
        (cat_varios, 'Estado carcasa luces',             NULL,                                                                 32, false),
        (cat_varios, 'Plumillas / limpiaparabrisas',     'No deben dejar marcas de agua durante el recorrido',                 33, false),
        (cat_varios, 'Aire acondicionado',               'Solo aplica si el vehículo tiene A/C',                               34, false),
        (cat_varios, 'Panorámico',                       'Sin fisuras',                                                        35, false),
        (cat_varios, 'Puertas',                          NULL,                                                                 36, false),
        (cat_varios, 'Cintas reflectivas',               NULL,                                                                 37, false),
        (cat_varios, 'Tapizado',                         NULL,                                                                 38, false),
        (cat_varios, 'Llanta de repuesto',               NULL,                                                                 39, false);
END $$;

-- Verificación rápida (ejecutar después del INSERT)
-- SELECT
--     c.nombre AS categoria,
--     COUNT(*) FILTER (WHERE i.es_critico) AS criticos,
--     COUNT(*) AS total
-- FROM items_chequeo i
-- JOIN categorias_chequeo c ON c.id = i.categoria_id
-- GROUP BY c.nombre, c.orden
-- ORDER BY c.orden;
