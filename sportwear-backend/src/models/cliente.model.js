// src/models/cliente.model.js
// Tabla: Clientes
// PK: id_cliente
// Columnas: id_cliente, nombre, tipo_doc, documento, telefono, email,
//           ciudad, id_barrio, direccion, tipo_cliente,
//           permiso_pagos, estado, fecha_registro

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class ClienteModel extends BaseModel {
  constructor() {
    super('Clientes', 'id_cliente');
  }

  async findAllConBarrio() {
    const result = await pool.query(
      `SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
       FROM "Clientes" cl
       LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
       ORDER BY cl.id_cliente DESC`
    );
    return result.rows;
  }

  async findByIdConBarrio(id) {
    const result = await pool.query(
      `SELECT cl.*, b.nombre AS barrio_nombre, b.comuna, b.zona
       FROM "Clientes" cl
       LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
       WHERE cl.id_cliente = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByDocumento(documento) {
    return await this.findOneBy('documento', documento);
  }

  async findByEmail(email) {
    return await this.findOneBy('email', email);
  }

  async togglePermisoPagos(id) {
    const result = await pool.query(
      `UPDATE "Clientes" SET permiso_pagos = NOT permiso_pagos
       WHERE id_cliente = $1 RETURNING id_cliente, permiso_pagos`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findActivos() {
    const result = await pool.query(
      `SELECT * FROM "Clientes" WHERE estado = 'Activo' ORDER BY nombre ASC`
    );
    return result.rows;
  }
}

module.exports = new ClienteModel();
