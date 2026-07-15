// src/services/categorias.service.js
const pool = require('../config/db');

const getCategorias = async ({ page, limit, q } = {}) => {
  const condiciones = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    condiciones.push(`c.nombre ILIKE $${params.length}`);
  }
  const whereClause = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const paginar = page !== undefined;
  let limitOffsetSql = '';
  if (paginar) {
    const pagina = Math.max(parseInt(page) || 1, 1);
    const limite = Math.max(parseInt(limit) || 10, 1);
    const offset = (pagina - 1) * limite;
    params.push(limite, offset);
    limitOffsetSql = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const result = await pool.query(
    `SELECT c.id_categoria, c.nombre, c.descripcion, c.estado, c.icono, c.fecha_creacion,
            COUNT(p.id_producto) FILTER (WHERE p.estado != 'Eliminado') AS total_productos
            ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
     FROM "Categorias" c
     LEFT JOIN "Productos" p ON p.id_categoria = c.id_categoria
     ${whereClause}
     GROUP BY c.id_categoria
     ORDER BY c.nombre
     ${limitOffsetSql}`,
    params
  );

  if (!paginar) return result.rows;
  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const data = result.rows.map(({ total_count, ...r }) => r);
  return { data, total };
};

const getCategoriaById = async (id) => {
  const result = await pool.query(
    `SELECT id_categoria, nombre, descripcion, estado, icono, fecha_creacion
     FROM "Categorias" WHERE id_categoria = $1`,
    [id]
  );
  if (!result.rows.length) throw { status: 404, message: 'No encontrada' };

  const productos = await pool.query(
    `SELECT id_producto, codigo, nombre, precio, estado
     FROM "Productos" WHERE id_categoria = $1 AND estado != 'Eliminado'
     ORDER BY nombre`,
    [id]
  );
  return { ...result.rows[0], productos: productos.rows };
};

const crearCategoria = async ({ nombre, descripcion, icono }) => {
  if (!nombre) throw { status: 400, message: 'Nombre requerido' };
  const result = await pool.query(
    `INSERT INTO "Categorias" (nombre, descripcion, icono) VALUES ($1, $2, $3) RETURNING *`,
    [nombre, descripcion || null, icono || 'tag']
  );
  return result.rows[0];
};

const actualizarCategoria = async (id, { nombre, descripcion, estado, icono }) => {
  const result = await pool.query(
    `UPDATE "Categorias"
     SET nombre      = COALESCE($1, nombre),
         descripcion = COALESCE($2, descripcion),
         estado      = COALESCE($3, estado),
         icono       = COALESCE($4, icono)
     WHERE id_categoria = $5 RETURNING *`,
    [nombre, descripcion, estado, icono, id]
  );
  if (!result.rows[0]) throw { status: 404, message: 'No encontrada' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const actual = await pool.query(`SELECT estado FROM "Categorias" WHERE id_categoria=$1`, [id]);
  if (!actual.rows.length) throw { status: 404, message: 'No encontrada' };

  if (actual.rows[0].estado === 'Activo') {
    const productos = await pool.query(
      `SELECT COUNT(*) AS total FROM "Productos" WHERE id_categoria=$1 AND estado='Activo'`,
      [id]
    );
    if (Number(productos.rows[0].total) > 0)
      throw { status: 400, message: 'No se puede inactivar: la categoría tiene productos activos asociados.' };
  }

  const result = await pool.query(
    `UPDATE "Categorias"
     SET estado = CASE WHEN estado = 'Activo' THEN 'Inactivo' ELSE 'Activo' END
     WHERE id_categoria = $1 RETURNING id_categoria, estado`,
    [id]
  );
  return result.rows[0];
};

module.exports = { getCategorias, getCategoriaById, crearCategoria, actualizarCategoria, toggleEstado };