// src/services/pedidos.service.js
const pool = require('../config/db');
const { enviarCorreo } = require('./mailer.service');

const ESTADOS_VALIDOS = ['Pendiente', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];

const getPedidos = async ({ page, limit, q } = {}) => {
  const params = [];
  let busquedaSql = '';
  if (q) {
    params.push(`%${q}%`);
    busquedaSql = `WHERE c.nombre ILIKE $${params.length}`;
  }

  const paginar = page !== undefined;
  let limitOffsetSql = '';
  if (paginar) {
    const pagina = Math.max(parseInt(page) || 1, 1);
    const limite = Math.max(parseInt(limit) || 10, 1);
    const offset = (pagina - 1) * limite;
    params.push(limite, offset);
    limitOffsetSql = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const result = await pool.query(`
    SELECT p.id_pedido, p.id_venta, p.estado_pedido, p.fecha_actualizacion,
           v.total, v.fecha AS fecha_venta, v.direccion_entrega, v.estado AS estado_venta,
           c.nombre AS cliente, c.email AS cliente_email
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "Pedidos" p
    JOIN "Ventas" v    ON p.id_venta = v.id_venta
    JOIN "Clientes" c  ON v.id_cliente = c.id_cliente
    ${busquedaSql}
    ORDER BY p.fecha_actualizacion DESC
    ${limitOffsetSql}
  `, params);

  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const filas = result.rows.map(({ total_count, ...r }) => r);

  const ids = filas.map(p => p.id_venta);
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
  const data = filas.map(p => ({ ...p, items: detalles.filter(d => d.id_venta === p.id_venta) }));

  if (!paginar) return data;
  return { data, total };
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

// ── NUEVO: contenido del correo según el nuevo estado ──
const MENSAJES_ESTADO = {
  'En preparación': { titulo: 'Tu pedido está en preparación',  cuerpo: 'Ya estamos alistando tu pedido para el envío.' },
  'Enviado':         { titulo: 'Tu pedido fue enviado',          cuerpo: 'Tu pedido va en camino. Pronto lo tendrás contigo.' },
  'Entregado':        { titulo: 'Tu pedido fue entregado',        cuerpo: '¡Tu pedido llegó a su destino! Gracias por tu compra.' },
  'Cancelado':        { titulo: 'Tu pedido fue cancelado',        cuerpo: 'Tu pedido ha sido cancelado. Si tienes dudas, contáctanos.' },
};

// ── NUEVO: notifica al cliente por correo cuando cambia el estado de su pedido ──
// Fire-and-forget: nunca bloquea ni rompe el flujo si falla (enviarCorreo ya maneja sus propios errores).
const notificarCambioEstado = async (id_pedido, nuevoEstado) => {
  const mensaje = MENSAJES_ESTADO[nuevoEstado];
  if (!mensaje) return; // sin plantilla para ese estado (ej. "Pendiente" no notifica)

  const clienteRes = await pool.query(`
    SELECT c.nombre, c.email
    FROM "Pedidos" p
    JOIN "Ventas" v   ON p.id_venta = v.id_venta
    JOIN "Clientes" c ON v.id_cliente = c.id_cliente
    WHERE p.id_pedido = $1
  `, [id_pedido]);

  const cliente = clienteRes.rows[0];
  if (!cliente?.email) return;

  enviarCorreo({
    to: cliente.email,
    subject: `${mensaje.titulo} — Pedido #${id_pedido}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#1a1a1a;">${mensaje.titulo}</h2>
        <p>Hola ${cliente.nombre || ''},</p>
        <p>${mensaje.cuerpo}</p>
        <p style="color:#888; font-size: 13px;">Pedido #${id_pedido} · Nuevo estado: <b>${nuevoEstado}</b></p>
        <hr style="border:none; border-top:1px solid #eee; margin: 20px 0;" />
        <p style="color:#aaa; font-size: 12px;">DVNA SportWear</p>
      </div>
    `,
  });
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

    // ── NUEVO: notificar al cliente (después del COMMIT, sin bloquear la respuesta) ──
    notificarCambioEstado(id_pedido, nuevoEstado);

    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getPedidos, getPedidoById, getHistorial, cambiarEstadoPedido, ESTADOS_VALIDOS };