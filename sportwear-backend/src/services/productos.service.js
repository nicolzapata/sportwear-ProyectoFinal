// src/services/productos.service.js
const pool = require('../config/db');

const getProductos = async (publicado) => {
  const whereClause = publicado !== undefined
    ? `WHERE p.publicado = ${publicado === '1' || publicado === 'true' ? 'true' : 'false'}`
    : '';

  const result = await pool.query(`
    SELECT
      p.id_producto,
      p.codigo,
      p.nombre,
      p.descripcion,
      p.id_categoria,
      p.precio,
      p.publicado,
      p.estado,
      p.fecha_creacion,
      c.nombre AS categoria,
      -- Stock total sumado desde variantes
      COALESCE((
        SELECT SUM(v.stock)
        FROM "ProductoVariantes" v
        WHERE v.id_producto = p.id_producto AND v.estado = 'Activo'
      ), 0) AS stock,
      -- Imagen principal
      (SELECT url FROM "Imagenes"
       WHERE id_referencia = p.id_producto AND tipo_referencia = 'Producto'
         AND es_principal = true AND estado = 'Activo' LIMIT 1) AS imagen_principal,
      -- Variantes en JSON
      (
        SELECT json_agg(json_build_object(
          'id_variante', v.id_variante,
          'id_color',    v.id_color,
          'color_nombre',col.nombre,
          'codigo_hex',  col.codigo_hex,
          'talla',       v.talla,
          'stock',       v.stock,
          'estado',      v.estado
        ) ORDER BY v.talla, col.nombre)
        FROM "ProductoVariantes" v
        JOIN "Colores" col ON v.id_color = col.id_color
        WHERE v.id_producto = p.id_producto
      ) AS variantes
    FROM "Productos" p
    LEFT JOIN "Categorias" c ON p.id_categoria = c.id_categoria
    ${whereClause}
    ORDER BY p.fecha_creacion DESC
  `);
  return result.rows;
};

const crearProducto = async (datos) => {
  const { nombre, descripcion, id_categoria, precio, publicado, estado } = datos;
  if (!nombre) throw { status: 400, message: 'Nombre requerido' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [{ nv }] } = await client.query(`SELECT nextval('productos_codigo_seq') AS nv`);
    const codigo = `PROD-${String(nv).padStart(4, '0')}`;

    const result = await client.query(`
      INSERT INTO "Productos" (codigo, nombre, descripcion, id_categoria, precio, publicado, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_producto, codigo, nombre, descripcion, publicado
    `, [codigo, nombre, descripcion || null, id_categoria, precio || 0,
        publicado || false, estado || 'Activo']);

    const producto = result.rows[0];
    await client.query('COMMIT');
    return { id_producto: producto.id_producto, codigo: producto.codigo, nombre: producto.nombre };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const actualizarProducto = async (id, datos) => {
  const { nombre, descripcion, id_categoria, precio, publicado, estado } = datos;
  // el código nunca se modifica (regla 03.2.3.2) — no se incluye en el UPDATE

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`
      UPDATE "Productos" SET
        nombre       = COALESCE($1::VARCHAR,  nombre),
        descripcion  = COALESCE($2::TEXT,     descripcion),
        id_categoria = COALESCE($3::INTEGER,  id_categoria),
        precio       = COALESCE($4::NUMERIC,  precio),
        publicado    = COALESCE($5::BOOLEAN,  publicado),
        estado       = COALESCE($6::VARCHAR,  estado)
      WHERE id_producto = $7
      RETURNING id_producto, codigo, nombre, descripcion, publicado
    `, [nombre || null, descripcion || null, id_categoria || null,
        precio || null, publicado ?? null, estado || null, id]);

    if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
    await client.query('COMMIT');
    return { id_producto: result.rows[0].id_producto, nombre: result.rows[0].nombre };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Productos"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_producto=$1 RETURNING id_producto, estado
  `, [id]);
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const togglePublicar = async (id) => {
  const result = await pool.query(`
    UPDATE "Productos" SET publicado = NOT publicado
    WHERE id_producto=$1 RETURNING id_producto, nombre, publicado
  `, [id]);
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return { id_producto: result.rows[0].id_producto, publicado: result.rows[0].publicado };
};

module.exports = { getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar };