// src/services/clientes.service.js
const pool = require('../config/db');
const { validarCamposNumericos } = require('../../../sportwear/src/utils/validarNumerico');

const getClientes = async () => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    ORDER BY cl.id_cliente DESC
  `);
  return result.rows;
};

const getClientesConVentas = async () => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona,
           COUNT(v.id_venta) AS total_compras,
           COALESCE(SUM(v.total::numeric), 0) AS total_gastado
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    LEFT JOIN "Ventas" v ON cl.id_cliente = v.id_cliente AND v.estado NOT IN ('Abandonado', 'Pendiente')
    GROUP BY cl.id_cliente, b.nombre, b.zona
    HAVING COUNT(v.id_venta) > 0
    ORDER BY total_gastado DESC
  `);
  return result.rows;
};

const debugClientesVentas = async () => {
  const clientes = await pool.query(`SELECT id_cliente, nombre, documento FROM "Clientes" ORDER BY id_cliente`);
  const ventas = await pool.query(`SELECT id_venta, id_cliente, total, fecha FROM "Ventas" ORDER BY id_venta DESC LIMIT 20`);
  return { clientes: clientes.rows, ventas: ventas.rows };
};

const getClienteById = async (id) => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    WHERE cl.id_cliente = $1
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};

const crearCliente = async (datos) => {
  const { nombre, tipo_doc, documento, telefono, email, id_barrio, direccion, tipo_cliente, permiso_pagos, permiso_cuotas, estado } = datos;
  if (!nombre || !documento) throw { status: 400, message: 'Nombre y documento son requeridos' };
  validarCamposNumericos({ documento, teléfono: telefono });

  const result = await pool.query(`
    INSERT INTO "Clientes"
      (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion, tipo_cliente, permiso_pagos, permiso_cuotas, estado)
    VALUES ($1,$2,$3,$4,$5,'Medellín',$6,$7,$8,$9,$10,$11) RETURNING *
  `, [
    nombre, tipo_doc || 'CC', documento, telefono || null, email || null,
    id_barrio || null, direccion || null, tipo_cliente || 'Regular',
    permiso_pagos !== undefined ? permiso_pagos : true,
    permiso_cuotas !== undefined ? permiso_cuotas : true,
    estado || 'Activo',
  ]);
  return result.rows[0];
};

const actualizarCliente = async (id, datos) => {
  // La identificación (tipo_doc/documento) y el email no se pueden modificar una vez creados.
  const { nombre, telefono, id_barrio, direccion, tipo_cliente, permiso_pagos, permiso_cuotas, estado } = datos;
  validarCamposNumericos({ teléfono: telefono });
  const campos = [];
  const valores = [];
  let idx = 1;
  if (nombre !== undefined) { campos.push(`nombre = $${idx++}`); valores.push(nombre); }
  if (telefono !== undefined) { campos.push(`telefono = $${idx++}`); valores.push(telefono); }
  if (id_barrio !== undefined) { campos.push(`id_barrio = $${idx++}`); valores.push(id_barrio); }
  if (direccion !== undefined) { campos.push(`direccion = $${idx++}`); valores.push(direccion); }
  if (tipo_cliente !== undefined) { campos.push(`tipo_cliente = $${idx++}`); valores.push(tipo_cliente); }
  if (permiso_pagos !== undefined) { campos.push(`permiso_pagos = $${idx++}`); valores.push(permiso_pagos); }
  if (permiso_cuotas !== undefined) { campos.push(`permiso_cuotas = $${idx++}`); valores.push(permiso_cuotas); }
  if (estado !== undefined) { campos.push(`estado = $${idx++}`); valores.push(estado); }
  if (campos.length === 0) return { id_cliente: id };
  valores.push(id);
  const query = `UPDATE "Clientes" SET ${campos.join(', ')} WHERE id_cliente = $${idx} RETURNING *`;
  const result = await pool.query(query, valores);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Clientes"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_cliente = $1 RETURNING id_cliente, estado
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const togglePermisoPagos = async (id) => {
  const result = await pool.query(`
    UPDATE "Clientes" SET permiso_pagos = NOT permiso_pagos
    WHERE id_cliente = $1 RETURNING id_cliente, permiso_pagos
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const togglePermisoCuotas = async (id) => {
  const result = await pool.query(`
    UPDATE "Clientes" SET permiso_cuotas = NOT permiso_cuotas
    WHERE id_cliente = $1 RETURNING id_cliente, permiso_cuotas
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const actualizarMiPerfil = async (id, datos) => {
  const { nombre, telefono, id_barrio, direccion, ciudad } = datos;
  validarCamposNumericos({ teléfono: telefono });
  const result = await pool.query(`
    UPDATE "Clientes" SET
      nombre    = COALESCE($1, nombre),
      telefono  = COALESCE($2, telefono),
      id_barrio = COALESCE($3, id_barrio),
      direccion = COALESCE($4, direccion),
      ciudad    = COALESCE($5, ciudad)
    WHERE id_cliente = $6 RETURNING *
  `, [nombre, telefono, id_barrio, direccion, ciudad, id]);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};
const getClientesRolCliente = async () => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona
    FROM "Clientes" cl
    INNER JOIN "Usuarios" u ON cl.id_cliente = u.id_cliente
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    WHERE u.id_rol = 2
    ORDER BY cl.id_cliente DESC
  `);
  return result.rows;
};

module.exports = { getClientes, getClientesConVentas, getClienteById, crearCliente, actualizarCliente, toggleEstado, togglePermisoPagos, togglePermisoCuotas, actualizarMiPerfil, debugClientesVentas, getClientesRolCliente };