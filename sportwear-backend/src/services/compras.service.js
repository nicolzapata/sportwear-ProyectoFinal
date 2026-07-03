// src/services/compras.service.js
const pool = require('../config/db');

const getCompras = async () => {
  const cab = await pool.query(`
    SELECT c.*, p.razon_social AS proveedor, p.nombre_comercial
    FROM "Compras" c
    JOIN "Proveedores" p ON c.id_proveedor = p.id_proveedor
    ORDER BY c.id_compra DESC
  `);
  const ids = cab.rows.map(c => c.id_compra);
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
  return cab.rows.map(c => ({ ...c, items: detalles.filter(d => d.id_compra === c.id_compra) }));
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
  const { id_proveedor, numero_orden, descuento, impuesto, estado, fecha, observaciones, items } = datos;
  if (!items || !items.length) throw { status: 400, message: 'Debe incluir al menos un producto' };
  if (!id_proveedor) throw { status: 400, message: 'El proveedor es requerido' };

  const subtotal = items.reduce((a, i) => a + i.cantidad * i.precio_unitario - (i.descuento_linea || 0), 0);
  const total    = subtotal - (descuento || 0) + (impuesto || 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const compra = await client.query(`
      INSERT INTO "Compras"
        (id_proveedor, numero_orden, subtotal, descuento, impuesto, total, estado, fecha, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [id_proveedor, numero_orden || null, subtotal, descuento || 0, impuesto || 0, total,
        estado || 'Pendiente', fecha || new Date(), observaciones || null]);

    const id_compra = compra.rows[0].id_compra;
    for (const item of items) {
      const subtotalLinea = item.cantidad * item.precio_unitario - (item.descuento_linea || 0);
      await client.query(`
        INSERT INTO "DetalleCompra" (id_compra, id_producto, id_variante, cantidad, precio_unitario, descuento_linea, subtotal)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [id_compra, item.id_producto, item.id_variante || null, item.cantidad, item.precio_unitario, item.descuento_linea || 0, subtotalLinea]);
    }
    await client.query('COMMIT');
    return { ...compra.rows[0], items };
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
    if (estado === 'Recibido' && estadoAnterior !== 'Recibido') {
      const detalles = await client.query(
        `SELECT id_variante, cantidad FROM "DetalleCompra" WHERE id_compra=$1`,
        [id]
      );
      for (const item of detalles.rows) {
        if (!item.id_variante) continue;
        await client.query(
          `UPDATE "ProductoVariantes" SET stock = stock + $1 WHERE id_variante = $2`,
          [item.cantidad, item.id_variante]
        );
      }
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getCompras, getCompraById, crearCompra, cambiarEstado };