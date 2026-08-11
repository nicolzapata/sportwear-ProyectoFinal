// src/services/compras.service.js
const pool = require('../config/db');

const getCompras = async ({ page, limit, q } = {}) => {
  const params = [];
  let busquedaSql = '';
  if (q) {
    params.push(`%${q}%`);
    busquedaSql = `WHERE (p.razon_social ILIKE $${params.length} OR p.nombre_comercial ILIKE $${params.length} OR c.numero_orden ILIKE $${params.length} OR CAST(c.id_compra AS TEXT) = $${params.length + 1})`;
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

  const cab = await pool.query(`
    SELECT c.*, p.razon_social AS proveedor, p.nombre_comercial
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "Compras" c
    JOIN "Proveedores" p ON c.id_proveedor = p.id_proveedor
    ${busquedaSql}
    ORDER BY c.id_compra DESC
    ${limitOffsetSql}
  `, params);

  const total = cab.rows[0] ? Number(cab.rows[0].total_count) : 0;
  const filas = cab.rows.map(({ total_count, ...r }) => r);

  const ids = filas.map(c => c.id_compra);
  let detalles = [];
  if (ids.length) {
    const det = await pool.query(`
      SELECT dc.*, pr.nombre AS producto, v.talla AS talla, col.nombre AS color
      FROM "DetalleCompra" dc
      JOIN "Productos" pr ON dc.id_producto = pr.id_producto
      LEFT JOIN "ProductoVariantes" v ON dc.id_variante = v.id_variante
      LEFT JOIN "Colores" col ON v.id_color = col.id_color
      WHERE dc.id_compra = ANY($1::int[])
    `, [ids]);
    detalles = det.rows;
  }
  const data = filas.map(c => ({ ...c, items: detalles.filter(d => d.id_compra === c.id_compra) }));

  if (!paginar) return data;
  return { data, total };
};

const getCompraById = async (id) => {
  const cab = await pool.query(`
    SELECT c.*, p.razon_social AS proveedor
    FROM "Compras" c
    JOIN "Proveedores" p ON c.id_proveedor = p.id_proveedor
    WHERE c.id_compra = $1
  `, [id]);
  if (!cab.rows.length) throw { status: 404, message: 'No encontrada' };
  const det = await pool.query(`
    SELECT dc.*, pr.nombre AS producto, v.talla AS talla, col.nombre AS color
    FROM "DetalleCompra" dc
    JOIN "Productos" pr ON dc.id_producto = pr.id_producto
    LEFT JOIN "ProductoVariantes" v ON dc.id_variante = v.id_variante
    LEFT JOIN "Colores" col ON v.id_color = col.id_color
    WHERE dc.id_compra = $1
  `, [id]);
  return { ...cab.rows[0], items: det.rows };
};

const crearCompra = async (datos) => {
  const { id_proveedor, numero_orden, descuento, estado, fecha, observaciones, items } = datos;
  if (!items || !items.length) throw { status: 400, message: 'Debe incluir al menos un producto' };
  if (!id_proveedor) throw { status: 400, message: 'El proveedor es requerido' };

  // ── no se permiten compras con fecha futura ──
  const fechaCompra = fecha ? new Date(fecha) : new Date();
  const hoy = new Date(); hoy.setHours(23, 59, 59, 999); // permite cualquier hora del día de hoy
  if (fechaCompra > hoy) throw { status: 400, message: 'La fecha de la compra no puede ser futura.' };

  // ── "impuesto" ya no se pide en el formulario — siempre 0 para
  // compras nuevas (se deja la columna en la BD por si algo más la referencia). ──
  const impuesto = 0;

  const subtotal = items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);
  const total    = subtotal - (descuento || 0) + impuesto;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const compra = await client.query(`
      INSERT INTO "Compras"
        (id_proveedor, numero_orden, subtotal, descuento, impuesto, total, estado, fecha, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [id_proveedor, numero_orden || null, subtotal, descuento || 0, impuesto, total,
        estado || 'Pendiente', fecha || new Date(), observaciones || null]);

    const id_compra = compra.rows[0].id_compra;
    for (const item of items) {
      // ── "descuento_linea" ya no se usa como descuento — esa celda ahora
      // es "Valor de venta" (precio_venta), el precio al que se venderá la unidad. ──
      const subtotalLinea = item.cantidad * item.precio_unitario;
      await client.query(`
        INSERT INTO "DetalleCompra" (id_compra, id_producto, id_variante, cantidad, precio_unitario, precio_venta, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [id_compra, item.id_producto, item.id_variante || null, item.cantidad, item.precio_unitario, item.precio_venta || null, subtotalLinea]);
    }
    await client.query('COMMIT');
    return { ...compra.rows[0], items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

// ── edición completa de una compra (solo si NO está Recibida ni Anulada) ──
const actualizarCompra = async (id, datos) => {
  const { id_proveedor, numero_orden, descuento, fecha, observaciones, items } = datos;
  if (!items || !items.length) throw { status: 400, message: 'Debe incluir al menos un producto' };
  if (!id_proveedor) throw { status: 400, message: 'El proveedor es requerido' };

  if (fecha) {
    const fechaCompra = new Date(fecha);
    const hoy = new Date(); hoy.setHours(23, 59, 59, 999);
    if (fechaCompra > hoy) throw { status: 400, message: 'La fecha de la compra no puede ser futura.' };
  }

  const impuesto = 0;
  const subtotal = items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);
  const total    = subtotal - (descuento || 0) + impuesto;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(
      `SELECT * FROM "Compras" WHERE id_compra=$1 FOR UPDATE`,
      [id]
    );
    if (!actual.rows.length) throw { status: 404, message: 'No encontrada' };
    const estadoActual = actual.rows[0].estado;

    if (estadoActual === 'Recibido' || estadoActual === 'Anulado') {
      throw { status: 400, message: `No se puede editar una compra en estado "${estadoActual}".` };
    }

    // Reemplaza los items dentro de la misma transacción
    await client.query(`DELETE FROM "DetalleCompra" WHERE id_compra=$1`, [id]);

    for (const item of items) {
      const subtotalLinea = item.cantidad * item.precio_unitario;
      await client.query(`
        INSERT INTO "DetalleCompra" (id_compra, id_producto, id_variante, cantidad, precio_unitario, precio_venta, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [id, item.id_producto, item.id_variante || null, item.cantidad, item.precio_unitario, item.precio_venta || null, subtotalLinea]);
    }

    const result = await client.query(`
      UPDATE "Compras"
      SET id_proveedor=$1, numero_orden=$2, subtotal=$3, descuento=$4, impuesto=$5, total=$6, fecha=$7, observaciones=$8
      WHERE id_compra=$9 RETURNING *
    `, [id_proveedor, numero_orden || null, subtotal, descuento || 0, impuesto, total,
        fecha || actual.rows[0].fecha, observaciones || null, id]);

    await client.query('COMMIT');
    return { ...result.rows[0], items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const cambiarEstado = async (id, estado) => {
  if (!estado) throw { status: 400, message: 'Estado requerido' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(
      `SELECT * FROM "Compras" WHERE id_compra=$1 FOR UPDATE`,
      [id]
    );
    if (!actual.rows.length) throw { status: 404, message: 'No encontrada' };
    const estadoAnterior = actual.rows[0].estado;

    if (estadoAnterior === 'Anulado')
      throw { status: 400, message: 'No se puede modificar una compra anulada' };

    const result = await client.query(
      `UPDATE "Compras" SET estado=$1 WHERE id_compra=$2 RETURNING *`,
      [estado, id]
    );

    // Al recibir la compra (y solo la primera vez), sumar las existencias al inventario
    // y actualizar el precio de venta.
    if (estado === 'Recibido' && estadoAnterior !== 'Recibido') {
      const detalles = await client.query(
        `SELECT id_producto, id_variante, cantidad, precio_venta FROM "DetalleCompra" WHERE id_compra=$1`,
        [id]
      );
      for (const item of detalles.rows) {
        if (item.id_variante) {
          await client.query(
            `UPDATE "ProductoVariantes" SET stock = stock + $1 WHERE id_variante = $2`,
            [item.cantidad, item.id_variante]
          );
        }

        if (item.precio_venta !== null && item.precio_venta !== undefined) {
          // ── CORREGIDO: antes esto SIEMPRE actualizaba "Productos.precio"
          // (el precio de TODO el producto), sin importar la variante — así
          // que si una misma compra traía, por ejemplo, la talla S a $20.000
          // y la talla M a $25.000, la última línea procesada pisaba a la
          // anterior y el producto completo terminaba con un solo precio,
          // perdiendo la diferencia entre variantes.
          //
          // Ahora: si la línea tiene una variante asociada, el precio se
          // guarda en esa variante puntual (ProductoVariantes.precio) — cada
          // talla/color puede tener su propio precio. Si la línea no tiene
          // variante (producto sin tallas/colores), se sigue actualizando
          // el precio general del producto, como respaldo. ──
          if (item.id_variante) {
            await client.query(
              `UPDATE "ProductoVariantes" SET precio = $1 WHERE id_variante = $2`,
              [item.precio_venta, item.id_variante]
            );
          } else {
            await client.query(
              `UPDATE "Productos" SET precio = $1 WHERE id_producto = $2`,
              [item.precio_venta, item.id_producto]
            );
          }
        }
      }
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getCompras, getCompraById, crearCompra, actualizarCompra, cambiarEstado };