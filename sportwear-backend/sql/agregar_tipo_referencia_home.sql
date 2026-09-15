-- Permite que "Imagenes" acepte tipo_referencia = 'Home' y 'HomeVideo'
-- (usados por el panel de Catálogo admin → Contenido del inicio para las
-- fotos del hero y el video del catálogo público), además de 'Producto'.
--
-- 1) Primero corré esta consulta para ver la definición actual del
--    constraint (y confirmar qué valores acepta hoy):
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conname = 'Imagenes_tipo_referencia_check';

-- 2) Si el resultado de arriba muestra que solo permite 'Producto' (o
--    cualquier lista que no incluya 'Home'/'HomeVideo'), corré esto para
--    reemplazarlo por uno que sí los incluya:
ALTER TABLE "Imagenes" DROP CONSTRAINT IF EXISTS "Imagenes_tipo_referencia_check";
ALTER TABLE "Imagenes" ADD CONSTRAINT "Imagenes_tipo_referencia_check"
  CHECK (tipo_referencia IN ('Producto', 'Home', 'HomeVideo'));

-- 3) Verificación:
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conname = 'Imagenes_tipo_referencia_check';
