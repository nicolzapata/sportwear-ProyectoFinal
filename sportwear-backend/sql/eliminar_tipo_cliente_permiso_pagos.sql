-- Elimina tipo_cliente y permiso_pagos de la tabla Clientes (ya no se usan en la app).
-- Se respalda el valor de ambas columnas antes de eliminarlas, por si se necesita consultar
-- después. También se agrega UNIQUE en email (ya lo tenía documento) para reforzar a nivel
-- de BD la validación de correo duplicado que ahora hace la aplicación.

CREATE TABLE "Clientes_backup_tipo_cliente_permiso_pagos" AS
  SELECT id_cliente, tipo_cliente, permiso_pagos, now() AS backup_fecha FROM "Clientes";

ALTER TABLE "Clientes" DROP COLUMN tipo_cliente;
ALTER TABLE "Clientes" DROP COLUMN permiso_pagos;
ALTER TABLE "Clientes" ADD CONSTRAINT clientes_email_key UNIQUE (email);

-- Verificar
SELECT column_name FROM information_schema.columns WHERE table_name='Clientes' ORDER BY ordinal_position;
SELECT COUNT(*) FROM "Clientes";
