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
    tipo_doc, numero_doc, razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_celular, email_contacto,
    ciudad, departamento, pais, direccion,
    banco, tipo_cuenta, numero_cuenta, titular_cuenta,
    plazo_pago_dias, condiciones, estado
  } = datos;

  if (!razon_social || !numero_doc || !tipo_doc)
    throw { status: 400, message: 'Tipo de documento, número de documento y razón social son requeridos' };
  if (!nombre_contacto)
    throw { status: 400, message: 'La persona de contacto es requerida' };
  if (!ciudad)
    throw { status: 400, message: 'La ciudad es requerida' };

  const result = await pool.query(`
    INSERT INTO "Proveedores" (
      tipo_doc, numero_doc, razon_social, nombre_comercial,
      nombre_contacto, cargo_contacto, telefono_celular, email_contacto,
      ciudad, departamento, pais, direccion,
      banco, tipo_cuenta, numero_cuenta, titular_cuenta,
      plazo_pago_dias, condiciones, estado
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
    tipo_doc, numero_doc, razon_social, nombre_comercial || null,
    nombre_contacto, cargo_contacto || null, telefono_celular || null, email_contacto || null,
    ciudad, departamento || null, pais || 'Colombia', direccion || null,
    banco || null, tipo_cuenta || null, numero_cuenta || null, titular_cuenta || null,
    plazo_pago_dias || 30, condiciones || null, estado || 'Activo'
  ]);
  return result.rows[0];
};

const actualizarProveedor = async (id, datos) => {
  const {
    tipo_doc, numero_doc, razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_celular, email_contacto,
    ciudad, departamento, pais, direccion,
    banco, tipo_cuenta, numero_cuenta, titular_cuenta,
    plazo_pago_dias, condiciones, estado
  } = datos;

  if (!tipo_doc || !numero_doc)
    throw { status: 400, message: 'El tipo y número de documento son requeridos' };
  if (!razon_social || !razon_social.trim())
    throw { status: 400, message: 'La razón social o nombre es requerido' };
  if (!nombre_contacto || !nombre_contacto.trim())
    throw { status: 400, message: 'El nombre de contacto es requerido' };
  if (!ciudad || !ciudad.trim())
    throw { status: 400, message: 'La ciudad es requerida' };

  const result = await pool.query(`
    UPDATE "Proveedores" SET
      tipo_doc=$1, numero_doc=$2, razon_social=$3, nombre_comercial=$4,
      nombre_contacto=$5, cargo_contacto=$6, telefono_celular=$7, email_contacto=$8,
      ciudad=$9, departamento=$10, pais=$11, direccion=$12,
      banco=$13, tipo_cuenta=$14, numero_cuenta=$15, titular_cuenta=$16,
      plazo_pago_dias=$17, condiciones=$18, estado=$19
    WHERE id_proveedor=$20 RETURNING *
  `, [
    tipo_doc, numero_doc, razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_celular, email_contacto,
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