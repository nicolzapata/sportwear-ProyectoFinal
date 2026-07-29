-- Corrige duplicados en "Barrios" (el seed se corrió 3 veces: 10 barrios reales x3 = 30 filas)
-- y agrega los barrios de Medellín que faltaban (cobertura de las 16 comunas).
BEGIN;

-- 1) Reasignar cualquier Cliente que apunte a una fila duplicada hacia la fila canónica (el id más bajo de cada nombre).
WITH canonico AS (
  SELECT nombre, MIN(id_barrio) AS id_canonico
  FROM "Barrios"
  GROUP BY nombre
)
UPDATE "Clientes" c
SET id_barrio = canonico.id_canonico
FROM "Barrios" b
JOIN canonico ON canonico.nombre = b.nombre
WHERE c.id_barrio = b.id_barrio
  AND b.id_barrio <> canonico.id_canonico;

-- 2) Eliminar las filas duplicadas (todo lo que no sea el id canónico de su nombre).
WITH canonico AS (
  SELECT nombre, MIN(id_barrio) AS id_canonico
  FROM "Barrios"
  GROUP BY nombre
)
DELETE FROM "Barrios" b
USING canonico
WHERE canonico.nombre = b.nombre
  AND b.id_barrio <> canonico.id_canonico;

-- 3) Agregar los barrios de Medellín que faltaban (una fila por barrio, por comuna).
INSERT INTO "Barrios" (nombre, zona)
SELECT nombre, zona FROM (VALUES
  -- Comuna 1 Popular
  ('Popular', 'Norte'), ('Santo Domingo Savio', 'Norte'), ('Granizal', 'Norte'), ('Moscú No.2', 'Norte'),
  -- Comuna 2 Santa Cruz
  ('Santa Cruz', 'Norte'), ('La Rosa', 'Norte'), ('Andalucía', 'Norte'), ('Villa del Socorro', 'Norte'),
  -- Comuna 3 Manrique
  ('Manrique Central', 'Norte'), ('Manrique Oriental', 'Norte'), ('Las Granjas', 'Norte'), ('La Salle', 'Norte'),
  -- Comuna 4 Aranjuez (Aranjuez ya existe)
  ('Berlín', 'Norte'), ('Moravia', 'Norte'), ('Campo Valdés', 'Norte'),
  -- Comuna 5 Castilla (Castilla ya existe)
  ('Tricentenario', 'Noroccidente'), ('Girardot', 'Noroccidente'), ('Boyacá', 'Noroccidente'),
  -- Comuna 6 Doce de Octubre
  ('Doce de Octubre', 'Noroccidente'), ('Kennedy', 'Noroccidente'), ('Pedregal', 'Noroccidente'), ('Picacho', 'Noroccidente'),
  -- Comuna 7 Robledo (Robledo ya existe)
  ('Pilarica', 'Noroccidente'), ('El Volador', 'Noroccidente'), ('Aures', 'Noroccidente'),
  -- Comuna 8 Villa Hermosa
  ('Villa Hermosa', 'Centro-Oriental'), ('Enciso', 'Centro-Oriental'), ('Sucre', 'Centro-Oriental'), ('La Ladera', 'Centro-Oriental'),
  -- Comuna 9 Buenos Aires (Buenos Aires ya existe)
  ('Miraflores', 'Centro-Oriental'), ('Loreto', 'Centro-Oriental'), ('Alejandro Echavarría', 'Centro-Oriental'),
  -- Comuna 10 La Candelaria
  ('La Candelaria', 'Centro'), ('Boston', 'Centro'), ('Prado', 'Centro'), ('Villanueva', 'Centro'),
  -- Comuna 11 Laureles-Estadio (Laureles ya existe)
  ('Estadio', 'Occidente'), ('Conquistadores', 'Occidente'), ('Bolivariana', 'Occidente'),
  -- Comuna 12 La América (La América ya existe)
  ('Santa Lucía', 'Occidente'), ('Floresta', 'Occidente'), ('Barrio Colón', 'Occidente'),
  -- Comuna 13 San Javier
  ('San Javier', 'Occidente'), ('Belencito', 'Occidente'), ('El Salado', 'Occidente'), ('Juan XXIII', 'Occidente'),
  -- Comuna 14 El Poblado (El Poblado ya existe)
  ('Manila', 'Sur'), ('Provenza', 'Sur'), ('Castropol', 'Sur'), ('Santa María de los Ángeles', 'Sur'),
  -- Comuna 15 Guayabal (Guayabal ya existe)
  ('Cristo Rey', 'Sur-Occidente'), ('Santa Fé', 'Sur-Occidente'), ('Trinidad', 'Sur-Occidente'),
  -- Comuna 16 Belén (Belén ya existe)
  ('Belén Rincón', 'Sur-Occidente'), ('La Mota', 'Sur-Occidente'), ('Las Playas', 'Sur-Occidente'), ('Fátima', 'Sur-Occidente')
) AS nuevos(nombre, zona)
WHERE NOT EXISTS (
  SELECT 1 FROM "Barrios" b WHERE b.nombre = nuevos.nombre
);

COMMIT;
