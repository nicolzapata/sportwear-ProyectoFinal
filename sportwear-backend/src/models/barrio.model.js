// src/models/barrio.model.js
// Tabla: Barrios
// PK: id_barrio
// Columnas: id_barrio, nombre, zona

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class BarrioModel extends BaseModel {
  constructor() {
    super('Barrios', 'id_barrio');
  }

  async findAll() {
    const result = await pool.query(
      `SELECT id_barrio, nombre, zona
       FROM "Barrios" ORDER BY nombre ASC`
    );
    return result.rows;
  }
}

module.exports = new BarrioModel();
