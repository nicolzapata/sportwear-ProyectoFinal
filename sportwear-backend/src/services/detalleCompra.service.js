// src/services/detalleCompra.service.js
const pool = require('../config/db');

const recalcular = async (client, id_compra) => {
  await client.query(`
    UPDATE "Compras" SET
      subtotal = (SELECT COALESCE(SUM(cantidad*precio_unitario-descuento_linea),0) FROM "DetalleCompra" WHERE id_compra=$1),
      total    = (SELECT COALESCE(SUM(cantidad*precio_unitario-descuento_linea),0) FROM "DetalleCompra" WHERE id_compra=$1) - descuento + impuesto
    WHERE id_compra=$1
  `, [id_compra]);
};

const getDetalles = async (id_compra) => {
  const params = [];
  let where = '';
  if (id_compra) { where = 'WHERE dc.id_compra=$1'; params.push(id_compra); }
  const result = await pool.query(`
    SELECT dc.*, p.nombre AS producto, p.talla, cat.nombre AS categoria,
           c.numero_orden, c.fecha AS fecha_compra, c.estado AS estado_compra,
           pr.razon_social AS proveedor
    FROM "DetalleCompra" dc
    JOIN "Productos"   p   ON dc.id_producto = p.id_producto
    JOIN "Categorias"  cat ON p.id_categoria = cat.id_categoria
    JOIN "Compras"     c   ON dc.id_compra   = c.id_compra
    JOIN "Proveedores" pr  ON c.id_proveedor = pr.id_proveedor
    ${where} ORDER BY dc.id_detalle_compra
  `, params);
  return result.rows;
};

const getDetalleById = async (id) => {
  const result = await pool.query(`
    SELECT dc.*, p.nombre AS producto, p.talla, cat.nombre AS categoria,
           c.numero_orden, c.fecha AS fecha_compra, pr.razon_social AS proveedor
    FROM "DetalleCompra" dc
    JOIN "Productos"   p   ON dc.id_producto = p.id_producto
    JOIN "Categorias"  cat ON p.id_categoria = cat.id_categoria
    JOIN "Compras"     c   ON dc.id_compra   = c.id_compra
    JOIN "Proveedores" pr  ON c.id_proveedor = pr.id_proveedor
    WHERE dc.id_detalle_compra=$1
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const crearDetalle = async (datos) => {
  const { id_compra, id_producto, cantidad, precio_unitario, descuento_linea } = datos;
  if (!id_compra || !id_producto || !cantidad || !precio_unitario)
    throw { status: 400, message: 'Faltan campos obligatorios' };

  const client = await pool.connect();
  try {
    const compra = await client.query(`SELECT estado FROM "Compras" WHERE id_compra=$1`, [id_compra]);
    if (!compra.rows.length) throw { status: 404, message: 'Compra no encontrada' };
    if (['Anulado', 'Recibido'].includes(compra.rows[0].estado))
      throw { status: 400, message: `Compra en estado "${compra.rows[0].estado}", no se pueden agregar items` };

    await client.query('BEGIN');
    const result = await client.query(`
      INSERT INTO "DetalleCompra" (id_compra, id_producto, cantidad, precio_unitario, descuento_linea)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [id_compra, id_producto, cantidad, precio_unitario, descuento_linea || 0]);
    await recalcular(client, id_compra);
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
      SELECT c.estado, dc.id_compra FROM "DetalleCompra" dc
      JOIN "Compras" c ON dc.id_compra=c.id_compra WHERE dc.id_detalle_compra=$1
    `, [id]);
    if (!check.rows.length) throw { status: 404, message: 'No encontrado' };
    if (['Anulado', 'Recibido'].includes(check.rows[0].estado))
      throw { status: 400, message: `No se puede editar item de compra "${check.rows[0].estado}"` };

    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE "DetalleCompra" SET cantidad=$1, precio_unitario=$2, descuento_linea=$3
      WHERE id_detalle_compra=$4 RETURNING *
    `, [cantidad, precio_unitario, descuento_linea || 0, id]);
    await recalcular(client, check.rows[0].id_compra);
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
      SELECT c.estado, dc.id_compra FROM "DetalleCompra" dc
      JOIN "Compras" c ON dc.id_compra=c.id_compra WHERE dc.id_detalle_compra=$1
    `, [id]);
    if (!check.rows.length) throw { status: 404, message: 'No encontrado' };
    if (['Anulado', 'Recibido'].includes(check.rows[0].estado))
      throw { status: 400, message: `No se puede eliminar item de compra "${check.rows[0].estado}"` };

    await client.query('BEGIN');
    await client.query(`DELETE FROM "DetalleCompra" WHERE id_detalle_compra=$1`, [id]);
    await recalcular(client, check.rows[0].id_compra);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

module.exports = { getDetalles, getDetalleById, crearDetalle, actualizarDetalle, eliminarDetalle };