-- Agregar columna tipo_pago a la tabla Ventas
ALTER TABLE "Ventas" ADD COLUMN tipo_pago VARCHAR(20) DEFAULT 'completo';

-- Verificar
SELECT id_venta, tipo_pago FROM "Ventas" LIMIT 5;
