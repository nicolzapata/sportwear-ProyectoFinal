-- Agregar columnas para cuotas (ejecutar en la base de datos)
ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS tipo_pago VARCHAR(20) DEFAULT 'completo';
ALTER TABLE "Ventas" ADD COLUMN IF NOT EXISTS num_cuotas INTEGER;
ALTER TABLE "PagosAbonos" ADD COLUMN IF NOT EXISTS num_cuota INTEGER;

-- Verificar estructura
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'Ventas' AND column_name IN ('tipo_pago', 'num_cuotas');
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'PagosAbonos' AND column_name = 'num_cuota';
