// src/models/venta.model.js
// Tabla: Ventas
// PK: id_venta
// Columnas: id_venta, id_cliente, subtotal, descuento, impuesto,
//           total, estado, fecha, observaciones

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class VentaModel extends BaseModel {
  constructor() {
    super('Ventas', 'id_venta');
  }

  async findAllConCliente() {
    const result = await pool.query(
      `SELECT v.*, c.nombre AS cliente, c.tipo_cliente,
              c.permiso_pagos, c.email AS cliente_email
       FROM "Ventas" v
       JOIN "Clientes" c ON v.id_cliente = c.id_cliente
       ORDER BY v.id_venta DESC`
    );
    return result.rows;
  }

  async findByIdConDetalle(id) {
    const cab = await pool.query(
      `SELECT v.*, c.nombre AS cliente, c.permiso_pagos
       FROM "Ventas" v
       JOIN "Clientes" c ON v.id_cliente = c.id_cliente
       WHERE v.id_venta = $1`, [id]
    );
    if (!cab.rows.length) return null;
    const det = await pool.query(
      `SELECT dv.*, p.nombre AS producto, p.talla
       FROM "DetalleVenta" dv
       JOIN "Productos" p ON dv.id_producto = p.id_producto
       WHERE dv.id_venta = $1`, [id]
    );
    return { ...cab.rows[0], items: det.rows };
  }

  async findByCliente(id_cliente) {
    const result = await pool.query(
      `SELECT * FROM "Ventas" WHERE id_cliente = $1 ORDER BY fecha DESC`, [id_cliente]
    );
    return result.rows;
  }

  async cambiarEstado(id, estado) {
    const result = await pool.query(
      `UPDATE "Ventas" SET estado = $1 WHERE id_venta = $2 RETURNING *`,
      [estado, id]
    );
    return result.rows[0] || null;
  }

  async recalcularTotales(client, id_venta) {
    await client.query(
      `UPDATE "Ventas" SET
        subtotal = (SELECT COALESCE(SUM(subtotal),0) FROM "DetalleVenta" WHERE id_venta=$1),
        total    = (SELECT COALESCE(SUM(subtotal),0) FROM "DetalleVenta" WHERE id_venta=$1) - descuento + impuesto
       WHERE id_venta=$1`, [id_venta]
    );
  }
}

module.exports = new VentaModel();
