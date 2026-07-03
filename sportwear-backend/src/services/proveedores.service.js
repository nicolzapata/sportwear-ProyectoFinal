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
  // El NIT (tipo_doc + numero_doc) es el identificador único del proveedor y no se puede modificar.
  const {
    razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_celular, email_contacto,
    ciudad, departamento, pais, direccion,
    banco, tipo_cuenta, numero_cuenta, titular_cuenta,
    plazo_pago_dias, condiciones, estado
  } = datos;

  if (!razon_social || !razon_social.trim())
    throw { status: 400, message: 'La razón social o nombre es requerido' };
  if (!nombre_contacto || !nombre_contacto.trim())
    throw { status: 400, message: 'El nombre de contacto es requerido' };
  if (!ciudad || !ciudad.trim())
    throw { status: 400, message: 'La ciudad es requerida' };

  const result = await pool.query(`
    UPDATE "Proveedores" SET
      razon_social=$1, nombre_comercial=$2,
      nombre_contacto=$3, cargo_contacto=$4, telefono_celular=$5, email_contacto=$6,
      ciudad=$7, departamento=$8, pais=$9, direccion=$10,
      banco=$11, tipo_cuenta=$12, numero_cuenta=$13, titular_cuenta=$14,
      plazo_pago_dias=$15, condiciones=$16, estado=$17
    WHERE id_proveedor=$18 RETURNING *
  `, [
    razon_social, nombre_comercial,
    nombre_contacto, cargo_contacto, telefono_celular, email_contacto,
    ciudad, departamento, pais, direccion,
    banco, tipo_cuenta, numero_cuenta, titular_cuenta,
    plazo_pago_dias, condiciones, estado, id
  ]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const actual = await pool.query(`SELECT estado FROM "Proveedores" WHERE id_proveedor=$1`, [id]);
  if (!actual.rows.length) throw { status: 404, message: 'No encontrado' };

  if (actual.rows[0].estado === 'Activo') {
    const pendientes = await pool.query(
      `SELECT COUNT(*) AS total FROM "Compras" WHERE id_proveedor=$1 AND estado IN ('Pendiente', 'En Tránsito')`,
      [id]
    );
    if (Number(pendientes.rows[0].total) > 0)
      throw { status: 400, message: 'No se puede inactivar: el proveedor tiene compras pendientes o en tránsito.' };
  }

  const result = await pool.query(`
    UPDATE "Proveedores"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_proveedor=$1 RETURNING id_proveedor, estado
  `, [id]);
  return result.rows[0];
};

module.exports = { getProveedores, getProveedorById, crearProveedor, actualizarProveedor, toggleEstado };