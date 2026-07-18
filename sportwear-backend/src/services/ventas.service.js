// src/services/ventas.service.js
const pool = require('../config/db');
const { generarComprobanteVentaBuffer } = require('./pdf.service');
const { enviarCorreo } = require('./mailer.service');

const getVentas = async ({ page, limit, q } = {}) => {
  const params = [];
  let busquedaSql = '';
  if (q) {
    params.push(`%${q}%`);
    busquedaSql = `AND c.nombre ILIKE $${params.length}`;
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

  const cab = await pool.query(`
    SELECT v.*, c.nombre AS cliente, c.email AS cliente_email
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "Ventas" v
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE v.estado != 'Abandonado' ${busquedaSql}
    ORDER BY v.id_venta DESC
    ${limitOffsetSql}
  `, params);

  const total = cab.rows[0] ? Number(cab.rows[0].total_count) : 0;
  const filas = cab.rows.map(({ total_count, ...r }) => r);

  const ids = filas.map(v => v.id_venta);
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
  const data = filas.map(v => ({ ...v, items: detalles.filter(d => d.id_venta === v.id_venta) }));

  if (!paginar) return data;
  return { data, total };
};

const getVentaById = async (id) => {
  const cab = await pool.query(`
    SELECT v.*, c.nombre AS cliente, c.email AS cliente_email
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

// ── NUEVO: envía el comprobante en PDF por correo al cliente ──
// Fire-and-forget: nunca bloquea ni rompe el flujo si falla.
const notificarComprobantePago = async (id_venta) => {
  try {
    const venta = await getVentaById(id_venta);
    if (!venta.cliente_email) return;

    const buffer = await generarComprobanteVentaBuffer({ venta, items: venta.items });

    await enviarCorreo({
      to: venta.cliente_email,
      subject: `Comprobante de tu compra — Venta #${id_venta}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#1a1a1a;">¡Gracias por tu compra!</h2>
          <p>Hola ${venta.cliente || ''},</p>
          <p>Adjunto encontrarás el comprobante de tu compra #${id_venta} por un total de
             ${Number(venta.total || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}.</p>
          <hr style="border:none; border-top:1px solid #eee; margin: 20px 0;" />
          <p style="color:#aaa; font-size: 12px;">DVNA SportWear</p>
        </div>
      `,
      attachments: [
        { filename: `comprobante-venta-${id_venta}.pdf`, content: buffer },
      ],
    });
  } catch (err) {
    console.error('Error enviando comprobante por correo:', err.message);
  }
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

// ── NUEVO: cupo de crédito ──
// Calcula cupo, deuda actual (saldo pendiente de TODAS las ventas no anuladas)
// y disponible de un cliente. Vive aquí (no en clientes.service.js) porque es
// una regla de negocio de Ventas, no de gestión de Clientes.
const getCreditoCliente = async (id_cliente) => {
  const clienteRes = await pool.query(
    `SELECT nombre, cupo_credito FROM "Clientes" WHERE id_cliente = $1`,
    [id_cliente]
  );
  if (!clienteRes.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  const { nombre, cupo_credito } = clienteRes.rows[0];

  const deudaRes = await pool.query(`
    SELECT COALESCE(SUM(v.total - COALESCE(pa.pagado, 0)), 0) AS deuda
    FROM "Ventas" v
    LEFT JOIN (
      SELECT id_venta, SUM(monto) AS pagado
      FROM "PagosAbonos"
      WHERE estado = 'Confirmado'
      GROUP BY id_venta
    ) pa ON pa.id_venta = v.id_venta
    WHERE v.id_cliente = $1 AND v.estado NOT IN ('Anulado', 'Abandonado')
  `, [id_cliente]);

  const deudaActual = Number(deudaRes.rows[0].deuda) || 0;
  const cupo = cupo_credito !== null ? Number(cupo_credito) : null;
  const disponible = cupo !== null ? Math.max(0, cupo - deudaActual) : null;

  return { nombre, cupo_credito: cupo, deuda_actual: deudaActual, disponible };
};

// ── NUEVO: valida que una venta a cuotas no supere el cupo de crédito del cliente (si tiene uno asignado) ──
const validarCupoCredito = async (id_cliente, montoNuevaVenta) => {
  const { cupo_credito, deuda_actual } = await getCreditoCliente(id_cliente);
  // cupo_credito === null significa "sin límite configurado" -> no se bloquea (comportamiento actual)
  if (cupo_credito === null) return;
  if (deuda_actual + montoNuevaVenta > cupo_credito) {
    const disponible = Math.max(0, cupo_credito - deuda_actual);
    throw {
      status: 400,
      message: `Esta venta a cuotas supera el cupo de crédito del cliente. Cupo: ${cupo_credito.toLocaleString('es-CO')}, disponible: ${disponible.toLocaleString('es-CO')}.`,
    };
  }
};

const crearVenta = async (datos) => {
  const { id_cliente, descuento, impuesto, estado, fecha, observaciones, items, tipo_pago, num_cuotas, metodo_pago, motivo_descuento, direccion_entrega } = datos;
  if (!id_cliente) throw { status: 400, message: 'El cliente es requerido' };

  const subtotal = items
    ? items.reduce((a, i) => a + i.cantidad * i.precio_unitario - (i.descuento_linea || 0), 0)
    : (datos.total || 0);
  const total = subtotal - (descuento || 0) + (impuesto || 0);

  // ── NUEVO: si hay descuento general, el motivo es obligatorio ──
  if (descuento && descuento > 0 && !motivo_descuento?.trim()) {
    throw { status: 400, message: 'Debes indicar el motivo del descuento.' };
  }

  // ── NUEVO: validar cupo de crédito solo cuando la venta es a cuotas ──
  if (tipo_pago === 'cuotas') {
    await validarCupoCredito(id_cliente, total);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const venta = await client.query(`
      INSERT INTO "Ventas"
        (id_cliente, subtotal, descuento, impuesto, total, estado, fecha, observaciones,
         tipo_pago, num_cuotas, metodo_pago, motivo_descuento, direccion_entrega)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      id_cliente, subtotal, descuento || 0, impuesto || 0, total,
      estado || 'Pendiente', fecha || new Date(), observaciones || null,
      tipo_pago || 'completo', num_cuotas || null, metodo_pago || null,
      (descuento && descuento > 0) ? motivo_descuento.trim() : null,
      direccion_entrega?.trim() || null,
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

    // ── NUEVO: si la venta se registró ya como pagada, enviar el comprobante por correo ──
    if (estado === 'Pagado') notificarComprobantePago(id_venta);

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
  const venta = result.rows[0];

  // ── NUEVO: si la venta se anula, el pedido también se cancela ──
  if (estado === 'Anulado') {
    await pool.query(`
      UPDATE "Pedidos" SET estado_pedido='Cancelado', fecha_actualizacion=now()
      WHERE id_venta=$1 AND estado_pedido NOT IN ('Entregado','Cancelado')
    `, [id]);
  }

  if (estado === 'Pagado') {
    // ── CORREGIDO: primero confirmar los abonos "Pendiente" que ya existen para esta venta
    // (el que se crea automático al registrar la venta), en vez de crear uno nuevo aparte
    // dejando el viejo sin tocar — así evitamos duplicados y calzamos con pagarTotal(). ──
    await pool.query(
      `UPDATE "PagosAbonos" SET estado='Confirmado' WHERE id_venta=$1 AND estado='Pendiente'`,
      [id]
    );

    // Si aún así queda un saldo sin cubrir (por ejemplo, no había ningún abono pendiente
    // registrado), se crea uno nuevo para que el total cuadre.
    const abonadoRes = await pool.query(
      `SELECT COALESCE(SUM(monto),0) AS abonado FROM "PagosAbonos" WHERE id_venta=$1 AND estado='Confirmado'`,
      [id]
    );
    const abonado = Number(abonadoRes.rows[0].abonado) || 0;
    const saldo = Number(venta.total) - abonado;
    if (saldo > 0.01) {
      await pool.query(`
        INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha)
        VALUES ($1,$2,'Abono',$3,'Confirmado',$4)
      `, [id, saldo, venta.metodo_pago || 'Efectivo', new Date()]);
    }

    // ── NUEVO: si la venta pasó a estar pagada, enviar el comprobante por correo ──
    notificarComprobantePago(id);
  }

  return venta;
};

// ── NUEVO: correo de "pedido recibido" — se envía SIEMPRE al crear el pedido,
// sin PDF, distinto del comprobante de pago (que solo se manda cuando el pago
// se confirma de verdad). El mensaje cambia según el método de pago elegido. ──
const notificarPedidoRecibido = async (id_venta, metodo_pago) => {
  try {
    const info = await pool.query(`
      SELECT c.nombre, c.email
      FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente = c.id_cliente
      WHERE v.id_venta = $1
    `, [id_venta]);
    if (!info.rows.length || !info.rows[0].email) return;
    const { nombre, email } = info.rows[0];

    const instrucciones = {
      'Efectivo':      'Pagarás en efectivo al momento de recibir tu pedido. Nuestro equipo se pondrá en contacto para coordinar la entrega.',
      'Transferencia': `Realiza la transferencia a la cuenta Ahorros N° 000-000000-00 del Banco X, a nombre de DVNA SportWear S.A.S. (NIT 000.000.000-0), y envía el comprobante al WhatsApp 300 000 0000. Confirmaremos tu pedido en cuanto la recibamos.`,
      'Tarjeta':       'Completa el pago con tarjeta para confirmar tu pedido.',
    };

    enviarCorreo({
      to: email,
      subject: `Recibimos tu pedido #${id_venta}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#1a1a1a;">¡Recibimos tu pedido!</h2>
          <p>Hola ${nombre || ''},</p>
          <p>Tu pedido <strong>#${id_venta}</strong> quedó registrado y está pendiente de confirmación de pago.</p>
          <p>${instrucciones[metodo_pago] || 'Te avisaremos apenas se confirme tu pago.'}</p>
          <hr style="border:none; border-top:1px solid #eee; margin: 20px 0;" />
          <p style="color:#aaa; font-size: 12px;">DVNA SportWear</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('Error notificando pedido recibido:', err.message);
  }
};

const crearMiPedido = async ({ id_cliente, total, estado, fecha, direccion_entrega, metodo_pago, tipo_pago, num_cuotas, items }) => {
  if (!items || !items.length) throw { status: 400, message: 'Debe incluir al menos un producto' };
  if (!id_cliente) throw { status: 400, message: 'Cliente no identificado' };

  // ── NUEVO: validar cupo de crédito solo cuando el pedido es a cuotas ──
  if (tipo_pago === 'cuotas') {
    await validarCupoCredito(id_cliente, total);
  }

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
        // ── NUEVO (HU 04.3.4): en vez de solo rechazar, se sugieren otras variantes
        // del mismo producto que sí tengan stock suficiente para la cantidad pedida. ──
        const productoRes = await client.query(
          `SELECT nombre FROM "Productos" WHERE id_producto=$1`,
          [item.id_producto]
        );
        const alternativasRes = await client.query(`
          SELECT pv.id_variante, pv.talla, pv.stock, col.nombre AS color
          FROM "ProductoVariantes" pv
          LEFT JOIN "Colores" col ON pv.id_color = col.id_color
          WHERE pv.id_producto = $1
            AND pv.estado = 'Activo'
            AND pv.stock >= $2
            AND pv.id_variante != $3
          ORDER BY pv.stock DESC
          LIMIT 4
        `, [item.id_producto, item.cantidad, item.id_variante]);

        throw {
          status: 400,
          message: `Stock insuficiente para "${productoRes.rows[0]?.nombre || 'este producto'}". Disponible: ${stock} de ${item.cantidad} solicitadas.`,
          id_producto: item.id_producto,
          id_variante_solicitada: item.id_variante,
          producto: productoRes.rows[0]?.nombre || null,
          disponible: stock,
          solicitado: item.cantidad,
          alternativas: alternativasRes.rows,
        };
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

    // ── CORREGIDO: "Confirmado" aquí solo significa "el pedido quedó registrado",
    // NO que ya se pagó — el pago real ocurre después, en el modal de "Realizar pago"
    // (PaymentModal), que llama a los endpoints de /pagos. Esos ya se encargan de
    // enviar el comprobante cuando el pago se confirma de verdad (ver pagos.service.js).
    // Aquí solo se avisa que el pedido quedó registrado, con instrucciones según el
    // método de pago elegido — nunca el comprobante de pago. ──
    notificarPedidoRecibido(id_venta, metodo_pago);

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
  getCreditoCliente, notificarComprobantePago,
};