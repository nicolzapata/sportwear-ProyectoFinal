// src/services/pedidos.service.js
const pool = require('../config/db');
const { enviarCorreo, formatearFecha, filasDatos } = require('./mailer.service');
const { notificarComprobantePago } = require('./ventas.service');
// ── CORREGIDO: este archivo tenía su PROPIA reimplementación de "confirmar
// el saldo pendiente y marcar la venta como pagada" para el caso de
// contraentrega — una TERCERA copia de la misma lógica que ya existe en
// pagoLogica.service.js, y a esta le faltaba además el paso de descontar
// el stock diferido. Ahora usa la misma función compartida que Ventas y
// Pagos, para que las tres nunca puedan volver a desincronizarse. ──
const { evaluarYMarcarPagada } = require('./pagoLogica.service');

const ESTADOS_VALIDOS = ['Pendiente', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];

const getPedidos = async ({ page, limit, q, estado } = {}) => {
  const params = [];
  const condiciones = [];
  if (q) {
    params.push(`%${q}%`);
    // ── NUEVO: buscar también por documento del cliente, no solo por nombre
    // — si hay dos clientes con el mismo nombre, antes no había forma de
    // diferenciarlos desde el buscador. ──
    condiciones.push(`(c.nombre ILIKE $${params.length} OR c.documento ILIKE $${params.length})`);
  }
  // ── NUEVO: filtro por estado de envío — antes la única forma de mirar,
  // por ejemplo, solo los pedidos "Enviado" era buscar a ojo en la tabla
  // completa. Se filtra por el valor exacto de "estado_pedido". ──
  if (estado && ESTADOS_VALIDOS.includes(estado)) {
    params.push(estado);
    condiciones.push(`p.estado_pedido = $${params.length}`);
  }
  const busquedaSql = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

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
           v.total, v.fecha AS fecha_venta, v.direccion_entrega, v.estado AS estado_venta, v.metodo_pago, v.origen,
           c.nombre AS cliente, c.documento AS cliente_documento, c.email AS cliente_email
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
           v.total, v.subtotal, v.descuento, v.impuesto, v.tipo_pago, v.num_cuotas,
           v.fecha AS fecha_venta, v.direccion_entrega, v.observaciones,
           v.estado AS estado_venta, v.metodo_pago, v.origen,
           c.nombre AS cliente, c.documento AS cliente_documento, c.email AS cliente_email
    FROM "Pedidos" p
    JOIN "Ventas" v    ON p.id_venta = v.id_venta
    JOIN "Clientes" c  ON v.id_cliente = c.id_cliente
    WHERE p.id_pedido = $1
  `, [id_pedido]);
  if (!result.rows.length) throw { status: 404, message: 'Pedido no encontrado' };

  const det = await pool.query(`
    SELECT dv.cantidad, p.nombre AS producto, p.codigo AS producto_codigo,
           pv.talla, col.nombre AS color_nombre,
           (SELECT url FROM "Imagenes"
            WHERE id_referencia = p.id_producto AND tipo_referencia = 'Producto'
              AND es_principal = true AND estado = 'Activo' LIMIT 1) AS producto_imagen
    FROM "DetalleVenta" dv
    JOIN "Productos" p ON dv.id_producto = p.id_producto
    LEFT JOIN "ProductoVariantes" pv ON dv.id_variante = pv.id_variante
    LEFT JOIN "Colores" col ON pv.id_color = col.id_color
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
    SELECT c.nombre, c.email, c.documento
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
        ${filasDatos([
          ['Fecha', formatearFecha(new Date())],
          ['Nombre del cliente', cliente.nombre],
          ['Documento', cliente.documento],
        ])}
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

    // ── NUEVO: se trae también la venta asociada (metodo_pago + estado del
    // pago) — el pedido queda "sujeto a Compras/Pagos": si el cliente pagó
    // por transferencia, no se puede empezar a preparar/enviar/entregar
    // hasta que el pago esté confirmado. Contraentrega sí puede avanzar
    // libremente, porque el pago ocurre al momento de la entrega. ──
    const actual = await client.query(`
      SELECT p.*, v.metodo_pago, v.estado AS estado_venta, v.tipo_pago
      FROM "Pedidos" p
      JOIN "Ventas" v ON p.id_venta = v.id_venta
      WHERE p.id_pedido=$1 FOR UPDATE OF p
    `, [id_pedido]);
    if (!actual.rows.length) throw { status: 404, message: 'Pedido no encontrado' };
    const estadoActual = actual.rows[0].estado_pedido;
    const { metodo_pago, estado_venta, tipo_pago } = actual.rows[0];
    const id_venta = actual.rows[0].id_venta;

    const permitidos = TRANSICIONES[estadoActual] || [];
    if (!permitidos.includes(nuevoEstado)) {
      throw { status: 400, message: `No se puede pasar de "${estadoActual}" a "${nuevoEstado}".` };
    }

    // El pago debe estar confirmado antes de avanzar el pedido, salvo que
    // sea contraentrega (el pago llega junto con la entrega). Cancelar
    // sigue permitido siempre — cancelar no depende del pago.
    //
    // ── CORREGIDO (otra vez): la vez anterior quité por completo la
    // exigencia de pago para cuotas, entendiendo mal la instrucción — lo
    // que realmente se pidió es que el avance NUNCA se dispare solo por un
    // pago (nunca automático, siempre un clic del admin), no que se quite
    // la exigencia de que haya al menos un abono real. Para cuotas, sigue
    // haciendo falta que la PRIMERA cuota esté confirmada — alcanza con
    // esa, no con el total, porque ese es el punto de vender a cuotas. Pago
    // completo (no cuotas) por un método distinto a contraentrega sigue
    // exigiendo el pago TOTAL confirmado, porque ahí no existe el concepto
    // de "abono parcial válido para despachar". ──
    const avanzaFlujo = nuevoEstado !== 'Cancelado';
    const esContraentrega = metodo_pago === 'Efectivo';
    const esCuotas = tipo_pago === 'cuotas';

    if (avanzaFlujo && !esContraentrega && estado_venta !== 'Pagado') {
      if (esCuotas) {
        const primeraCuotaRes = await client.query(
          `SELECT estado FROM "PagosAbonos" WHERE id_venta=$1 AND num_cuota=1`,
          [id_venta]
        );
        const primeraConfirmada = primeraCuotaRes.rows[0]?.estado === 'Confirmado';
        if (!primeraConfirmada) {
          throw {
            status: 400,
            message: `Este pedido es a cuotas y la primera cuota todavía no está confirmada. Confírmala desde Pagos antes de avanzar el pedido.`,
          };
        }
      } else {
        throw {
          status: 400,
          message: `Este pedido se paga por ${metodo_pago || 'un método distinto a contraentrega'} y el pago aún no está confirmado. Confírmalo desde Pagos antes de avanzar el pedido.`,
        };
      }
    }

    // ── NUEVO: cuotas + Efectivo puede avanzar libre por los pasos
    // intermedios (esContraentrega hace que el bloque de arriba no le
    // exija nada) — pero llegar a "Entregado" sí exige que la primera
    // cuota esté confirmada. Es bloqueante nada más: a diferencia de la
    // contraentrega de pago completo (más abajo), aquí nunca se
    // auto-confirma nada, siempre es una acción manual del admin en Pagos. ──
    if (nuevoEstado === 'Entregado' && esCuotas && esContraentrega) {
      const primeraCuotaRes = await client.query(
        `SELECT estado FROM "PagosAbonos" WHERE id_venta=$1 AND num_cuota=1`,
        [id_venta]
      );
      const primeraConfirmada = primeraCuotaRes.rows[0]?.estado === 'Confirmado';
      if (!primeraConfirmada) {
        throw {
          status: 400,
          message: `Este pedido es a cuotas y la primera cuota todavía no está confirmada. Confírmala desde Pagos antes de marcarlo como Entregado.`,
        };
      }
    }

    const result = await client.query(`
      UPDATE "Pedidos" SET estado_pedido=$1, fecha_actualizacion=now()
      WHERE id_pedido=$2 RETURNING *
    `, [nuevoEstado, id_pedido]);

    await client.query(`
      INSERT INTO "PedidosHistorial" (id_pedido, estado, fecha, id_usuario)
      VALUES ($1,$2,now(),$3)
    `, [id_pedido, nuevoEstado, id_usuario || null]);

    // ── CORREGIDO: en contraentrega, entregar y cobrar son el mismo
    // momento. Si se marca "Entregado" y el pago de esa venta todavía no
    // estaba confirmado, se confirma solo — sin obligar al admin a repetir
    // el mismo paso a mano en Pagos.
    //
    // Antes esto reimplementaba a mano "confirmar abonos pendientes +
    // completar el saldo + marcar Pagado", SIN el paso de descontar el
    // stock diferido (una venta por Transferencia que nunca tuvo su stock
    // descontado, entregada luego contraentrega en efectivo, se habría
    // marcado Pagado sin nunca bajar el stock). Ahora usa la misma función
    // compartida que Ventas y Pagos, que sí incluye ese paso — la tercera
    // copia de esta lógica queda eliminada. ──
    // ── CORREGIDO: se agrega "!esCuotas" — antes, si una venta a cuotas
    // tenía "Efectivo" como método (ej. así se pagó la cuota inicial), este
    // bloque la habría confundido con contraentrega real y habría
    // auto-confirmado TODAS las cuotas restantes solo por marcar
    // "Entregado". A cuotas nunca se auto-confirma nada — ver el cambio de
    // arriba en la validación de avance. ──
    let pagoRecienConfirmado = false;
    if (nuevoEstado === 'Entregado' && esContraentrega && !esCuotas && estado_venta !== 'Pagado') {
      await client.query(
        `UPDATE "PagosAbonos" SET estado='Confirmado' WHERE id_venta=$1 AND estado='Pendiente'`,
        [id_venta]
      );
      const abonadoRes = await client.query(
        `SELECT COALESCE(SUM(monto),0) AS abonado FROM "PagosAbonos" WHERE id_venta=$1 AND estado='Confirmado'`,
        [id_venta]
      );
      const ventaRes = await client.query(`SELECT total FROM "Ventas" WHERE id_venta=$1`, [id_venta]);
      const abonado = Number(abonadoRes.rows[0].abonado) || 0;
      const saldo = Number(ventaRes.rows[0].total) - abonado;
      if (saldo > 0.01) {
        // ── CORREGIDO: mismo bug de "tipo='Abono'" sin importar el tipo
        // real de venta — esta rama es solo contraentrega de pago completo
        // (cuotas queda excluida más arriba), así que corresponde
        // "Pago completo". ──
        await client.query(`
          INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha)
          VALUES ($1,$2,'Pago completo','Efectivo','Confirmado',now())
        `, [id_venta, saldo]);
      }
      const tipoResultado = await evaluarYMarcarPagada(client, id_venta);
      pagoRecienConfirmado = tipoResultado === 'completo';
    }

    await client.query('COMMIT');

    // ── NUEVO: notificar al cliente (después del COMMIT, sin bloquear la respuesta) ──
    notificarCambioEstado(id_pedido, nuevoEstado);
    if (pagoRecienConfirmado) notificarComprobantePago(id_venta);

    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

// ── NUEVO: editar un pedido — conectado a Ventas, porque un Pedido no es
// más que el seguimiento de envío de una Venta real. Editar acá edita la
// misma Venta/DetalleVenta de una vez, sin una copia aparte de los datos.
//
// Reglas de negocio (a propósito, no un CRUD libre):
// - Solo pedidos "Pendiente" o "En preparación" — ya en camino no tiene
//   sentido seguir cambiando qué se pidió.
// - Los productos ya existentes en la venta quedan intocables (ni
//   cantidad ni precio ni se pueden quitar) — edición solo puede AGREGAR
//   líneas nuevas, nunca reducir lo ya vendido.
// - El costo total nunca puede bajar como consecuencia de editar — como
//   solo se agregan líneas (nunca se quitan ni se bajan), sube o se
//   queda igual, nunca baja, por construcción.
// - Dirección/observaciones/método de pago sí se pueden cambiar libremente.
const editarPedido = async (id_pedido, datos) => {
  const { direccion_entrega, observaciones, metodo_pago, nuevos_items } = datos;
  if (!direccion_entrega?.trim()) throw { status: 400, message: 'La dirección de entrega es obligatoria' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(`
      SELECT p.estado_pedido, v.id_venta, v.subtotal, v.descuento, v.impuesto, v.tipo_pago, v.stock_descontado
      FROM "Pedidos" p JOIN "Ventas" v ON p.id_venta = v.id_venta
      WHERE p.id_pedido = $1 FOR UPDATE OF p
    `, [id_pedido]);
    if (!actual.rows.length) throw { status: 404, message: 'Pedido no encontrado' };
    const pedido = actual.rows[0];

    if (!['Pendiente', 'En preparación'].includes(pedido.estado_pedido)) {
      throw { status: 400, message: `Solo se pueden editar pedidos en estado "Pendiente" o "En preparación" (este está "${pedido.estado_pedido}").` };
    }

    await client.query(`
      UPDATE "Ventas" SET direccion_entrega=$1, observaciones=$2, metodo_pago=$3 WHERE id_venta=$4
    `, [direccion_entrega.trim(), observaciones?.trim() || null, metodo_pago || null, pedido.id_venta]);

    let sumaNuevosItems = 0;
    for (const item of (nuevos_items || [])) {
      const cantidad = Number(item.cantidad);
      const precio_unitario = Number(item.precio_unitario);
      if (!item.id_producto || !cantidad || cantidad <= 0) {
        throw { status: 400, message: 'Producto o cantidad inválida en un producto agregado.' };
      }
      if (!precio_unitario || precio_unitario <= 0) {
        throw { status: 400, message: 'El precio unitario de un producto agregado debe ser mayor a $0.' };
      }

      if (item.id_variante) {
        const stockRes = await client.query(
          `SELECT stock FROM "ProductoVariantes" WHERE id_variante=$1 FOR UPDATE`,
          [item.id_variante]
        );
        const stockDisponible = stockRes.rows[0]?.stock ?? 0;
        if (stockDisponible < cantidad) {
          throw { status: 400, message: `Stock insuficiente para la variante seleccionada. Disponible: ${stockDisponible}.` };
        }
      }

      const subtotalLinea = cantidad * precio_unitario;
      await client.query(`
        INSERT INTO "DetalleVenta" (id_venta, id_producto, id_variante, cantidad, precio_unitario, descuento_linea, subtotal)
        VALUES ($1,$2,$3,$4,$5,0,$6)
      `, [pedido.id_venta, item.id_producto, item.id_variante || null, cantidad, precio_unitario, subtotalLinea]);

      // Si el stock de esta venta ya se descuenta de inmediato (contraentrega,
      // o transferencia ya confirmada), el producto agregado se descuenta ya
      // mismo también. Si todavía está diferido, se deja igual — se
      // descontará junto con el resto cuando se confirme el pago
      // (descontarStockSiHaceFalta ya recorre TODAS las líneas de la venta
      // en ese momento, así que esta línea nueva queda cubierta sola). ──
      if (pedido.stock_descontado && item.id_variante) {
        await client.query(`UPDATE "ProductoVariantes" SET stock = stock - $1 WHERE id_variante=$2`, [cantidad, item.id_variante]);
      }
      sumaNuevosItems += subtotalLinea;
    }

    if (sumaNuevosItems > 0) {
      const nuevoSubtotal = Number(pedido.subtotal) + sumaNuevosItems;
      const nuevoTotal = nuevoSubtotal - Number(pedido.descuento) + Number(pedido.impuesto);
      await client.query(`UPDATE "Ventas" SET subtotal=$1, total=$2 WHERE id_venta=$3`, [nuevoSubtotal, nuevoTotal, pedido.id_venta]);

      // El saldo por cobrar sube en la misma medida — se reparte sobre lo
      // que todavía esté Pendiente de cobrar, sin tocar lo ya confirmado.
      if (pedido.tipo_pago === 'cuotas') {
        const cuotasPendientes = await client.query(
          `SELECT id_pago FROM "PagosAbonos" WHERE id_venta=$1 AND estado='Pendiente' ORDER BY num_cuota ASC`,
          [pedido.id_venta]
        );
        if (cuotasPendientes.rows.length > 0) {
          const n = cuotasPendientes.rows.length;
          const base = Math.floor(sumaNuevosItems / n);
          const resto = sumaNuevosItems - base * n;
          for (let i = 0; i < n; i++) {
            const incremento = base + (i === n - 1 ? resto : 0);
            await client.query(`UPDATE "PagosAbonos" SET monto = monto + $1 WHERE id_pago=$2`, [incremento, cuotasPendientes.rows[i].id_pago]);
          }
        } else {
          // Todas las cuotas ya estaban confirmadas — se agrega una cuota
          // extra pendiente por el valor de lo nuevo, sin tocar el
          // calendario de las cuotas ya pactadas.
          const maxCuotaRes = await client.query(`SELECT COALESCE(MAX(num_cuota),0) AS max FROM "PagosAbonos" WHERE id_venta=$1`, [pedido.id_venta]);
          const siguienteCuota = Number(maxCuotaRes.rows[0].max) + 1;
          await client.query(`
            INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha, num_cuota)
            VALUES ($1,$2,'Abono',$3,'Pendiente',now(),$4)
          `, [pedido.id_venta, sumaNuevosItems, metodo_pago || 'Efectivo', siguienteCuota]);
          await client.query(`UPDATE "Ventas" SET num_cuotas=$1 WHERE id_venta=$2`, [siguienteCuota, pedido.id_venta]);
        }
      } else {
        const bump = await client.query(
          `UPDATE "PagosAbonos" SET monto = monto + $1 WHERE id_venta=$2 AND estado='Pendiente' RETURNING id_pago`,
          [sumaNuevosItems, pedido.id_venta]
        );
        if (bump.rows.length === 0) {
          await client.query(`
            INSERT INTO "PagosAbonos" (id_venta, monto, tipo, metodo, estado, fecha)
            VALUES ($1,$2,'Pago completo',$3,'Pendiente',now())
          `, [pedido.id_venta, sumaNuevosItems, metodo_pago || 'Efectivo']);
        }
      }

      // Si la venta ya se había marcado "Pagado", con el producto nuevo ya
      // no lo está de verdad — vuelve a "Confirmado" para que el saldo
      // pendiente recién creado se vea y se pueda cobrar desde Pagos.
      await client.query(`UPDATE "Ventas" SET estado='Confirmado' WHERE id_venta=$1 AND estado='Pagado'`, [pedido.id_venta]);
    }

    await client.query('COMMIT');
    return await getPedidoById(id_pedido);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getPedidos, getPedidoById, getHistorial, cambiarEstadoPedido, editarPedido, ESTADOS_VALIDOS };