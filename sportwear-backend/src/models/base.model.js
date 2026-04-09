// src/models/base.model.js
const pool = require('../config/db');

class BaseModel {
  constructor(tabla, pk) {
    this.tabla = tabla;
    this.pk    = pk;
    this.pool  = pool;
  }

  async findAll(orderBy = '1 DESC') {
    const result = await this.pool.query(
      `SELECT * FROM "${this.tabla}" ORDER BY ${orderBy}`
    );
    return result.rows;
  }

  async findById(id) {
    const result = await this.pool.query(
      `SELECT * FROM "${this.tabla}" WHERE "${this.pk}" = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async findBy(campo, valor) {
    const result = await this.pool.query(
      `SELECT * FROM "${this.tabla}" WHERE "${campo}" = $1`, [valor]
    );
    return result.rows;
  }

  async findOneBy(campo, valor) {
    const result = await this.pool.query(
      `SELECT * FROM "${this.tabla}" WHERE "${campo}" = $1 LIMIT 1`, [valor]
    );
    return result.rows[0] || null;
  }

  async create(datos) {
    const campos  = Object.keys(datos);
    const valores = Object.values(datos);
    const cols    = campos.map(c => `"${c}"`).join(', ');
    const params  = campos.map((_, i) => `$${i + 1}`).join(', ');
    const result  = await this.pool.query(
      `INSERT INTO "${this.tabla}" (${cols}) VALUES (${params}) RETURNING *`, valores
    );
    return result.rows[0];
  }

  async update(id, datos) {
    const campos  = Object.keys(datos);
    const valores = Object.values(datos);
    const sets    = campos.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
    const result  = await this.pool.query(
      `UPDATE "${this.tabla}" SET ${sets} WHERE "${this.pk}" = $${campos.length + 1} RETURNING *`,
      [...valores, id]
    );
    return result.rows[0] || null;
  }

  async delete(id) {
    const result = await this.pool.query(
      `DELETE FROM "${this.tabla}" WHERE "${this.pk}" = $1 RETURNING *`, [id]
    );
    return result.rows[0] || null;
  }

  async toggleEstado(id) {
    const result = await this.pool.query(
      `UPDATE "${this.tabla}"
       SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
       WHERE "${this.pk}" = $1 RETURNING *`, [id]
    );
    return result.rows[0] || null;
  }

  async count(where = '', params = []) {
    const result = await this.pool.query(
      `SELECT COUNT(*) AS total FROM "${this.tabla}" ${where}`, params
    );
    return parseInt(result.rows[0].total);
  }
}

module.exports = BaseModel;
