// src/services/proveedores.service.js
const pool = require('../config/db');

const getProveedores = async () => {
  const result = await pool.query(`SELECT * FROM "Proveedores" ORDER BY id_proveedor DESC`);
  return result.rows;
};

const getProveedorById = async (id) => {
  const result = await pool.query(`SELECT * FROM "Proveedores" WHERE id_proveedor=$1`, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const crearProveedor = async (datos) => {
  const {
    tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
    nombre_contacto2, telefono_contacto2, email_contacto2,
    ciudad, departamento, pais, direccion,
    banco, tipo_cuenta, numero_cuenta, titular_cuenta,
    plazo_pago_dias, condiciones, estado
  } = datos;

  if (!razon_social || !numero_doc)
    throw { status: 400, message: 'Razón social y número de documento son requeridos' };

  const result = await pool.query(`
    INSERT INTO "Proveedores" (
      tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
      nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
      nombre_contacto2, telefono_contacto2, email_contacto2,
      ciudad, departamento, pais, direccion,
      banco, tipo_cuenta, numero_cuenta, titular_cuenta,
      plazo_pago_dias, condiciones, estado
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
    RETURNING *
  `, [
    tipo_doc, numero_doc, digito_verificacion || null, razon_social, nombre_comercial || null,
    nombre_contacto, cargo_contacto || null, telefono_fijo || null, telefono_celular || null, email_contacto || null,
    nombre_contacto2 || null, telefono_contacto2 || null, email_contacto2 || null,
    ciudad, departamento || null, pais || 'Colombia', direccion || null,
    banco || null, tipo_cuenta || null, numero_cuenta || null, titular_cuenta || null,
    plazo_pago_dias || 30, condiciones || null, estado || 'Activo'
  ]);
  return result.rows[0];
};

const actualizarProveedor = async (id, datos) => {
  const {
    tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
    nombre_contacto2, telefono_contacto2, email_contacto2,
    ciudad, departamento, pais, direccion,
    banco, tipo_cuenta, numero_cuenta, titular_cuenta,
    plazo_pago_dias, condiciones, estado
  } = datos;

  const result = await pool.query(`
    UPDATE "Proveedores" SET
      tipo_doc=$1, numero_doc=$2, digito_verificacion=$3, razon_social=$4, nombre_comercial=$5,
      nombre_contacto=$6, cargo_contacto=$7, telefono_fijo=$8, telefono_celular=$9, email_contacto=$10,
      nombre_contacto2=$11, telefono_contacto2=$12, email_contacto2=$13,
      ciudad=$14, departamento=$15, pais=$16, direccion=$17,
      banco=$18, tipo_cuenta=$19, numero_cuenta=$20, titular_cuenta=$21,
      plazo_pago_dias=$22, condiciones=$23, estado=$24
    WHERE id_proveedor=$25 RETURNING *
  `, [
    tipo_doc, numero_doc, digito_verificacion, razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_fijo, telefono_celular, email_contacto,
    nombre_contacto2, telefono_contacto2, email_contacto2,
    ciudad, departamento, pais, direccion,
    banco, tipo_cuenta, numero_cuenta, titular_cuenta,
    plazo_pago_dias, condiciones, estado, id
  ]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Proveedores"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_proveedor=$1 RETURNING id_proveedor, estado
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getProveedores, getProveedorById, crearProveedor, actualizarProveedor, toggleEstado };