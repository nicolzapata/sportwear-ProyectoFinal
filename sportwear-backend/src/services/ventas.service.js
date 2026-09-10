// src/services/ventas.service.js
const pool = require('../config/db');
const { generarComprobanteVentaBuffer } = require('./pdf.service');
const { enviarCorreo, formatearFecha, filasDatos } = require('./mailer.service');
// ── CORREGIDO: "cambiarEstado" reimplementaba a mano su propia versión de
// "qué pasa cuando una venta queda pagada" — con un criterio DISTINTO al
// que usa Pagos para las cuotas sobrantes (las confirmaba, en vez de
// anularlas). Ahora usa la misma lógica compartida que Pagos, para que
// nunca puedan desincronizarse entre sí. ──
const {
  evaluarYMarcarPagada, restaurarStockSiHaceFalta,
  MONTO_MINIMO_ABONO, ajustarNumCuotas, calcularFechasVencimiento,
  getSaldoPendiente, mensajeMontoMinimo,
} = require('./pagoLogica.service');

const getVentas = async ({ page, limit, q, origen, estado_pago } = {}) => {
  const params = [];
  let busquedaSql = '';
  if (q) {
    params.push(`%${q}%`);
    busquedaSql = `AND c.nombre ILIKE $${params.length}`;
  }
  // ── NUEVO: filtro "Cliente" (Landing) / "Admin" — pestañas al lado del
  // buscador, igual que Usuarios/Clientes en el módulo de Usuarios. ──
  let origenSql = '';
  if (origen === 'Landing' || origen === 'Admin') {
    params.push(origen);
    origenSql = `AND v.origen = $${params.length}`;
  }

  // ── NUEVO: filtro "Realizadas" (pagadas) / "Pendientes" — mismo criterio
  // que ya usa el frontend para pintar el badge de estado (lo pagado cubre
  // o no el total), así nunca puede verse una venta bajo un filtro que
  // contradiga su propio badge. Va en HAVING porque depende del agregado
  // de abonos confirmados, calculado en el mismo SELECT. ──
  // ── NUEVO: un pedido registrado por el cliente (origen='Landing') no debe
  // aparecer acá hasta que haya dinero real de por medio — al menos un abono
  // o el pago completo ya CONFIRMADO. Antes de eso, solo existe como Pedido
  // (visible en /pedidos, para que el admin lo prepare), no como Venta. Una
  // venta registrada por el Admin directamente siempre se ve, como ya
  // pasaba. Se resuelve con el mismo agregado de abonos confirmados que ya
  // calcula esta consulta, sin tocar el esquema. ──
  const condicionesHaving = [
    `(v.origen != 'Landing' OR COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='Confirmado'), 0) > 0)`,
  ];
  if (estado_pago === 'Pagado') {
    condicionesHaving.push(`v.estado != 'Anulado'`, `COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='Confirmado'), 0) >= v.total`);
  } else if (estado_pago === 'Pendiente') {
    condicionesHaving.push(`v.estado != 'Anulado'`, `COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='Confirmado'), 0) < v.total`);
  } else if (estado_pago === 'Anulado') {
    condicionesHaving.push(`v.estado = 'Anulado'`);
  }
  const havingSql = `HAVING ${condicionesHaving.join(' AND ')}`;

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
    SELECT v.*, c.nombre AS cliente, c.email AS cliente_email,
           COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='Confirmado'), 0) AS total_pagado
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "Ventas" v
    JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    LEFT JOIN "PagosAbonos" pa ON v.id_venta=pa.id_venta
    WHERE v.estado != 'Abandonado' ${busquedaSql} ${origenSql}
    GROUP BY v.id_venta, c.nombre, c.email
    ${havingSql}
    ORDER BY v.id_venta DESC
    ${limitOffsetSql}
  `, params);

  const total = cab.rows[0] ? Number(cab.rows[0].total_count) : 0;
  const filas = cab.rows.map(({ total_count, ...r }) => r);

  const ids = filas.map(v => v.id_venta);
  let detalles = [];
  if (ids.length) {
    // ── NUEVO: se agrega el color de la variante — el modal de "ver detalle"
    // de este mismo módulo (Ventas) usa los items que trae ESTA consulta
    // (la del listado), no los de getVentaById, así que sin este join el
    // color nunca llegaba a la pantalla sin importar qué mostrara el modal. ──
    const det = await pool.query(`
      SELECT dv.*, p.nombre AS producto, pv.talla, pv.stock, col.nombre AS color_nombre
      FROM "DetalleVenta" dv
      JOIN "Productos" p ON dv.id_producto=p.id_producto
      LEFT JOIN "ProductoVariantes" pv ON dv.id_variante=pv.id_variante
      LEFT JOIN "Colores" col ON pv.id_color=col.id_color
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
    SELECT v.*, c.nombre AS cliente, c.email AS cliente_email, c.documento AS cliente_documento
    FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente=c.id_cliente
    WHERE v.id_venta=$1
  `, [id]);
  if (!cab.rows.length) throw { status: 404, message: 'No encontrada' };
  // ── NUEVO: se agrega color, código de referencia e imagen del producto —
  // el modal de detalle de pedido (cliente) ya intentaba mostrar
  // "color_nombre", pero esta consulta nunca lo mandaba, así que nunca se
  // vio. La imagen usa la MISMA subconsulta verificada que ya usa
  // productos.service.js (no se adivina el nombre de columna otra vez). ──
  const det = await pool.query(`
    SELECT dv.*, p.nombre AS producto, p.codigo AS producto_codigo,
           pv.talla, pv.stock, col.nombre AS color_nombre,
           (SELECT url FROM "Imagenes"
            WHERE id_referencia = p.id_producto AND tipo_referencia = 'Producto'
              AND es_principal = true AND estado = 'Activo' LIMIT 1) AS producto_imagen
    FROM "DetalleVenta" dv
    JOIN "Productos" p ON dv.id_producto=p.id_producto
    LEFT JOIN "ProductoVariantes" pv ON dv.id_variante=pv.id_variante
    LEFT JOIN "Colores" col ON pv.id_color=col.id_color
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
          ${filasDatos([
            ['Fecha', formatearFecha(venta.fecha)],
            ['Nombre del cliente', venta.cliente],
            ['Documento', venta.cliente_documento],
          ])}
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
  const { id_cliente, descuento, impuesto, estado, fecha, observaciones, items, tipo_pago, metodo_pago, motivo_descuento, direccion_entrega, fecha_primera_cuota } = datos;
  if (!id_cliente) throw { status: 400, message: 'El cliente es requerido' };
  // ── NUEVO: la dirección de entrega ahora es obligatoria — sin ella no
  // hay forma real de despachar la venta. Validado también en el frontend,
  // pero la regla real vive aquí. ──
  if (!direccion_entrega?.trim()) throw { status: 400, message: 'La dirección de entrega es obligatoria' };

  const subtotal = items
    ? items.reduce((a, i) => a + i.cantidad * i.precio_unitario - (i.descuento_linea || 0), 0)
    : (datos.total || 0);
  const total = subtotal - (descuento || 0) + (impuesto || 0);

  // ── NUEVO: si hay descuento general, el motivo es obligatorio ──
  if (descuento && descuento > 0 && !motivo_descuento?.trim()) {
    throw { status: 400, message: 'Debes indicar el motivo del descuento.' };
  }

  // ── NUEVO: validar cupo de crédito solo cuando la venta es a cuotas. El
  // número de cuotas pedido se autoajusta al máximo real que permite el
  // total (nunca se rechaza la venta por pedir de más). ──
  let num_cuotas = datos.num_cuotas;
  if (tipo_pago === 'cuotas') {
    await validarCupoCredito(id_cliente, total);
    if (!num_cuotas || Number(num_cuotas) < 1) {
      throw { status: 400, message: 'Indica el número de cuotas.' };
    }
    num_cuotas = ajustarNumCuotas(num_cuotas, total);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Esta es la ruta de venta creada directamente por el admin (no el checkout
    // del cliente) — aquí el stock siempre se descuenta de inmediato, como ya
    // pasaba antes, por lo que se marca stock_descontado=true desde ya, para
    // que si más adelante esta venta pasa a "Pagado" por el módulo de Pagos,
    // no se vuelva a descontar el stock por segunda vez.
    // ── NUEVO: si es una venta a cuotas con más de una cuota, marcar
    // "Pagado" en el formulario solo confirma la PRIMERA cuota — la venta en
    // sí todavía no está completamente pagada, así que Ventas.estado no
    // puede decir "Pagado" (rompería la regla de Pedidos que exige el pago
    // confirmado antes de avanzar, y la limpieza automática de abonos
    // huérfanos). En ese caso queda como "Confirmado" (pedido en firme,
    // pago parcial), igual que cuando lo crea el checkout público. ──
    const esCuotasParciales = tipo_pago === 'cuotas' && Number(num_cuotas) > 1;
    const estadoVentaFinal = (estado === 'Pagado' && esCuotasParciales) ? 'Confirmado' : (estado || 'Pendiente');

    const venta = await client.query(`
      INSERT INTO "Ventas"
        (id_cliente, subtotal, descuento, impuesto, total, estado, fecha, observaciones,
         tipo_pago, num_cuotas, metodo_pago, motivo_descuento, direccion_entrega, stock_descontado, origen)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,'Admin')
      RETURNING *
    `, [
      id_cliente, subtotal, descuento || 0, impuesto || 0, total,
      estadoVentaFinal, fecha || new Date(), observaciones || null,
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
      // ── NUEVO: fecha base para calcular el vencimiento de cada cuota — si
      // no se manda "fecha de la primera cuota", se usa la fecha de la venta
      // como respaldo. La cuota 1 cae exactamente ahí, sin desplazamiento. ──
      const fechaBaseCuotas = fecha_primera_cuota || fecha || new Date();
      const fechasVencimiento = calcularFechasVencimiento(fechaBaseCuotas, num_cuotas, total);
      for (let i = 0; i < num_cuotas; i++) {
        // ── CORREGIDO: "Primera cuota confirmada" en el formulario solo debe
        // confirmar la cuota #1 — antes esta condición no revisaba "i",
        // así que confirmaba TODAS las cuotas de una vez, sin importar
        // cuántas hubiera. ──
        const estadoCuota = (estado === 'Pagado' && i === 0) ? 'Confirmado' : 'Pendiente';
        await client.query(`
          INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha, num_cuota, fecha_vencimiento)
          VALUES ($1,$2,'Abono',$3,$4,$5,$6,$7)
        `, [id_venta, valorCuota, metodo_pago || 'Efectivo', estadoCuota, new Date(), i + 1, fechasVencimiento[i]]);
      }
    } else if (total > 0) {
      // ── CORREGIDO: esto decía "tipo='Abono'" sin importar si la venta
      // era a cuotas o de pago completo — así que una venta de pago
      // completo terminaba con su único registro de pago etiquetado como
      // "Abono" en la tabla de Pagos, en vez de "Pago completo". ──
      await client.query(`
        INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha)
        VALUES ($1,$2,'Pago completo',$3,$4,$5)
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

const cambiarEstado = async (id, estado, motivo_anulacion) => {
  if (!estado) throw { status: 400, message: 'Estado requerido' };
  // ── NUEVO: anular una venta ahora exige el motivo — se guarda como
  // registro de por qué se anuló, no solo que se anuló. ──
  if (estado === 'Anulado' && !motivo_anulacion?.trim()) {
    throw { status: 400, message: 'Debes indicar el motivo de la anulación.' };
  }

  const client = await pool.connect();
  let tipoNotificacionPago = null;
  try {
    await client.query('BEGIN');

    // Bloquea la fila antes de tocar nada (evita condiciones de carrera si
    // dos peticiones intentan cambiar el estado de la misma venta a la vez).
    const actualRes = await client.query(
      `SELECT id_venta FROM "Ventas" WHERE id_venta=$1 FOR UPDATE`,
      [id]
    );
    if (!actualRes.rows.length) throw { status: 404, message: 'No encontrada' };

    // ── CORREGIDO: anular una venta nunca le devolvía el stock que ya se
    // había descontado — esas unidades quedaban perdidas del inventario
    // para siempre, sin importar que la venta jamás se hubiera completado.
    // Se usa la misma función compartida que ya se usaría desde cualquier
    // otro lugar, en vez de repetir la lógica aquí también. ──
    if (estado === 'Anulado') {
      await restaurarStockSiHaceFalta(client, id);
    }

    let venta;

    if (estado === 'Pagado') {
      // ── CORREGIDO: antes esta rama FORZABA "Ventas.estado='Pagado'"
      // directo, y por separado reimplementaba todo lo que pasa cuando una
      // venta queda pagada (descuento de stock, avance de pedido en
      // contraentrega, notificación) — una segunda versión de la misma
      // lógica que ya vive en evaluarYMarcarPagada (Pagos), con el riesgo
      // real de que las dos se desincronizaran.
      //
      // Ahora: lo único propio de declarar "Pagado" desde Ventas
      // directamente (sin pasar por un abono puntual) es confirmar las
      // cuotas que ya estaban pendientes de cobrar — eso sí es una acción
      // real. Pero quién decide si con eso YA califica como "Pagado" de
      // verdad es evaluarYMarcarPagada, mirando la plata real confirmada
      // contra el total — nunca una orden directa. Así, si por algún
      // motivo la plata confirmada no alcanza a cubrir el total (datos
      // inconsistentes, un caso raro), la venta se queda en su estado
      // real en vez de mentir diciendo "Pagado" sin que la cuenta cuadre. ──
      await client.query(
        `UPDATE "PagosAbonos" SET estado='Confirmado' WHERE id_venta=$1 AND estado='Pendiente'`,
        [id]
      );
      // ── CORREGIDO: antes esto pedía "evaluarYMarcarPagada" con un require
      // perezoso apuntando a pagos.service.js, para esquivar una dependencia
      // circular (pagos.service.js necesita algo de este archivo también).
      // Ahora esa lógica compartida vive en su propio módulo
      // (pagoLogica.service.js), que no depende de ninguno de los dos —
      // así que se puede importar arriba del todo, normal, sin trucos. ──
      tipoNotificacionPago = await evaluarYMarcarPagada(client, id);

      const refrescada = await client.query(`SELECT * FROM "Ventas" WHERE id_venta=$1`, [id]);
      venta = refrescada.rows[0];
    } else {
      const result = estado === 'Anulado'
        ? await client.query(
            `UPDATE "Ventas" SET estado=$1, motivo_anulacion=$2 WHERE id_venta=$3 RETURNING *`,
            [estado, motivo_anulacion.trim(), id]
          )
        : await client.query(
            `UPDATE "Ventas" SET estado=$1 WHERE id_venta=$2 RETURNING *`,
            [estado, id]
          );
      venta = result.rows[0];

      if (estado === 'Anulado') {
        await client.query(`
          UPDATE "Pedidos" SET estado_pedido='Cancelado', fecha_actualizacion=now()
          WHERE id_venta=$1 AND estado_pedido NOT IN ('Entregado','Cancelado')
        `, [id]);
        // ── NUEVO: si quedaban cuotas pendientes por cobrar, ya no hay
        // nada que cobrar — se anulan también, para que no queden abonos
        // "Pendiente" huérfanos de una venta que ya no existe. ──
        await client.query(
          `UPDATE "PagosAbonos" SET estado='Anulado' WHERE id_venta=$1 AND estado='Pendiente'`,
          [id]
        );
      }
    }

    await client.query('COMMIT');

    if (estado === 'Pagado' && tipoNotificacionPago === 'completo') {
      notificarComprobantePago(id);
    }

    return venta;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ── NUEVO: correo de "pedido recibido" — se envía SIEMPRE al crear el pedido,
// sin PDF, distinto del comprobante de pago (que solo se manda cuando el pago
// se confirma de verdad). El mensaje cambia según el método de pago elegido. ──
const notificarPedidoRecibido = async (id_venta, metodo_pago) => {
  try {
    const info = await pool.query(`
      SELECT c.nombre, c.email, c.documento, v.fecha
      FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente = c.id_cliente
      WHERE v.id_venta = $1
    `, [id_venta]);
    if (!info.rows.length || !info.rows[0].email) return;
    const { nombre, email, documento, fecha } = info.rows[0];

    const instrucciones = {
      'Efectivo':      'Pagarás en efectivo al momento de recibir tu pedido. Nuestro equipo se pondrá en contacto para coordinar la entrega.',
      'Transferencia': `Realiza la transferencia a la cuenta Ahorros N° 000-000000-00 del Banco X, a nombre de DVNA SportWear S.A.S. (NIT 000.000.000-0), y envía el comprobante al WhatsApp 300 000 0000. Confirmaremos tu pedido en cuanto la recibamos.`,
    };

    enviarCorreo({
      to: email,
      subject: `Recibimos tu pedido #${id_venta}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#1a1a1a;">¡Recibimos tu pedido!</h2>
          <p>Hola ${nombre || ''},</p>
          <p>Tu pedido <strong>#${id_venta}</strong> quedó registrado y está pendiente de confirmación de pago.</p>
          ${filasDatos([
            ['Fecha', formatearFecha(fecha)],
            ['Nombre del cliente', nombre],
            ['Documento', documento],
          ])}
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

const crearMiPedido = async ({ id_cliente, total, estado, fecha, direccion_entrega, id_barrio, metodo_pago, tipo_pago, num_cuotas: numCuotasPedido, fecha_primera_cuota, items }) => {
  if (!items || !items.length) throw { status: 400, message: 'Debe incluir al menos un producto' };
  if (!id_cliente) throw { status: 400, message: 'Cliente no identificado' };
  if (!direccion_entrega?.trim()) throw { status: 400, message: 'La dirección de entrega es obligatoria' };

  // ── NUEVO: validar cupo de crédito solo cuando el pedido es a cuotas. El
  // número de cuotas se autoajusta al máximo real que permite el total,
  // igual que en la venta creada por el admin (misma regla, un solo lugar). ──
  let num_cuotas = numCuotasPedido;
  if (tipo_pago === 'cuotas') {
    await validarCupoCredito(id_cliente, total);
    if (!num_cuotas || Number(num_cuotas) < 1) {
      throw { status: 400, message: 'Indica el número de cuotas.' };
    }
    num_cuotas = ajustarNumCuotas(num_cuotas, total);
  }

  // ── NUEVO (Inventario): el stock solo se descuenta de inmediato cuando el
  // pago es contraentrega (Efectivo). Con Transferencia, el pedido se registra
  // pero el stock queda sin descontar hasta que se confirme el pago (desde
  // Ventas, o el propio cliente pagando desde Mi Cuenta) — ahí es donde
  // `evaluarYMarcarPagada` (pagoLogica.service.js) hace el descuento diferido. ──
  const esContraentrega = metodo_pago === 'Efectivo';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── NUEVO (Carrito/Finalizar compra): ciudad y barrio ya no se piden en
    // el registro — se preguntan aquí, al finalizar la compra. Ciudad no se
    // guarda como columna (los domicilios son únicamente en Medellín); barrio
    // sí, como referencia real a "Barrios" (igual que en Clientes), no texto
    // libre. ──
    const venta = await client.query(`
      INSERT INTO "Ventas"
        (id_cliente, subtotal, descuento, impuesto, total, estado, fecha,
         direccion_entrega, id_barrio, metodo_pago, tipo_pago, num_cuotas, stock_descontado, origen)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Landing')
      RETURNING *
    `, [
      id_cliente, total, 0, 0, total,
      estado || 'Confirmado', fecha || new Date(),
      direccion_entrega || null, id_barrio || null, metodo_pago || null,
      tipo_pago || 'completo', num_cuotas || null,
      esContraentrega,
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

      // ── NUEVO (Inventario): solo se descuenta ahora si es contraentrega.
      // Si es transferencia/tarjeta, el stock se queda igual hasta que el
      // pago se confirme (ver evaluarYMarcarPagada, más abajo en este archivo). ──
      if (esContraentrega) {
        await client.query(
          `UPDATE "ProductoVariantes" SET stock=stock-$1 WHERE id_variante=$2`,
          [item.cantidad, item.id_variante]
        );
      }
    }

    if (tipo_pago === 'cuotas' && num_cuotas) {
      const valorCuota = Math.ceil(total / num_cuotas);
      const fechaBaseCuotas = fecha_primera_cuota || fecha || new Date();
      const fechasVencimiento = calcularFechasVencimiento(fechaBaseCuotas, num_cuotas, total);
      for (let i = 0; i < num_cuotas; i++) {
        await client.query(`
          INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha, num_cuota, fecha_vencimiento)
          VALUES ($1,$2,'Abono',$3,'Pendiente',$4,$5,$6)
        `, [id_venta, valorCuota, metodo_pago || 'Efectivo', new Date(), i + 1, fechasVencimiento[i]]);
      }
    } else {
      // ── CORREGIDO: mismo bug que en crearVenta (admin) — el registro de
      // pago de una venta de pago completo salía etiquetado como "Abono"
      // en la tabla de Pagos. ──
      await client.query(`
        INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha)
        VALUES ($1,$2,'Pago completo',$3,'Pendiente',$4)
      `, [id_venta, total, metodo_pago || 'Efectivo', new Date()]);
    }

    // ── NUEVO: crear el Pedido asociado a esta Venta (checkout de cliente) ──
    await crearPedidoParaVenta(client, id_venta, estado || 'Confirmado');

    await client.query('COMMIT');

    // ── CORREGIDO: "Confirmado" aquí solo significa "el pedido quedó registrado",
    // NO que ya se pagó — el pago real ocurre después, en el modal de "Realizar pago"
    // (PaymentModal), que llama a pagarCuota/pagarTotal (más abajo en este archivo).
    // Esos ya se encargan de enviar el comprobante cuando el pago se confirma de
    // verdad. Aquí solo se avisa que el pedido quedó registrado, con instrucciones
    // según el método de pago elegido — nunca el comprobante de pago. ──
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
        (id_cliente, subtotal, descuento, impuesto, total, estado, fecha, observaciones, origen)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Landing')
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
  // ── NUEVO: join con "Pedidos" para traer el estado de envío junto con cada
  // venta — antes esta consulta no sabía nada de Pedidos, así que Mi Cuenta
  // no tenía cómo mostrar en qué va la entrega. ──
  const cab = await pool.query(`
    SELECT v.*, ped.estado_pedido AS estado_envio,
      COALESCE(SUM(pa.monto) FILTER (WHERE pa.estado='Confirmado'), 0) AS total_pagado
    FROM "Ventas" v
    LEFT JOIN "PagosAbonos" pa ON v.id_venta=pa.id_venta AND pa.estado='Confirmado'
    LEFT JOIN "Pedidos" ped ON v.id_venta=ped.id_venta
    WHERE v.id_cliente=$1 AND v.estado != 'Abandonado'
    GROUP BY v.id_venta, ped.estado_pedido
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

// ── Pagos/Abonos — antes vivían como módulo aparte (pagos.service.js); se
// fusionan aquí porque conceptualmente son parte de una venta, no una
// pantalla propia (una venta ya trae su calendario de cuotas en
// "PagosAbonos"). Solo se conservan las piezas que de verdad se siguen
// usando tras quitar la pantalla admin de Pagos: el cronograma de una venta
// puntual, el registro manual de un abono desde Ventas, y el pago del
// cliente (cuota puntual o total) desde Mi Cuenta/Checkout. ──

// Todas las cuotas de una venta puntual, pasadas y futuras — para el
// cronograma de "ver detalle" en Ventas.
const getPagosPorVenta = async (id_venta) => {
  const result = await pool.query(`
    SELECT pa.* FROM "PagosAbonos" pa
    WHERE pa.id_venta = $1
    ORDER BY pa.num_cuota ASC NULLS LAST, pa.id_pago ASC
  `, [id_venta]);
  return result.rows;
};

const notificarAbonoParcial = async (id_venta, monto) => {
  try {
    const info = await pool.query(`
      SELECT c.nombre, c.email, c.documento
      FROM "Ventas" v JOIN "Clientes" c ON v.id_cliente = c.id_cliente
      WHERE v.id_venta = $1
    `, [id_venta]);
    if (!info.rows.length || !info.rows[0].email) return;
    const { nombre, email, documento } = info.rows[0];
    const { saldo } = await getSaldoPendiente(pool, id_venta);

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

const notificarSegunResultadoPago = (tipo, id_venta, monto) => {
  if (tipo === 'completo') notificarComprobantePago(id_venta);
  else if (tipo === 'parcial') notificarAbonoParcial(id_venta, monto);
};

// Registrar un abono/pago manual desde Ventas (ej. el cliente pagó en
// efectivo en tienda) — siempre queda Confirmado. Distinto de pagarCuota/
// pagarTotal (el propio cliente paga desde Mi Cuenta/Checkout), que
// actualizan la fila ya agendada en vez de crear una nueva.
const crearPago = async (datos) => {
  const { id_venta, monto, tipo, metodo, referencia_pago, fecha } = datos;
  if (!id_venta || !monto) throw { status: 400, message: 'id_venta y monto son requeridos' };
  if (Number(monto) <= 0) throw { status: 400, message: 'El monto debe ser mayor a cero' };

  const { saldo } = await getSaldoPendiente(pool, id_venta);
  if (Number(monto) > saldo)
    throw { status: 400, message: `El monto ($${Number(monto).toLocaleString('es-CO')}) supera el saldo pendiente ($${saldo.toLocaleString('es-CO')}).` };

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
      VALUES ($1,$2,$3,$4,$5,'Confirmado',$6) RETURNING *
    `, [id_venta, monto, tipo || 'Pago completo', metodo || 'Efectivo', referencia_pago || null, fecha || new Date()]);

    const pago = result.rows[0];
    tipoNotificacion = await evaluarYMarcarPagada(client, id_venta);

    await client.query('COMMIT');
    if (tipoNotificacion) notificarSegunResultadoPago(tipoNotificacion, id_venta, monto);

    return pago;
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
    if (tipoNotificacion) notificarSegunResultadoPago(tipoNotificacion, idVentaNotif, montoNotif);

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
    if (tipoNotificacion) notificarSegunResultadoPago(tipoNotificacion, id_venta, montoNotif);

    return result.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = {
  getVentas, getVentaById, crearVenta, cambiarEstado,
  crearMiPedido, crearCarritoAbandonado, getMisPedidos,
  getCreditoCliente, notificarComprobantePago,
  getPagosPorVenta, crearPago, pagarCuota, pagarTotal,
};