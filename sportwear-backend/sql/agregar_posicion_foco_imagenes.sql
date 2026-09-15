-- Permite guardar qué parte de una foto del hero (Catálogo admin →
-- Contenido del inicio) se debe mostrar cuando la imagen se recorta para
-- llenar el fondo (background-position en CSS, formato "X% Y%"). Antes
-- siempre se veía el centro de la foto sin poder ajustarlo.

-- '50% 25%' (no '50% 50%') para no cambiar el encuadre de las fotos que ya
-- estaban subidas: era el valor fijo que usaba el CSS del hero antes de
-- este ajuste (ver Catalogo.hero.css, .nov-hero-slide) — la mayoría de las
-- fotos verticales tienen la cara/torso en el tercio superior.
ALTER TABLE "Imagenes" ADD COLUMN IF NOT EXISTS posicion_foco TEXT NOT NULL DEFAULT '50% 25%';

-- Verificación:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Imagenes' AND column_name = 'posicion_foco';
