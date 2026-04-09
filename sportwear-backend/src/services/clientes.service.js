// src/services/clientes.service.js
const pool = require('../config/db');

const getClientes = async () => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    ORDER BY cl.id_cliente DESC
  `);
  return result.rows;
};

const getClientesConVentas = async () => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona,
           COUNT(v.id_venta) AS total_compras,
           COALESCE(SUM(v.total::numeric), 0) AS total_gastado
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    LEFT JOIN "Ventas" v ON cl.id_cliente = v.id_cliente
    GROUP BY cl.id_cliente, b.nombre, b.comuna, b.zona
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
    SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
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
  const { nombre, tipo_doc, documento, telefono, email, id_barrio, direccion, tipo_cliente, permiso_pagos, permiso_cuotas, estado } = datos;
  const result = await pool.query(`
    UPDATE "Clientes" SET
      nombre         = COALESCE($1,  nombre),
      tipo_doc       = COALESCE($2,  tipo_doc),
      documento      = COALESCE($3,  documento),
      telefono       = COALESCE($4,  telefono),
      email          = COALESCE($5,  email),
      id_barrio      = COALESCE($6,  id_barrio),
      direccion      = COALESCE($7,  direccion),
      tipo_cliente   = COALESCE($8,  tipo_cliente),
      permiso_pagos  = COALESCE($9,  permiso_pagos),
      permiso_cuotas = COALESCE($10, permiso_cuotas),
      estado         = COALESCE($11, estado)
    WHERE id_cliente = $12 RETURNING *
  `, [nombre, tipo_doc, documento, telefono, email, id_barrio, direccion, tipo_cliente, permiso_pagos, permiso_cuotas, estado, id]);
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

module.exports = { getClientes, getClientesConVentas, getClienteById, crearCliente, actualizarCliente, toggleEstado, togglePermisoPagos, togglePermisoCuotas, actualizarMiPerfil, debugClientesVentas };