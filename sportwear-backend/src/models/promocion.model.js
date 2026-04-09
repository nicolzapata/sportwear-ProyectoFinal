// src/models/promocion.model.js
// Tabla: Promociones
// PK: id_promocion
// Columnas: id_promocion, nombre, descripcion, tipo_descuento,
//           descuento, fecha_inicio, fecha_fin, estado

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class PromocionModel extends BaseModel {
  constructor() {
    super('Promociones', 'id_promocion');
  }

  async findActivas() {
    const result = await pool.query(
      `SELECT * FROM "Promociones"
       WHERE estado = 'Activo'
         AND fecha_inicio <= CURRENT_DATE
         AND fecha_fin    >= CURRENT_DATE
       ORDER BY fecha_fin ASC`
    );
    return result.rows;
  }

  async findVigentes() {
    const result = await pool.query(
      `SELECT * FROM "Promociones"
       WHERE fecha_inicio <= CURRENT_DATE AND fecha_fin >= CURRENT_DATE
       ORDER BY descuento DESC`
    );
    return result.rows;
  }
}

module.exports = new PromocionModel();
