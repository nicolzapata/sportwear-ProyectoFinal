// src/services/detalleVenta.service.js
const pool = require('../config/db');

const recalcular = async (client, id_venta) => {
  await client.query(`
    UPDATE "Ventas" SET
      subtotal = (SELECT COALESCE(SUM(cantidad*precio_unitario-descuento_linea),0) FROM "DetalleVenta" WHERE id_venta=$1),
      total    = (SELECT COALESCE(SUM(cantidad*precio_unitario-descuento_linea),0) FROM "DetalleVenta" WHERE id_venta=$1) - descuento + impuesto
    WHERE id_venta=$1
  `, [id_venta]);
};

const getDetalles = async (id_venta) => {
  const params = [];
  let where = '';
  if (id_venta) { where = 'WHERE dv.id_venta=$1'; params.push(id_venta); }
  const result = await pool.query(`
    SELECT dv.*, p.nombre AS producto, p.talla,
           cat.nombre AS categoria, col.nombre AS color, col.codigo_hex,
           v.fecha AS fecha_venta, v.estado AS estado_venta, c.nombre AS cliente
    FROM "DetalleVenta" dv
    JOIN "Productos"  p   ON dv.id_producto=p.id_producto
    JOIN "Categorias" cat ON p.id_categoria=cat.id_categoria
    LEFT JOIN "Colores" col ON p.id_color=col.id_color
    JOIN "Ventas"     v   ON dv.id_venta=v.id_venta
    JOIN "Clientes"   c   ON v.id_cliente=c.id_cliente
    ${where} ORDER BY dv.id_detalle_venta
  `, params);
  return result.rows;
};

const getDetalleById = async (id) => {
  const result = await pool.query(`
    SELECT dv.*, p.nombre AS producto, p.talla, p.precio AS precio_catalogo,
           cat.nombre AS categoria, col.nombre AS color, col.codigo_hex,
           v.fecha AS fecha_venta, v.estado AS estado_venta, c.nombre AS cliente
    FROM "DetalleVenta" dv
    JOIN "Productos"  p   ON dv.id_producto=p.id_producto
    JOIN "Categorias" cat ON p.id_categoria=cat.id_categoria
    LEFT JOIN "Colores" col ON p.id_color=col.id_color
    JOIN "Ventas"     v   ON dv.id_venta=v.id_venta
    JOIN "Clientes"   c   ON v.id_cliente=c.id_cliente
    WHERE dv.id_detalle_venta=$1
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const crearDetalle = async (datos) => {
  const { id_venta, id_producto, cantidad, precio_unitario, descuento_linea } = datos;
  if (!id_venta || !id_producto || !cantidad || !precio_unitario)
    throw { status: 400, message: 'Faltan campos obligatorios' };

  const client = await pool.connect();
  try {
    const venta = await client.query(`SELECT estado FROM "Ventas" WHERE id_venta=$1`, [id_venta]);
    if (!venta.rows.length) throw { status: 404, message: 'Venta no encontrada' };
    if (['Anulado', 'Pagado'].includes(venta.rows[0].estado))
      throw { status: 400, message: `Venta en estado "${venta.rows[0].estado}"` };

    const stockRes = await client.query(`SELECT stock FROM "Productos" WHERE id_producto=$1`, [id_producto]);
    const stock = stockRes.rows[0]?.stock ?? 0;
    if (stock < cantidad) throw { status: 400, message: `Stock insuficiente. Disponible: ${stock}` };

    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO "DetalleVenta" (id_venta, id_producto, cantidad, precio_unitario, descuento_linea)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [id_venta, id_producto, cantidad, precio_unitario, descuento_linea || 0]);
    await client.query(`UPDATE "Productos" SET stock=stock-$1 WHERE id_producto=$2`, [cantidad, id_producto]);
    await recalcular(client, id_venta);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const actualizarDetalle = async (id, { cantidad, precio_unitario, descuento_linea }) => {
  const client = await pool.connect();
  try {
    const check = await client.query(`
      SELECT v.estado, dv.id_venta, dv.id_producto, dv.cantidad AS cant_actual
      FROM "DetalleVenta" dv JOIN "Ventas" v ON dv.id_venta=v.id_venta
      WHERE dv.id_detalle_venta=$1
    `, [id]);
    if (!check.rows.length) throw { status: 404, message: 'No encontrado' };
    if (['Anulado', 'Pagado'].includes(check.rows[0].estado))
      throw { status: 400, message: `Venta en estado "${check.rows[0].estado}"` };

    const { cant_actual, id_producto, id_venta } = check.rows[0];
    const diff = cantidad - cant_actual;
    if (diff > 0) {
      const stockRes = await client.query(`SELECT stock FROM "Productos" WHERE id_producto=$1`, [id_producto]);
      if ((stockRes.rows[0]?.stock ?? 0) < diff)
        throw { status: 400, message: `Stock insuficiente. Disponible extra: ${stockRes.rows[0]?.stock ?? 0}` };
    }

    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE "DetalleVenta" SET cantidad=$1, precio_unitario=$2, descuento_linea=$3
      WHERE id_detalle_venta=$4 RETURNING *
    `, [cantidad, precio_unitario, descuento_linea || 0, id]);
    await client.query(`UPDATE "Productos" SET stock=stock-$1 WHERE id_producto=$2`, [diff, id_producto]);
    await recalcular(client, id_venta);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const eliminarDetalle = async (id) => {
  const client = await pool.connect();
  try {
    const check = await client.query(`
      SELECT v.estado, dv.id_venta, dv.id_producto, dv.cantidad
      FROM "DetalleVenta" dv JOIN "Ventas" v ON dv.id_venta=v.id_venta
      WHERE dv.id_detalle_venta=$1
    `, [id]);
    if (!check.rows.length) throw { status: 404, message: 'No encontrado' };
    if (['Anulado', 'Pagado'].includes(check.rows[0].estado))
      throw { status: 400, message: `Venta en estado "${check.rows[0].estado}"` };

    const { id_venta, id_producto, cantidad } = check.rows[0];
    await client.query('BEGIN');
    await client.query(`DELETE FROM "DetalleVenta" WHERE id_detalle_venta=$1`, [id]);
    await client.query(`UPDATE "Productos" SET stock=stock+$1 WHERE id_producto=$2`, [cantidad, id_producto]);
    await recalcular(client, id_venta);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getDetalles, getDetalleById, crearDetalle, actualizarDetalle, eliminarDetalle };