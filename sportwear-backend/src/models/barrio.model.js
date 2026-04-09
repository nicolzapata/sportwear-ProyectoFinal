// src/models/barrio.model.js
// Tabla: Barrios
// PK: id_barrio
// Columnas: id_barrio, nombre, comuna, zona

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class BarrioModel extends BaseModel {
  constructor() {
    super('Barrios', 'id_barrio');
  }

  async findAll() {
    const result = await pool.query(
      `SELECT id_barrio, nombre, comuna, zona
       FROM "Barrios" ORDER BY comuna ASC, nombre ASC`
    );
    return result.rows;
  }

  async findByComuna(comuna) {
    const result = await pool.query(
      `SELECT * FROM "Barrios" WHERE comuna = $1 ORDER BY nombre ASC`, [comuna]
    );
    return result.rows;
  }
}

module.exports = new BarrioModel();
