// src/services/dashboard.service.js
const pool = require('../config/db');

const getResumen = async () => {
  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM "Ventas" WHERE fecha::date = CURRENT_DATE AND estado NOT IN ('Abandonado', 'Pendiente'))                       AS ventas_hoy,
      (SELECT COALESCE(SUM(total),0) FROM "Ventas" WHERE estado='Pagado' AND fecha::date=CURRENT_DATE) AS ingresos_hoy,
      (SELECT COUNT(*) FROM "Clientes" WHERE estado='Activo')                                AS clientes_activos,
      (SELECT COUNT(DISTINCT pv.id_producto) FROM "ProductoVariantes" pv WHERE pv.stock < 5) AS bajo_stock,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado='Pendiente')                               AS pedidos_pendientes,
      (SELECT COALESCE(SUM(total),0) FROM "Ventas" WHERE estado IN ('Pagado', 'Confirmado'))                    AS ingresos_totales,
      (SELECT COUNT(*) FROM "Productos" WHERE estado='Activo')                              AS total_productos,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado NOT IN ('Abandonado', 'Pendiente'))        AS ventas_totales,
      (SELECT COUNT(*) FROM "Compras" WHERE estado != 'Anulado')                             AS compras_totales,
      (SELECT COALESCE(SUM(total),0) FROM "Compras" WHERE estado != 'Anulado')               AS compras_monto_total,
      (SELECT COALESCE(SUM(total),0) FROM "Compras" WHERE estado != 'Anulado' AND fecha::date = CURRENT_DATE) AS compras_hoy
  `);

  const topResult = await pool.query(`
    SELECT p.nombre, SUM(dv.cantidad) AS total_vendido
    FROM "DetalleVenta" dv
    INNER JOIN "Productos" p ON dv.id_producto = p.id_producto
    INNER JOIN "Ventas"    v ON dv.id_venta    = v.id_venta
    WHERE v.estado NOT IN ('Anulado', 'Pendiente', 'Abandonado')
    GROUP BY p.nombre ORDER BY total_vendido DESC LIMIT 5
  `);

  const ventasResult = await pool.query(`
    SELECT DISTINCT ON (v.id_venta)
           v.id_venta, c.nombre AS cliente, p.nombre AS producto,
           v.total, v.estado, v.fecha
    FROM "Ventas" v
    INNER JOIN "Clientes"     c  ON v.id_cliente  = c.id_cliente
    LEFT  JOIN "DetalleVenta" dv ON dv.id_venta   = v.id_venta
    LEFT  JOIN "Productos"    p  ON dv.id_producto = p.id_producto
    WHERE v.estado NOT IN ('Abandonado', 'Pendiente')
    ORDER BY v.id_venta, v.fecha DESC
    LIMIT 5
  `);

  const clientesRecientesResult = await pool.query(`
    SELECT id_cliente, nombre, email, fecha_creacion
    FROM "Clientes"
    ORDER BY fecha_creacion DESC NULLS LAST
    LIMIT 5
  `);

  const bajoStockResult = await pool.query(`
    SELECT p.id_producto, p.nombre, pv.talla, col.nombre AS color, pv.stock
    FROM "ProductoVariantes" pv
    JOIN "Productos" p ON pv.id_producto = p.id_producto
    LEFT JOIN "Colores" col ON pv.id_color = col.id_color
    WHERE pv.stock < 5 AND pv.estado = 'Activo'
    ORDER BY pv.stock ASC
    LIMIT 10
  `);

  return {
    stats:              statsResult.rows[0],
    topProductos:       topResult.rows,
    ventasRecientes:    ventasResult.rows,
    clientesRecientes:  clientesRecientesResult.rows,
    productosBajoStock: bajoStockResult.rows,
  };
};

const getVentasMensuales = async () => {
  const mesesNombres = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  // Año actual
  const currentResult = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM fecha)::int AS mes_num,
      COALESCE(SUM(total), 0)        AS total
    FROM "Ventas"
    WHERE
      EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND estado NOT IN ('Anulado', 'Abandonado', 'Pendiente')
    GROUP BY mes_num
  `);

  // Año anterior
  const previousResult = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM fecha)::int AS mes_num,
      COALESCE(SUM(total), 0)        AS total
    FROM "Ventas"
    WHERE
      EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
      AND estado NOT IN ('Anulado', 'Abandonado', 'Pendiente')
    GROUP BY mes_num
  `);

  // Mapear a objeto { mes_num: total }
  const currentPorMes  = {};
  const previousPorMes = {};

  currentResult.rows.forEach(r  => { currentPorMes[r.mes_num]  = Number(r.total); });
  previousResult.rows.forEach(r => { previousPorMes[r.mes_num] = Number(r.total); });

  // Siempre los 12 meses, con 0 donde no hay ventas
  const labels   = mesesNombres;
  const current  = mesesNombres.map((_, i) => currentPorMes[i + 1]  || 0);
  const previous = mesesNombres.map((_, i) => previousPorMes[i + 1] || 0);

  return { labels, current, previous };
};

const getComprasMensuales = async () => {
  const mesesNombres = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  const currentResult = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM fecha)::int AS mes_num,
      COALESCE(SUM(total), 0)        AS total
    FROM "Compras"
    WHERE
      EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND estado != 'Anulado'
    GROUP BY mes_num
  `);

  const previousResult = await pool.query(`
    SELECT
      EXTRACT(MONTH FROM fecha)::int AS mes_num,
      COALESCE(SUM(total), 0)        AS total
    FROM "Compras"
    WHERE
      EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
      AND estado != 'Anulado'
    GROUP BY mes_num
  `);

  const currentPorMes  = {};
  const previousPorMes = {};
  currentResult.rows.forEach(r  => { currentPorMes[r.mes_num]  = Number(r.total); });
  previousResult.rows.forEach(r => { previousPorMes[r.mes_num] = Number(r.total); });

  const labels   = mesesNombres;
  const current  = mesesNombres.map((_, i) => currentPorMes[i + 1]  || 0);
  const previous = mesesNombres.map((_, i) => previousPorMes[i + 1] || 0);

  return { labels, current, previous };
};

module.exports = { getResumen, getVentasMensuales, getComprasMensuales };