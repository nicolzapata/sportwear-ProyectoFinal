// src/services/colores.service.js
const pool = require('../config/db');

const getColores = async ({ page, limit, q } = {}) => {
  const paginar = page !== undefined;

  // Uso "sin paginar" (dropdowns de variantes, etc.): solo colores activos, comportamiento original intacto.
  if (!paginar) {
    const result = await pool.query(
      `SELECT id_color, nombre, codigo_hex, estado FROM "Colores" WHERE estado = 'Activo' ORDER BY nombre`
    );
    return result.rows;
  }

  // Uso paginado (listado administrativo Colores.jsx): mismo filtro que el original (solo Activos) + búsqueda.
  const params = [];
  let busquedaSql = `WHERE estado = 'Activo'`;
  if (q) {
    params.push(`%${q}%`);
    busquedaSql += ` AND nombre ILIKE $${params.length}`;
  }
  const pagina = Math.max(parseInt(page) || 1, 1);
  const limite = Math.max(parseInt(limit) || 10, 1);
  const offset = (pagina - 1) * limite;
  params.push(limite, offset);

  const result = await pool.query(
    `SELECT id_color, nombre, codigo_hex, estado, COUNT(*) OVER() AS total_count
     FROM "Colores"
     ${busquedaSql}
     ORDER BY nombre
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const data = result.rows.map(({ total_count, ...r }) => r);
  return { data, total };
};

const crearColor = async ({ nombre, codigo_hex }) => {
  if (!nombre) throw { status: 400, message: 'Nombre requerido' };
  const result = await pool.query(
    `INSERT INTO "Colores" (nombre, codigo_hex) VALUES ($1, $2) RETURNING *`,
    [nombre, codigo_hex || '#000000']
  );
  return result.rows[0];
};

const actualizarColor = async (id, { nombre, codigo_hex, estado }) => {
  const result = await pool.query(
    `UPDATE "Colores"
     SET nombre     = COALESCE($1, nombre),
         codigo_hex = COALESCE($2, codigo_hex),
         estado     = COALESCE($3, estado)
     WHERE id_color = $4 RETURNING *`,
    [nombre, codigo_hex, estado, id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

// Cuenta en cuántos productos distintos se usa el color (vía sus variantes),
// para bloquear desactivar/eliminar con un mensaje claro en vez de un error genérico.
const contarProductosAsociados = async (id) => {
  const result = await pool.query(
    `SELECT COUNT(DISTINCT id_producto) AS total FROM "ProductoVariantes" WHERE id_color = $1`,
    [id]
  );
  return Number(result.rows[0]?.total || 0);
};

const toggleEstado = async (id) => {
  const actual = await pool.query(`SELECT estado FROM "Colores" WHERE id_color = $1`, [id]);
  if (!actual.rows[0]) throw { status: 404, message: 'No encontrado' };

  // Solo se restringe al desactivar (activar un color siempre es seguro).
  if (actual.rows[0].estado === 'Activo') {
    const asociados = await contarProductosAsociados(id);
    if (asociados > 0) {
      throw { status: 409, message: `No se puede desactivar este color: está asociado a ${asociados} producto${asociados > 1 ? 's' : ''}.` };
    }
  }

  const result = await pool.query(
    `UPDATE "Colores"
     SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
     WHERE id_color = $1 RETURNING id_color, estado`,
    [id]
  );
  return result.rows[0];
};

const eliminarColor = async (id) => {
  const asociados = await contarProductosAsociados(id);
  if (asociados > 0) {
    throw { status: 409, message: `No se puede eliminar este color: está asociado a ${asociados} producto${asociados > 1 ? 's' : ''}.` };
  }
  const result = await pool.query(
    `DELETE FROM "Colores" WHERE id_color = $1 RETURNING id_color`,
    [id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getColores, crearColor, actualizarColor, toggleEstado, eliminarColor };