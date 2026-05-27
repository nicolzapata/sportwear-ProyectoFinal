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
      (SELECT COUNT(*) FROM "Productos" WHERE estado='Activo')                              AS total_productos
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

  return {
    stats:           statsResult.rows[0],
    topProductos:    topResult.rows,
    ventasRecientes: ventasResult.rows,
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

module.exports = { getResumen, getVentasMensuales };