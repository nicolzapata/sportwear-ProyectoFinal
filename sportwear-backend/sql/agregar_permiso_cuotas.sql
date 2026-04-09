-- Agregar columna permiso_cuotas a la tabla Clientes
ALTER TABLE "Clientes" ADD COLUMN permiso_cuotas BOOLEAN DEFAULT true;

-- Verificar que se agregó
SELECT nombre, permiso_pagos, permiso_cuotas FROM "Clientes" LIMIT 5;
