// src/models/proveedor.model.js
// Tabla: Proveedores
// PK: id_proveedor
// Columnas: id_proveedor, tipo_doc, numero_doc, razon_social, nombre_comercial,
//           nombre_contacto, cargo_contacto, telefono_celular, email_contacto,
//           ciudad, departamento, pais, direccion, banco, tipo_cuenta,
//           numero_cuenta, titular_cuenta, plazo_pago_dias, condiciones,
//           estado, fecha_registro

const BaseModel = require('./base.model');
const pool      = require('../config/db');

class ProveedorModel extends BaseModel {
  constructor() {
    super('Proveedores', 'id_proveedor');
  }

  async findActivos() {
    const result = await pool.query(
      `SELECT * FROM "Proveedores" WHERE estado = 'Activo' ORDER BY razon_social ASC`
    );
    return result.rows;
  }

  async findByNumeroDoc(numero_doc) {
    return await this.findOneBy('numero_doc', numero_doc);
  }
}

module.exports = new ProveedorModel();
