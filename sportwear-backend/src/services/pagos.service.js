// src/services/pagos.service.js
const pool = require('../config/db');
const { enviarCorreo, formatearFecha, filasDatos } = require('./mailer.service');
const { notificarComprobantePago } = require('./ventas.service');
// ── CORREGIDO: "evaluarYMarcarPagada", "descontarStockSiHaceFalta" y
// "getSaldoPendiente" vivían aquí definidas a mano, y ventas.service.js
// tenía su PROPIA reimplementación parecida-pero-distinta para el mismo
// problema. Ahora ambas usan la misma versión, importada desde
// pagoLogica.service.js — una sola fuente de verdad. ──
const {
  getSaldoPendiente, evaluarYMarcarPagada,
  MONTO_MINIMO_ABONO, mensajeMontoMinimo,
} = require('./pagoLogica.service');

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

  // ── NUEVO: la tabla no debe mostrar TODAS las cuotas pendientes de una
  // venta a cuotas de una — solo las que ya se resolvieron (Confirmado o
  // Anulado) más una ventana de las próximas 3 cuotas Pendientes. Las que
  // van más adelante quedan ocultas hasta que las anteriores se resuelvan.
  // Se calcula con una sub-consulta que trae, por venta, la cuota pendiente
  // más próxima (el número de cuota más bajo aún Pendiente). ──
  const result = await pool.query(`
    WITH primera_pendiente AS (
      SELECT id_venta, MIN(num_cuota) AS min_pendiente
      FROM "PagosAbonos"
      WHERE estado = 'Pendiente' AND num_cuota IS NOT NULL
      GROUP BY id_venta
    )
    SELECT pa.*, v.id_cliente, c.nombre AS cliente
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "PagosAbonos" pa
    JOIN "Ventas"   v ON pa.id_venta=v.id_venta
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    LEFT JOIN primera_pendiente pp ON pp.id_venta = pa.id_venta
    WHERE (
      pa.estado != 'Pendiente'
      OR pa.num_cuota IS NULL
      OR pa.num_cuota < COALESCE(pp.min_pendiente, 0) + 3
    )
    ${busquedaSql}
    ORDER BY pa.id_venta DESC, pa.num_cuota ASC NULLS LAST
    ${limitOffsetSql}
  `, params);

  if (!paginar) return result.rows;
  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const data = result.rows.map(({ total_count, ...r }) => r);
  return { data, total };
};

// ── NUEVO: a diferencia de getPagos (que solo muestra una ventana de las
// próximas cuotas pendientes), esto trae TODAS las cuotas de una venta
// puntual, pasadas y futuras — para el calendario completo en el modal de
// detalle de un pago. ──
const getPagosPorVenta = async (id_venta) => {
  const result = await pool.query(`
    SELECT pa.* FROM "PagosAbonos" pa
    WHERE pa.id_venta = $1
    ORDER BY pa.num_cuota ASC NULLS LAST, pa.id_pago ASC
  `, [id_venta]);
  return result.rows;
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

// ── notificación simple de abono parcial. Acepta "pool" o un "client" de
// transacción (ambos tienen `.query`) — se usa siempre DESPUÉS del COMMIT,
// con `pool`. ──
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

  // ── monto mínimo por abono — dinámico: si el saldo restante es menor al
  // mínimo estándar, el mínimo efectivo pasa a ser el saldo mismo (no
  // tendría sentido exigir un mínimo más alto que la propia deuda), salvo
  // que este pago liquide exactamente lo que queda por pagar. ──
  const liquidaSaldoCompleto = Math.abs(Number(monto) - saldo) < 0.01;
  if (Number(monto) < MONTO_MINIMO_ABONO && !liquidaSaldoCompleto) {
    throw { status: 400, message: mensajeMontoMinimo(saldo) };
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

module.exports = { getPagos, getPagoById, getPagosPorVenta, crearPago, cambiarEstado, pagarCuota, pagarTotal };