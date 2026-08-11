// src/services/pagoLogica.service.js
//
// ── Lógica compartida entre Ventas y Pagos ───────────────────────────────
// Antes, "qué significa que una venta quede completamente pagada" estaba
// implementado DOS VECES por separado: una vez en ventas.service.js
// (cuando el admin fuerza el estado a "Pagado" desde la tabla de Ventas) y
// otra vez en pagos.service.js (cuando un abono real se confirma desde
// Pagos). Las dos versiones hacían cosas ligeramente distintas con las
// cuotas pendientes sobrantes (una las CONFIRMABA, la otra las ANULABA) —
// un riesgo real de que, con el tiempo, un cambio en un lado y no en el
// otro volviera a romper la consistencia entre Pagos y Pedidos.
//
// Ahora existe una sola versión, aquí, y tanto Ventas como Pagos la usan.
const pool = require('../config/db');

// Suma de abonos ya confirmados (dinero efectivamente recibido) para una venta.
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

// Si el stock de esta venta todavía no se había descontado (pedidos pagados
// por transferencia/tarjeta, que no descuentan stock al crearse sino hasta
// que se confirma el pago), se descuenta ahora, línea por línea, y se marca
// para no volver a descontarlo.
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

// ── NUEVO: al anular una venta, si su stock ya se había descontado, se
// devuelve al inventario — antes se perdía para siempre, sin importar que
// la venta nunca se hubiera completado. Es la contraparte exacta de
// "descontarStockSiHaceFalta". ──
const restaurarStockSiHaceFalta = async (client, id_venta) => {
  const ventaRes = await client.query(
    `SELECT stock_descontado FROM "Ventas" WHERE id_venta=$1`,
    [id_venta]
  );
  if (!ventaRes.rows.length || !ventaRes.rows[0].stock_descontado) return;

  const detalle = await client.query(
    `SELECT id_variante, cantidad FROM "DetalleVenta" WHERE id_venta=$1 AND id_variante IS NOT NULL`,
    [id_venta]
  );
  for (const item of detalle.rows) {
    await client.query(
      `UPDATE "ProductoVariantes" SET stock=stock+$1 WHERE id_variante=$2`,
      [item.cantidad, item.id_variante]
    );
  }
  await client.query(`UPDATE "Ventas" SET stock_descontado=false WHERE id_venta=$1`, [id_venta]);
};

// Evalúa si con los abonos Confirmado ya se cubre el total de la venta, y si
// es así, la marca "Pagado" y hace todo lo que eso implica: cerrar cuotas
// pendientes que ya no representan nada por cobrar, descontar el stock
// diferido si hacía falta, y avanzar el pedido a "Entregado" si es
// contraentrega. Devuelve 'completo' | 'parcial' para que quien la llame
// sepa qué notificación mandar.
const evaluarYMarcarPagada = async (client, id_venta) => {
  const { total, totalPagado } = await getSaldoPendiente(client, id_venta);
  if (totalPagado >= total) {
    await client.query(
      `UPDATE "Ventas" SET estado='Pagado' WHERE id_venta=$1 AND estado != 'Anulado'`,
      [id_venta]
    );
    // Cualquier abono que siga "Pendiente" para esta venta ya no representa
    // nada por cobrar (el total ya está cubierto) — se cierra automáticamente
    // para que Pagos y Pedidos nunca se contradigan entre sí.
    await client.query(
      `UPDATE "PagosAbonos" SET estado='Anulado' WHERE id_venta=$1 AND estado='Pendiente'`,
      [id_venta]
    );
    await descontarStockSiHaceFalta(client, id_venta);

    // ── CORREGIDO: se agrega la condición de "tipo_pago" — antes, una
    // venta a cuotas con "Efectivo" como método (ej. así se pagó la cuota
    // inicial) se confundía con contraentrega real: en cuanto la última
    // cuota se confirmaba (desde Pagos, sin tener nada que ver con una
    // entrega), el pedido se avanzaba solo a "Entregado". A cuotas nunca se
    // avanza así — es siempre una decisión manual del admin, sin importar
    // qué abono fue el que completó el pago. ──
    const ventaRes = await client.query(`SELECT metodo_pago, tipo_pago FROM "Ventas" WHERE id_venta=$1`, [id_venta]);
    if (ventaRes.rows[0]?.metodo_pago === 'Efectivo' && ventaRes.rows[0]?.tipo_pago !== 'cuotas') {
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

module.exports = {
  getSaldoPendiente,
  descontarStockSiHaceFalta,
  restaurarStockSiHaceFalta,
  evaluarYMarcarPagada,
};