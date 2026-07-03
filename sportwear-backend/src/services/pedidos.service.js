// src/services/pedidos.service.js
const pool = require('../config/db');

const ESTADOS_VALIDOS = ['Pendiente', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];

const getPedidos = async () => {
  const result = await pool.query(`
    SELECT p.id_pedido, p.id_venta, p.estado_pedido, p.fecha_actualizacion,
           v.total, v.fecha AS fecha_venta, v.direccion_entrega, v.estado AS estado_venta,
           c.nombre AS cliente, c.email AS cliente_email
    FROM "Pedidos" p
    JOIN "Ventas" v    ON p.id_venta = v.id_venta
    JOIN "Clientes" c  ON v.id_cliente = c.id_cliente
    ORDER BY p.fecha_actualizacion DESC
  `);
  const ids = result.rows.map(p => p.id_venta);
  let detalles = [];
  if (ids.length) {
    const det = await pool.query(`
      SELECT dv.id_venta, dv.cantidad, p.nombre AS producto, pv.talla
      FROM "DetalleVenta" dv
      JOIN "Productos" p ON dv.id_producto = p.id_producto
      LEFT JOIN "ProductoVariantes" pv ON dv.id_variante = pv.id_variante
      WHERE dv.id_venta = ANY($1::int[])
    `, [ids]);
    detalles = det.rows;
  }
  return result.rows.map(p => ({ ...p, items: detalles.filter(d => d.id_venta === p.id_venta) }));
};

const getPedidoById = async (id_pedido) => {
  const result = await pool.query(`
    SELECT p.id_pedido, p.id_venta, p.estado_pedido, p.fecha_actualizacion,
           v.total, v.fecha AS fecha_venta, v.direccion_entrega, v.estado AS estado_venta,
           c.nombre AS cliente, c.email AS cliente_email
    FROM "Pedidos" p
    JOIN "Ventas" v    ON p.id_venta = v.id_venta
    JOIN "Clientes" c  ON v.id_cliente = c.id_cliente
    WHERE p.id_pedido = $1
  `, [id_pedido]);
  if (!result.rows.length) throw { status: 404, message: 'Pedido no encontrado' };

  const det = await pool.query(`
    SELECT dv.cantidad, p.nombre AS producto, pv.talla
    FROM "DetalleVenta" dv
    JOIN "Productos" p ON dv.id_producto = p.id_producto
    LEFT JOIN "ProductoVariantes" pv ON dv.id_variante = pv.id_variante
    WHERE dv.id_venta = $1
  `, [result.rows[0].id_venta]);

  const historial = await pool.query(`
    SELECT h.estado, h.fecha, u.nombre AS usuario
    FROM "PedidosHistorial" h
    LEFT JOIN "Usuarios" u ON h.id_usuario = u.id_usuario
    WHERE h.id_pedido = $1
    ORDER BY h.fecha ASC
  `, [id_pedido]);

  return { ...result.rows[0], items: det.rows, historial: historial.rows };
};

const getHistorial = async (id_pedido) => {
  const result = await pool.query(`
    SELECT h.estado, h.fecha, u.nombre AS usuario
    FROM "PedidosHistorial" h
    LEFT JOIN "Usuarios" u ON h.id_usuario = u.id_usuario
    WHERE h.id_pedido = $1
    ORDER BY h.fecha ASC
  `, [id_pedido]);
  return result.rows;
};

// Transiciones permitidas (evita saltos ilógicos, ej. Pendiente -> Entregado directo)
const TRANSICIONES = {
  'Pendiente':      ['En preparación', 'Cancelado'],
  'En preparación': ['Enviado', 'Cancelado'],
  'Enviado':        ['Entregado', 'Cancelado'],
  'Entregado':      [],
  'Cancelado':      [],
};

const cambiarEstadoPedido = async (id_pedido, nuevoEstado, id_usuario) => {
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    throw { status: 400, message: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}` };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(
      `SELECT * FROM "Pedidos" WHERE id_pedido=$1 FOR UPDATE`,
      [id_pedido]
    );
    if (!actual.rows.length) throw { status: 404, message: 'Pedido no encontrado' };
    const estadoActual = actual.rows[0].estado_pedido;

    const permitidos = TRANSICIONES[estadoActual] || [];
    if (!permitidos.includes(nuevoEstado)) {
      throw { status: 400, message: `No se puede pasar de "${estadoActual}" a "${nuevoEstado}".` };
    }

    const result = await client.query(`
      UPDATE "Pedidos" SET estado_pedido=$1, fecha_actualizacion=now()
      WHERE id_pedido=$2 RETURNING *
    `, [nuevoEstado, id_pedido]);

    await client.query(`
      INSERT INTO "PedidosHistorial" (id_pedido, estado, fecha, id_usuario)
      VALUES ($1,$2,now(),$3)
    `, [id_pedido, nuevoEstado, id_usuario || null]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getPedidos, getPedidoById, getHistorial, cambiarEstadoPedido, ESTADOS_VALIDOS };