// src/models/compra.model.js
// Tabla: Compras
// PK: id_compra
// Columnas: id_compra, id_proveedor, numero_orden, subtotal, descuento,
//           impuesto, total, estado, fecha, observaciones

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class CompraModel extends BaseModel {
  constructor() {
    super('Compras', 'id_compra');
  }

  async findAllConProveedor() {
    const result = await pool.query(
      `SELECT c.*, p.razon_social AS proveedor, p.nombre_comercial
       FROM "Compras" c
       JOIN "Proveedores" p ON c.id_proveedor = p.id_proveedor
       ORDER BY c.id_compra DESC`
    );
    return result.rows;
  }

  async findByIdConDetalle(id) {
    const cab = await pool.query(
      `SELECT c.*, p.razon_social AS proveedor
       FROM "Compras" c
       JOIN "Proveedores" p ON c.id_proveedor = p.id_proveedor
       WHERE c.id_compra = $1`, [id]
    );
    if (!cab.rows.length) return null;
    const det = await pool.query(
      `SELECT dc.*, pr.nombre AS producto, pr.talla
       FROM "DetalleCompra" dc
       JOIN "Productos" pr ON dc.id_producto = pr.id_producto
       WHERE dc.id_compra = $1`, [id]
    );
    return { ...cab.rows[0], items: det.rows };
  }

  async cambiarEstado(id, estado) {
    const result = await pool.query(
      `UPDATE "Compras" SET estado = $1 WHERE id_compra = $2 RETURNING *`,
      [estado, id]
    );
    return result.rows[0] || null;
  }

  async recalcularTotales(client, id_compra) {
    await client.query(
      `UPDATE "Compras" SET
        subtotal = (SELECT COALESCE(SUM(subtotal),0) FROM "DetalleCompra" WHERE id_compra=$1),
        total    = (SELECT COALESCE(SUM(subtotal),0) FROM "DetalleCompra" WHERE id_compra=$1) - descuento + impuesto
       WHERE id_compra=$1`, [id_compra]
    );
  }
}

module.exports = new CompraModel();
