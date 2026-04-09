-- Agregar columna fecha_vencimiento a PagosAbonos
ALTER TABLE "PagosAbonos" ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
