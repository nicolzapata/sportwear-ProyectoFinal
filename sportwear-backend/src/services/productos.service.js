// src/services/productos.service.js
const pool = require('../config/db');

const getProductos = async (opciones = {}) => {
  // Compatibilidad con el uso anterior: getProductos('true'|'false')
  const filtros = typeof opciones === 'string' || opciones === undefined
    ? { publicado: opciones }
    : opciones;
  const { publicado, id_categoria, id, q, precio_min, precio_max, talla, color, page, limit } = filtros;

  const condiciones = [`p.estado != 'Eliminado'`];
  const params = [];

  if (id) {
    params.push(id);
    condiciones.push(`p.id_producto = $${params.length}`);
  }
  if (publicado !== undefined) {
    params.push(publicado === '1' || publicado === 'true');
    condiciones.push(`p.publicado = $${params.length}`);
  }
  if (id_categoria) {
    params.push(id_categoria);
    condiciones.push(`p.id_categoria = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    condiciones.push(`(p.nombre ILIKE $${params.length} OR p.codigo ILIKE $${params.length})`);
  }
  if (precio_min) {
    params.push(Number(precio_min));
    condiciones.push(`p.precio >= $${params.length}`);
  }
  if (precio_max) {
    params.push(Number(precio_max));
    condiciones.push(`p.precio <= $${params.length}`);
  }
  if (talla) {
    params.push(talla);
    condiciones.push(`EXISTS (SELECT 1 FROM "ProductoVariantes" v WHERE v.id_producto=p.id_producto AND v.talla=$${params.length})`);
  }
  if (color) {
    params.push(color);
    condiciones.push(`EXISTS (SELECT 1 FROM "ProductoVariantes" v JOIN "Colores" col ON v.id_color=col.id_color WHERE v.id_producto=p.id_producto AND col.nombre=$${params.length})`);
  }

  const whereClause = `WHERE ${condiciones.join(' AND ')}`;

  // La paginación es opt-in: solo se activa si viene "page" en la petición.
  // Así los selects/dropdowns que necesitan el listado completo (formularios
  // de venta/compra, catálogo público, etc.) siguen recibiendo el array plano.
  const paginar = page !== undefined;
  let limitOffsetSql = '';
  if (paginar) {
    const pagina = Math.max(parseInt(page) || 1, 1);
    const limite = Math.max(parseInt(limit) || 10, 1);
    const offset = (pagina - 1) * limite;
    params.push(limite, offset);
    limitOffsetSql = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

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
      p.destacado,
      c.nombre AS categoria,
      ${paginar ? 'COUNT(*) OVER() AS total_count,' : ''}
      -- Stock total sumado desde variantes
      COALESCE((
        SELECT SUM(v.stock)
        FROM "ProductoVariantes" v
        WHERE v.id_producto = p.id_producto AND v.estado = 'Activo'
      ), 0) AS stock,
      -- ── NUEVO: rango de precios entre variantes (para saber en el
      -- frontend si el producto tiene un solo precio o varios, sin tener
      -- que recorrer el array de variantes cada vez). Si una variante no
      -- tiene precio propio, para este cálculo cuenta como el precio base
      -- del producto (mismo respaldo que se usa al mostrarlo). ──
      (
        SELECT MIN(COALESCE(v.precio, p.precio))
        FROM "ProductoVariantes" v
        WHERE v.id_producto = p.id_producto AND v.estado = 'Activo'
      ) AS precio_min,
      (
        SELECT MAX(COALESCE(v.precio, p.precio))
        FROM "ProductoVariantes" v
        WHERE v.id_producto = p.id_producto AND v.estado = 'Activo'
      ) AS precio_max,
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
          'estado',      v.estado,
          -- ── NUEVO: precio propio de la variante; si es NULL, el
          -- frontend debe usar el precio general del producto (p.precio)
          -- como respaldo — mismo criterio que "precio_min/max" arriba. ──
          'precio',      v.precio
        ) ORDER BY v.talla, col.nombre)
        FROM "ProductoVariantes" v
        JOIN "Colores" col ON v.id_color = col.id_color
        WHERE v.id_producto = p.id_producto
      ) AS variantes
    FROM "Productos" p
    LEFT JOIN "Categorias" c ON p.id_categoria = c.id_categoria
    ${whereClause}
    ORDER BY p.fecha_creacion DESC
    ${limitOffsetSql}
  `, params);

  if (!paginar) return result.rows;

  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const data = result.rows.map(({ total_count, ...r }) => r);
  return { data, total };
};

const crearProducto = async (datos) => {
  const { nombre, descripcion, id_categoria, precio, publicado, estado, destacado } = datos;
  if (!nombre) throw { status: 400, message: 'Nombre requerido' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [{ nv }] } = await client.query(`SELECT nextval('productos_codigo_seq') AS nv`);
    const codigo = `PROD-${String(nv).padStart(4, '0')}`;

    const result = await client.query(`
      INSERT INTO "Productos" (codigo, nombre, descripcion, id_categoria, precio, publicado, estado, destacado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_producto, codigo, nombre, descripcion, publicado, destacado
    `, [codigo, nombre, descripcion || null, id_categoria, precio || 0,
        publicado || false, estado || 'Activo', destacado || null]);

    const producto = result.rows[0];
    await client.query('COMMIT');
    return { id_producto: producto.id_producto, codigo: producto.codigo, nombre: producto.nombre };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const actualizarProducto = async (id, datos, id_usuario) => {
  const { nombre, descripcion, id_categoria, precio, publicado, estado, destacado } = datos;
  // el código nunca se modifica (regla 03.2.3.2) — no se incluye en el UPDATE

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const actual = await client.query(`SELECT precio FROM "Productos" WHERE id_producto = $1`, [id]);
    if (!actual.rows.length) throw { status: 404, message: 'No encontrado' };
    const precioAnterior = Number(actual.rows[0].precio);
    const precioNuevo = precio !== undefined && precio !== null ? Number(precio) : precioAnterior;

    // ── NUEVO: "destacado" se asigna directo (no con COALESCE) porque a diferencia
    // de los demás campos, sí necesita poder "limpiarse" de vuelta a NULL (ej. quitar
    // el flag de "Nuevo"/"Promoción") — con COALESCE eso nunca sería posible. ──
    const result = await client.query(`
      UPDATE "Productos" SET
        nombre       = COALESCE($1::VARCHAR,  nombre),
        descripcion  = COALESCE($2::TEXT,     descripcion),
        id_categoria = COALESCE($3::INTEGER,  id_categoria),
        precio       = COALESCE($4::NUMERIC,  precio),
        publicado    = COALESCE($5::BOOLEAN,  publicado),
        estado       = COALESCE($6::VARCHAR,  estado),
        destacado    = $8
      WHERE id_producto = $7
      RETURNING id_producto, codigo, nombre, descripcion, publicado, destacado
    `, [nombre || null, descripcion || null, id_categoria || null,
        precio || null, publicado ?? null, estado || null, id, destacado || null]);

    if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };

    if (precioNuevo !== precioAnterior) {
      await client.query(`
        INSERT INTO "HistorialPrecios" (id_producto, precio_anterior, precio_nuevo, id_usuario)
        VALUES ($1, $2, $3, $4)
      `, [id, precioAnterior, precioNuevo, id_usuario || null]);
    }

    await client.query('COMMIT');
    return { id_producto: result.rows[0].id_producto, nombre: result.rows[0].nombre };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
};

const getHistorialPrecios = async (id_producto) => {
  const result = await pool.query(`
    SELECT h.id_historial, h.precio_anterior, h.precio_nuevo, h.fecha, u.nombre AS usuario
    FROM "HistorialPrecios" h
    LEFT JOIN "Usuarios" u ON h.id_usuario = u.id_usuario
    WHERE h.id_producto = $1
    ORDER BY h.fecha DESC
  `, [id_producto]);
  return result.rows;
};

// Al desactivar un producto también se despublica (no puede quedar visible en el
// catálogo un producto inactivo). Al reactivarlo, el estado de publicación no se
// restaura automáticamente: el admin decide cuándo volver a publicarlo.
const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Productos"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END,
        publicado = CASE WHEN estado='Activo' THEN false ELSE publicado END
    WHERE id_producto=$1 RETURNING id_producto, estado, publicado
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

// Eliminación lógica: conserva el registro (historial de ventas/compras intacto),
// solo deja de mostrarse en el catálogo y en la gestión de productos.
const eliminarProducto = async (id) => {
  const pendientes = await pool.query(`
    SELECT COUNT(*) AS total
    FROM "DetalleVenta" dv
    JOIN "Ventas" v ON dv.id_venta = v.id_venta
    WHERE dv.id_producto = $1 AND v.estado = 'Pendiente'
  `, [id]);
  if (Number(pendientes.rows[0].total) > 0)
    throw { status: 400, message: 'No se puede eliminar: el producto tiene pedidos pendientes.' };

  const result = await pool.query(`
    UPDATE "Productos" SET estado='Eliminado', publicado=false
    WHERE id_producto=$1 RETURNING id_producto
  `, [id]);
  if (!result.rows[0]) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

module.exports = { getProductos, crearProducto, actualizarProducto, toggleEstado, togglePublicar, eliminarProducto, getHistorialPrecios };