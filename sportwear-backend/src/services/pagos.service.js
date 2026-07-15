// src/services/pagos.service.js
const pool = require('../config/db');
const { enviarCorreo } = require('./mailer.service');

const getPagos = async () => {
  const result = await pool.query(`
    SELECT pa.*, v.id_cliente, c.nombre AS cliente
    FROM "PagosAbonos" pa
    JOIN "Ventas"   v ON pa.id_venta=v.id_venta
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    ORDER BY pa.id_pago DESC
  `);
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

const notificarAbono = async (client, id_venta, monto) => {
  try {
    const info = await client.query(`
      SELECT c.nombre, c.email
      FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente = c.id_cliente
      WHERE v.id_venta = $1
    `, [id_venta]);
    if (!info.rows.length || !info.rows[0].email) return;
    const { nombre, email } = info.rows[0];
    const { saldo } = await getSaldoPendiente(client, id_venta);

    enviarCorreo({
      to: email,
      subject: `Pago registrado — Pedido V-${String(id_venta).padStart(3, '0')}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#b49780">DVNA SportWear</h2>
          <p>Hola ${nombre},</p>
          <p>Registramos un pago de <strong>$${Number(monto).toLocaleString('es-CO')}</strong> para tu pedido <strong>V-${String(id_venta).padStart(3, '0')}</strong>.</p>
          <p>Saldo pendiente actual: <strong>$${saldo.toLocaleString('es-CO')}</strong>.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Error notificando abono:', err.message);
  }
};

const crearPago = async (datos) => {
  const { id_venta, monto, tipo, metodo, referencia_pago, estado, fecha } = datos;
  if (!id_venta || !monto) throw { status: 400, message: 'id_venta y monto son requeridos' };
  if (Number(monto) <= 0) throw { status: 400, message: 'El monto debe ser mayor a cero' };

  const { saldo } = await getSaldoPendiente(pool, id_venta);
  if (Number(monto) > saldo)
    throw { status: 400, message: `El monto ($${Number(monto).toLocaleString('es-CO')}) supera el saldo pendiente ($${saldo.toLocaleString('es-CO')}).` };

  const result = await pool.query(`
    INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, referencia_pago, estado, fecha)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `, [id_venta, monto, tipo || 'Pago completo', metodo || 'Efectivo',
      referencia_pago || null, estado || 'Pendiente', fecha || new Date()]);
  return result.rows[0];
};

const cambiarEstado = async (id, estado) => {
  if (!estado) throw { status: 400, message: 'Estado requerido' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE "PagosAbonos" SET estado=$1 WHERE id_pago=$2 RETURNING *`,
      [estado, id]
    );
    if (!result.rows.length) throw { status: 404, message: 'No encontrado' };

    // Al confirmar un pago, si con este ya se cubre el total de la venta, se marca "Pagado".
    if (estado === 'Confirmado') {
      const { id_venta } = result.rows[0];
      const { total, totalPagado } = await getSaldoPendiente(client, id_venta);
      if (totalPagado >= total) {
        await client.query(
          `UPDATE "Ventas" SET estado='Pagado' WHERE id_venta=$1 AND estado NOT IN ('Anulado', 'Pagado')`,
          [id_venta]
        );
      }
      await notificarAbono(client, id_venta, result.rows[0].monto);
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const marcarVentaPagadaSiCompleta = async (client, id_venta) => {
  const { total, totalPagado } = await getSaldoPendiente(client, id_venta);
  if (totalPagado >= total) {
    await client.query(
      `UPDATE "Ventas" SET estado='Pagado' WHERE id_venta=$1 AND estado NOT IN ('Anulado', 'Pagado')`,
      [id_venta]
    );
  }
};

const pagarCuota = async (id_pago, { metodo, referencia_pago }) => {
  const numId = parseInt(id_pago);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE "PagosAbonos" SET estado='Confirmado', metodo=$1, referencia_pago=$2, fecha=NOW() WHERE id_pago=$3 AND estado='Pendiente' RETURNING *`,
      [metodo || 'Efectivo', referencia_pago || null, numId]
    );
    if (!result.rows.length) throw { status: 404, message: 'Cuota no encontrada o ya pagada' };
    await marcarVentaPagadaSiCompleta(client, result.rows[0].id_venta);
    await notificarAbono(client, result.rows[0].id_venta, result.rows[0].monto);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const pagarTotal = async (id_venta, { metodo, referencia_pago }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE "PagosAbonos" SET estado='Confirmado', metodo=$1, referencia_pago=$2, fecha=NOW() WHERE id_venta=$3 AND estado='Pendiente' RETURNING *`,
      [metodo || 'Efectivo', referencia_pago || null, id_venta]
    );
    await marcarVentaPagadaSiCompleta(client, id_venta);
    if (result.rows.length) {
      const montoTotal = result.rows.reduce((acc, r) => acc + Number(r.monto), 0);
      await notificarAbono(client, id_venta, montoTotal);
    }
    await client.query('COMMIT');
    return result.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getPagos, getPagoById, crearPago, cambiarEstado, pagarCuota, pagarTotal };