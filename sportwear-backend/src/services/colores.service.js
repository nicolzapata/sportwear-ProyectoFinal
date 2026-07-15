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

const toggleEstado = async (id) => {
  const result = await pool.query(
    `UPDATE "Colores"
     SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
     WHERE id_color = $1 RETURNING id_color, estado`,
    [id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getColores, crearColor, actualizarColor, toggleEstado };