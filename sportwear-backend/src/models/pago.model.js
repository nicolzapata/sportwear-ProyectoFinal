// src/models/pago.model.js
// Tabla: PagosAbonos
// PK: id_pago
// Columnas: id_pago, id_venta, monto, tipo, metodo,
//           referencia_pago, estado, fecha

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class PagoModel extends BaseModel {
  constructor() {
    super('PagosAbonos', 'id_pago');
  }

  async findAllConCliente() {
    const result = await pool.query(
      `SELECT pa.*, c.nombre AS cliente, c.permiso_pagos, c.tipo_cliente
       FROM "PagosAbonos" pa
       JOIN "Ventas"   v ON pa.id_venta  = v.id_venta
       JOIN "Clientes" c ON v.id_cliente = c.id_cliente
       ORDER BY pa.id_pago DESC`
    );
    return result.rows;
  }

  async findByVenta(id_venta) {
    const result = await pool.query(
      `SELECT * FROM "PagosAbonos" WHERE id_venta = $1 ORDER BY fecha ASC`,
      [id_venta]
    );
    return result.rows;
  }

  async totalPagadoPorVenta(id_venta) {
    const result = await pool.query(
      `SELECT COALESCE(SUM(monto),0) AS total_pagado
       FROM "PagosAbonos"
       WHERE id_venta = $1 AND estado = 'Aprobado'`,
      [id_venta]
    );
    return parseFloat(result.rows[0].total_pagado);
  }
}

module.exports = new PagoModel();
