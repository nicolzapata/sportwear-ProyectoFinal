// src/services/pagos.service.js
const pool = require('../config/db');
const { enviarCorreo, formatearFecha, filasDatos } = require('./mailer.service');
const { notificarComprobantePago } = require('./ventas.service');

// ── NUEVO: mismo mínimo que en ventas.service.js — un abono no debería
// poder registrarse por $1 o cualquier valor sin sentido. ──
const MONTO_MINIMO_ABONO = 20000;

const getPagos = async ({ page, limit, q } = {}) => {
  const params = [];
  let busquedaSql = '';
  if (q) {
    params.push(`%${q}%`);
    busquedaSql = `AND (c.nombre ILIKE $${params.length} OR CAST(pa.id_pago AS TEXT) = $${params.length + 1})`;
    params.push(q);
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
    SELECT pa.*, v.id_cliente, c.nombre AS cliente
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "PagosAbonos" pa
    JOIN "Ventas"   v ON pa.id_venta=v.id_venta
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE 1=1 ${busquedaSql}
    ORDER BY pa.id_pago DESC
    ${limitOffsetSql}
  `, params);

  if (!paginar) return result.rows;
  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const data = result.rows.map(({ total_count, ...r }) => r);
  return { data, total };
};

const getPagoById = async (id) => {
  const result = await pool.query(`
    SELECT pa.*, c.nombre AS cliente
    FROM "PagosAbonos" pa
    JOIN "Ventas"   v ON pa.id_venta=v.id_venta
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE pa.id_pago=$1
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

// Suma de abonos/pagos ya confirmados (dinero efectivamente recibido) para una venta.
const getSaldoPendiente = async (client, id_venta) => {
  const venta = await client.query(`SELECT total FROM "Ventas" WHERE id_venta=$1`, [id_venta]);
  if (!venta.rows.length) throw { status: 404, message: 'Venta no encontrada' };
  const pagado = await client.query(
    `SELECT COALESCE(SUM(monto), 0) AS total_pagado FROM "PagosAbonos" WHERE id_venta=$1 AND estado='Confirmado'`,
    [id_venta]
  );
  const total = Number(venta.rows[0].total);
  const totalPagado = Number(pagado.rows[0].total_pagado);
  return { total, totalPagado, saldo: total - totalPagado };
};

// ── NUEVO: notificación simple de abono parcial. Acepta "pool" o un "client" de transacción
// (ambos tienen `.query`) — se usa siempre DESPUÉS del COMMIT, con `pool`. ──
const notificarAbono = async (db, id_venta, monto) => {
  try {
    const info = await db.query(`
      SELECT c.nombre, c.email, c.documento
      FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente = c.id_cliente
      WHERE v.id_venta = $1
    `, [id_venta]);
    if (!info.rows.length || !info.rows[0].email) return;
    const { nombre, email, documento } = info.rows[0];
    const { saldo } = await getSaldoPendiente(db, id_venta);

    enviarCorreo({
      to: email,
      subject: `Pago registrado — Pedido V-${String(id_venta).padStart(3, '0')}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#b49780">DVNA SportWear</h2>
          <p>Hola ${nombre},</p>
          <p>Registramos un pago de <strong>$${Number(monto).toLocaleString('es-CO')}</strong> para tu pedido <strong>V-${String(id_venta).padStart(3, '0')}</strong>.</p>
          ${filasDatos([
            ['Fecha', formatearFecha(new Date())],
            ['Nombre del cliente', nombre],
            ['Documento', documento],
          ])}
          <p>Saldo pendiente actual: <strong>$${saldo.toLocaleString('es-CO')}</strong>.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Error notificando abono:', err.message);
  }
};

// ── NUEVO (Inventario): si el stock de esta venta todavía no se había
// descontado (pedidos pagados por transferencia/tarjeta, que no descuentan
// stock al crearse sino hasta que se confirma el pago), se descuenta ahora,
// línea por línea, dentro de la misma transacción, y se marca para no
// volver a descontarlo. Los pagos contraentrega ya llegan con
// stock_descontado=true desde que se creó el pedido, así que aquí no hacen nada. ──
const descontarStockSiHaceFalta = async (client, id_venta) => {
  const ventaRes = await client.query(
    `SELECT stock_descontado FROM "Ventas" WHERE id_venta=$1`,
    [id_venta]
  );
  if (!ventaRes.rows.length || ventaRes.rows[0].stock_descontado) return;

  const detalle = await client.query(
    `SELECT id_variante, cantidad FROM "DetalleVenta" WHERE id_venta=$1 AND id_variante IS NOT NULL`,
    [id_venta]
  );
  for (const item of detalle.rows) {
    await client.query(
      `UPDATE "ProductoVariantes" SET stock=stock-$1 WHERE id_variante=$2`,
      [item.cantidad, item.id_variante]
    );
  }
  await client.query(`UPDATE "Ventas" SET stock_descontado=true WHERE id_venta=$1`, [id_venta]);
};

// ── NUEVO: dentro de la transacción, solo evalúa y marca "Pagado" si corresponde,
// y descuenta el stock diferido si hacía falta — NO envía nada todavía (el envío
// se hace después del COMMIT, en cada punto de llamada, para no leer datos sin
// confirmar ni disparar correos si la transacción termina en ROLLBACK). ──
const evaluarYMarcarPagada = async (client, id_venta) => {
  const { total, totalPagado } = await getSaldoPendiente(client, id_venta);
  if (totalPagado >= total) {
    await client.query(
      `UPDATE "Ventas" SET estado='Pagado' WHERE id_venta=$1 AND estado != 'Anulado'`,
      [id_venta]
    );
    // ── NUEVO: si la venta ya quedó cubierta, cualquier otro registro de
    // PagosAbonos que siga "Pendiente" para esta misma venta ya no
    // representa nada por cobrar — se cierra automáticamente para que
    // Pagos y Pedidos nunca se contradigan (uno diciendo "pagado" y el
    // otro mostrando todavía un pendiente huérfano de la misma venta). ──
    await client.query(
      `UPDATE "PagosAbonos" SET estado='Anulado' WHERE id_venta=$1 AND estado='Pendiente'`,
      [id_venta]
    );
    await descontarStockSiHaceFalta(client, id_venta);

    // ── NUEVO: en contraentrega, el pago se cobra EN el momento de la
    // entrega — son el mismo evento físico. Si esta venta es contraentrega,
    // confirmar el pago completo avanza el pedido a "Entregado" solo, sin
    // que el admin tenga que repetir el mismo paso a mano en Pedidos. ──
    const ventaRes = await client.query(`SELECT metodo_pago FROM "Ventas" WHERE id_venta=$1`, [id_venta]);
    if (ventaRes.rows[0]?.metodo_pago === 'Efectivo') {
      const pedidoRes = await client.query(
        `SELECT id_pedido, estado_pedido FROM "Pedidos" WHERE id_venta=$1`,
        [id_venta]
      );
      const pedido = pedidoRes.rows[0];
      if (pedido && !['Entregado', 'Cancelado'].includes(pedido.estado_pedido)) {
        await client.query(
          `UPDATE "Pedidos" SET estado_pedido='Entregado', fecha_actualizacion=now() WHERE id_pedido=$1`,
          [pedido.id_pedido]
        );
        await client.query(
          `INSERT INTO "PedidosHistorial" (id_pedido, estado, fecha) VALUES ($1,'Entregado',now())`,
          [pedido.id_pedido]
        );
      }
    }

    return 'completo';
  }
  return 'parcial';
};

// Dispara la notificación correcta después de que la transacción ya quedó confirmada.
const notificarSegunResultado = (tipo, id_venta, monto) => {
  if (tipo === 'completo') notificarComprobantePago(id_venta);
  else if (tipo === 'parcial') notificarAbono(pool, id_venta, monto);
};

const crearPago = async (datos) => {
  const { id_venta, monto, tipo, metodo, referencia_pago, estado, fecha } = datos;
  if (!id_venta || !monto) throw { status: 400, message: 'id_venta y monto son requeridos' };
  if (Number(monto) <= 0) throw { status: 400, message: 'El monto debe ser mayor a cero' };

  const { saldo } = await getSaldoPendiente(pool, id_venta);
  if (Number(monto) > saldo)
    throw { status: 400, message: `El monto ($${Number(monto).toLocaleString('es-CO')}) supera el saldo pendiente ($${saldo.toLocaleString('es-CO')}).` };

  // ── NUEVO: monto mínimo por abono — salvo que este pago liquide
  // exactamente lo que queda por pagar (no tendría sentido exigir un mínimo
  // más alto que el propio saldo restante, ej. últimos $15.000 de una deuda). ──
  const liquidaSaldoCompleto = Math.abs(Number(monto) - saldo) < 0.01;
  if (Number(monto) < MONTO_MINIMO_ABONO && !liquidaSaldoCompleto) {
    throw { status: 400, message: `El monto mínimo para un abono es de $${MONTO_MINIMO_ABONO.toLocaleString('es-CO')} (a menos que sea el pago que liquida el saldo restante).` };
  }

  const client = await pool.connect();
  let tipoNotificacion = null;
  try {
    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, referencia_pago, estado, fecha)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [id_venta, monto, tipo || 'Pago completo', metodo || 'Efectivo',
        referencia_pago || null, estado || 'Pendiente', fecha || new Date()]);

    const pago = result.rows[0];

    if (pago.estado === 'Confirmado') {
      tipoNotificacion = await evaluarYMarcarPagada(client, id_venta);
    }

    await client.query('COMMIT');

    // ── Se envía SOLO después del COMMIT, con la transacción ya confirmada ──
    if (tipoNotificacion) notificarSegunResultado(tipoNotificacion, id_venta, monto);

    return pago;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const cambiarEstado = async (id, estado) => {
  if (!estado) throw { status: 400, message: 'Estado requerido' };

  const client = await pool.connect();
  let tipoNotificacion = null, idVentaNotif = null, montoNotif = null;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE "PagosAbonos" SET estado=$1 WHERE id_pago=$2 RETURNING *`,
      [estado, id]
    );
    if (!result.rows.length) throw { status: 404, message: 'No encontrado' };

    // Al confirmar un pago, si con este ya se cubre el total de la venta, se marca "Pagado".
    if (estado === 'Confirmado') {
      idVentaNotif = result.rows[0].id_venta;
      montoNotif = result.rows[0].monto;
      tipoNotificacion = await evaluarYMarcarPagada(client, idVentaNotif);
    }

    await client.query('COMMIT');

    if (tipoNotificacion) notificarSegunResultado(tipoNotificacion, idVentaNotif, montoNotif);

    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const pagarCuota = async (id_pago, { metodo, referencia_pago }) => {
  const numId = parseInt(id_pago);
  const client = await pool.connect();
  let tipoNotificacion = null, idVentaNotif = null, montoNotif = null;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE "PagosAbonos" SET estado='Confirmado', metodo=$1, referencia_pago=$2, fecha=NOW() WHERE id_pago=$3 AND estado='Pendiente' RETURNING *`,
      [metodo || 'Efectivo', referencia_pago || null, numId]
    );
    if (!result.rows.length) throw { status: 404, message: 'Cuota no encontrada o ya pagada' };

    idVentaNotif = result.rows[0].id_venta;
    montoNotif = result.rows[0].monto;
    tipoNotificacion = await evaluarYMarcarPagada(client, idVentaNotif);

    await client.query('COMMIT');

    if (tipoNotificacion) notificarSegunResultado(tipoNotificacion, idVentaNotif, montoNotif);

    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const pagarTotal = async (id_venta, { metodo, referencia_pago }) => {
  const client = await pool.connect();
  let tipoNotificacion = null, montoNotif = null;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE "PagosAbonos" SET estado='Confirmado', metodo=$1, referencia_pago=$2, fecha=NOW() WHERE id_venta=$3 AND estado='Pendiente' RETURNING *`,
      [metodo || 'Efectivo', referencia_pago || null, id_venta]
    );
    if (result.rows.length) {
      montoNotif = result.rows.reduce((acc, r) => acc + Number(r.monto), 0);
      tipoNotificacion = await evaluarYMarcarPagada(client, id_venta);
    }

    await client.query('COMMIT');

    if (tipoNotificacion) notificarSegunResultado(tipoNotificacion, id_venta, montoNotif);

    return result.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getPagos, getPagoById, crearPago, cambiarEstado, pagarCuota, pagarTotal };