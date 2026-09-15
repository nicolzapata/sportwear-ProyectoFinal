-- Permite que "Imagenes" acepte tipo_referencia = 'HomeVideoFoto' — la foto
-- que se muestra al lado del video del catálogo público (Catálogo admin →
-- Contenido del inicio), para que el video no quede solo/flotando en medio
-- de una franja vacía cuando es vertical.

ALTER TABLE "Imagenes" DROP CONSTRAINT IF EXISTS "Imagenes_tipo_referencia_check";
ALTER TABLE "Imagenes" ADD CONSTRAINT "Imagenes_tipo_referencia_check"
  CHECK (tipo_referencia IN ('Producto', 'Home', 'HomeVideo', 'HomeVideoFoto'));

-- Verificación:
SELECT conname, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conname = 'Imagenes_tipo_referencia_check';
