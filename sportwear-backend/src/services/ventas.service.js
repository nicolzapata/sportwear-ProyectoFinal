// src/services/ventas.service.js
const pool = require('../config/db');

const getVentas = async () => {
  const cab = await pool.query(`
    SELECT v.*, c.nombre AS cliente, c.email AS cliente_email
    FROM "Ventas" v
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE v.estado NOT IN ('Abandonado', 'Pendiente')
    ORDER BY v.id_venta DESC
  `);
  const ids = cab.rows.map(v => v.id_venta);
  let detalles = [];
  if (ids.length) {
    const det = await pool.query(`
      SELECT dv.*, p.nombre AS producto, pv.talla, pv.stock
      FROM "DetalleVenta" dv
      JOIN "Productos" p ON dv.id_producto=p.id_producto
      LEFT JOIN "ProductoVariantes" pv ON dv.id_variante=pv.id_variante
      WHERE dv.id_venta=ANY($1::int[])
    `, [ids]);
    detalles = det.rows;
  }
  return cab.rows.map(v => ({ ...v, items: detalles.filter(d => d.id_venta === v.id_venta) }));
};

const getVentaById = async (id) => {
  const cab = await pool.query(`
    SELECT v.*, c.nombre AS cliente
    FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE v.id_venta=$1
  `, [id]);
  if (!cab.rows.length) throw { status: 404, message: 'No encontrada' };
  const det = await pool.query(`
    SELECT dv.*, p.nombre AS producto, pv.talla, pv.stock
    FROM "DetalleVenta" dv
    JOIN "Productos" p ON dv.id_producto=p.id_producto
    LEFT JOIN "ProductoVariantes" pv ON dv.id_variante=pv.id_variante
    WHERE dv.id_venta=$1
  `, [id]);
  return { ...cab.rows[0], items: det.rows };
};

// ── NUEVO: crea la fila de seguimiento en "Pedidos" para una venta ──
// Se llama dentro de la misma transacción que crea la Venta, usando el mismo `client`.
const crearPedidoParaVenta = async (client, id_venta, estadoVenta) => {
  const estadoPedido = estadoVenta === 'Anulado' ? 'Cancelado' : 'Pendiente';
  await client.query(`
    INSERT INTO "Pedidos" (id_venta, estado_pedido, fecha_actualizacion)
    VALUES ($1, $2, now())
    ON CONFLICT (id_venta) DO NOTHING
  `, [id_venta, estadoPedido]);
};

const crearVenta = async (datos) => {
  const { id_cliente, descuento, impuesto, estado, fecha, observaciones, items, tipo_pago, num_cuotas, metodo_pago } = datos;
  if (!id_cliente) throw { status: 400, message: 'El cliente es requerido' };

  const subtotal = items
    ? items.reduce((a, i) => a + i.cantidad * i.precio_unitario - (i.descuento_linea || 0), 0)
    : (datos.total || 0);
  const total = subtotal - (descuento || 0) + (impuesto || 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venta = await client.query(`
      INSERT INTO "Ventas"
        (id_cliente, subtotal, descuento, impuesto, total, estado, fecha, observaciones,
         tipo_pago, num_cuotas, metodo_pago)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      id_cliente, subtotal, descuento || 0, impuesto || 0, total,
      estado || 'Pendiente', fecha || new Date(), observaciones || null,
      tipo_pago || 'completo', num_cuotas || null, metodo_pago || null,
    ]);

    const id_venta = venta.rows[0].id_venta;

    if (items && items.length > 0) {
      for (const item of items) {
        const stockRes = await client.query(
          `SELECT stock FROM "ProductoVariantes" WHERE id_variante=$1`,
          [item.id_variante]
        );
        const stock = stockRes.rows[0]?.stock ?? 0;
        if (stock < item.cantidad) {
          throw { status: 400, message: `Stock insuficiente para variante ID ${item.id_variante}. Disponible: ${stock}` };
        }

        const subtotalLinea = item.cantidad * item.precio_unitario - (item.descuento_linea || 0);

        await client.query(`
          INSERT INTO "DetalleVenta"
            (id_venta, id_producto, id_variante, cantidad, precio_unitario, descuento_linea, subtotal)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [id_venta, item.id_producto, item.id_variante, item.cantidad,
            item.precio_unitario, item.descuento_linea || 0, subtotalLinea]);

        await client.query(
          `UPDATE "ProductoVariantes" SET stock=stock-$1 WHERE id_variante=$2`,
          [item.cantidad, item.id_variante]
        );
      }
    }

    if (tipo_pago === 'cuotas' && num_cuotas && total > 0) {
      const valorCuota = Math.ceil(total / num_cuotas);
      for (let i = 0; i < num_cuotas; i++) {
        await client.query(`
          INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha, num_cuota)
          VALUES ($1,$2,'Abono',$3,$4,$5,$6)
        `, [id_venta, valorCuota, metodo_pago || 'Efectivo',
            estado === 'Pagado' ? 'Confirmado' : 'Pendiente', new Date(), i + 1]);
      }
    } else if (total > 0) {
      await client.query(`
        INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha)
        VALUES ($1,$2,'Abono',$3,$4,$5)
      `, [id_venta, total, metodo_pago || 'Efectivo',
          estado === 'Pagado' ? 'Confirmado' : 'Pendiente', new Date()]);
    }

    // ── NUEVO: crear el Pedido asociado a esta Venta ──
    await crearPedidoParaVenta(client, id_venta, estado || 'Pendiente');

    await client.query('COMMIT');
    return { ...venta.rows[0], items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const cambiarEstado = async (id, estado) => {
  if (!estado) throw { status: 400, message: 'Estado requerido' };
  const result = await pool.query(
    `UPDATE "Ventas" SET estado=$1 WHERE id_venta=$2 RETURNING *`,
    [estado, id]
  );
  if (!result.rows.length) throw { status: 404, message: 'No encontrada' };

  // ── NUEVO: si la venta se anula, el pedido también se cancela ──
  if (estado === 'Anulado') {
    await pool.query(`
      UPDATE "Pedidos" SET estado_pedido='Cancelado', fecha_actualizacion=now()
      WHERE id_venta=$1 AND estado_pedido NOT IN ('Entregado','Cancelado')
    `, [id]);
  }

  return result.rows[0];
};

const crearMiPedido = async ({ id_cliente, total, estado, fecha, direccion_entrega, metodo_pago, tipo_pago, num_cuotas, items }) => {
  if (!items || !items.length) throw { status: 400, message: 'Debe incluir al menos un producto' };
  if (!id_cliente) throw { status: 400, message: 'Cliente no identificado' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venta = await client.query(`
      INSERT INTO "Ventas"
        (id_cliente, subtotal, descuento, impuesto, total, estado, fecha,
         direccion_entrega, metodo_pago, tipo_pago, num_cuotas)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      id_cliente, total, 0, 0, total,
      estado || 'Confirmado', fecha || new Date(),
      direccion_entrega || null, metodo_pago || null,
      tipo_pago || 'completo', num_cuotas || null,
    ]);

    const ventaRow = venta.rows[0];
    const id_venta = ventaRow.id_venta;

    for (const item of items) {
      if (!item.id_variante) {
        throw { status: 400, message: `El producto ID ${item.id_producto} no tiene variante asignada` };
      }

      const stockRes = await client.query(
        `SELECT stock FROM "ProductoVariantes" WHERE id_variante=$1`,
        [item.id_variante]
      );
      const stock = stockRes.rows[0]?.stock ?? 0;
      if (stock < item.cantidad) {
        throw { status: 400, message: `Stock insuficiente para variante ID ${item.id_variante}. Disponible: ${stock}` };
      }

      const subtotalLinea = item.cantidad * item.precio;

      await client.query(`
        INSERT INTO "DetalleVenta"
          (id_venta, id_producto, id_variante, cantidad, precio_unitario, descuento_linea, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [id_venta, item.id_producto, item.id_variante,
          item.cantidad, item.precio, 0, subtotalLinea]);

      await client.query(
        `UPDATE "ProductoVariantes" SET stock=stock-$1 WHERE id_variante=$2`,
        [item.cantidad, item.id_variante]
      );
    }

    if (tipo_pago === 'cuotas' && num_cuotas) {
      const valorCuota = Math.ceil(total / num_cuotas);
      for (let i = 0; i < num_cuotas; i++) {
        await client.query(`
          INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha, num_cuota)
          VALUES ($1,$2,'Abono',$3,'Pendiente',$4,$5)
        `, [id_venta, valorCuota, metodo_pago || 'Efectivo', new Date(), i + 1]);
      }
    } else {
      await client.query(`
        INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha)
        VALUES ($1,$2,'Abono',$3,'Pendiente',$4)
      `, [id_venta, total, metodo_pago || 'Efectivo', new Date()]);
    }

    // ── NUEVO: crear el Pedido asociado a esta Venta (checkout de cliente) ──
    await crearPedidoParaVenta(client, id_venta, estado || 'Confirmado');

    await client.query('COMMIT');
    
    const abonosRes = await client.query(
      `SELECT * FROM "PagosAbonos" WHERE id_venta = $1 ORDER BY num_cuota ASC`,
      [id_venta]
    );
    
    return { ...ventaRow, items, abonos: abonosRes.rows, total_pagado: 0 };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const crearCarritoAbandonado = async ({ total, items, id_cliente }) => {
  if (!items || !items.length) throw { status: 400, message: 'Sin items' };

  // ✅ Si no hay cliente identificado, no guardar en BD (el carrito ya vive en localStorage)
  if (!id_cliente) return { guardado: false, mensaje: 'Carrito anónimo, no se persiste en BD' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venta = await client.query(`
      INSERT INTO "Ventas"
        (id_cliente, subtotal, descuento, impuesto, total, estado, fecha, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [id_cliente, total, 0, 0, total, 'Abandonado', new Date(), 'Carrito abandonado']);

    const id_venta = venta.rows[0].id_venta;

    for (const item of items) {
      const subtotalLinea = item.cantidad * item.precio;

      await client.query(`
        INSERT INTO "DetalleVenta"
          (id_venta, id_producto, id_variante, cantidad, precio_unitario, descuento_linea, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [
        id_venta,
        item.id_producto,
        item.id_variante || null,
        item.cantidad,
        item.precio,
        0,
        subtotalLinea,
      ]);
    }

    // Nota: NO se crea Pedido para carritos abandonados (no son un pedido real todavía)

    await client.query('COMMIT');
    return { ...venta.rows[0], items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const getMisPedidos = async (id_cliente) => {
  const cab = await pool.query(`
    SELECT v.*,
      COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='Confirmado'), 0) AS total_pagado
    FROM "Ventas" v
    LEFT JOIN "PagosAbonos" pa ON v.id_venta=pa.id_venta AND pa.estado='Confirmado'
    WHERE v.id_cliente=$1 AND v.estado != 'Abandonado'
    GROUP BY v.id_venta
    ORDER BY v.fecha DESC
  `, [id_cliente]);

  const ids = cab.rows.map(v => v.id_venta);
  let detalles = [];
  let abonos = [];
  if (ids.length) {
    const det = await pool.query(`
      SELECT dv.*, p.nombre AS producto, pv.talla, c.nombre AS color_nombre
      FROM "DetalleVenta" dv
      JOIN "Productos" p ON dv.id_producto=p.id_producto
      LEFT JOIN "ProductoVariantes" pv ON dv.id_variante=pv.id_variante
      LEFT JOIN "Colores" c ON pv.id_color=c.id_color
      WHERE dv.id_venta=ANY($1::int[])
    `, [ids]);
    detalles = det.rows;

    const abonosRes = await pool.query(`
      SELECT pa.*, TO_CHAR(pa.fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento
      FROM "PagosAbonos" pa
      WHERE pa.id_venta=ANY($1::int[])
      ORDER BY pa.num_cuota ASC
    `, [ids]);
    abonos = abonosRes.rows;
  }

  return cab.rows.map(v => ({
    ...v,
    items:      detalles.filter(d => d.id_venta === v.id_venta),
    abonos:     abonos.filter(a => a.id_venta === v.id_venta),
    total_pagado: parseFloat(v.total_pagado) || 0,
  }));
};

module.exports = {
  getVentas, getVentaById, crearVenta, cambiarEstado,
  crearMiPedido, crearCarritoAbandonado, getMisPedidos,
};