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

  const stats = statsResult.rows[0];

  // ── NUEVO: número de ventas cobradas + ticket promedio (faltaban, el frontend ya los esperaba) ──
  const numeroVentas = Number(stats.ventas_totales) || 0;
  const ingresosTotales = Number(stats.ingresos_totales) || 0;
  stats.numero_ventas = numeroVentas;
  stats.ticket_promedio = numeroVentas > 0 ? ingresosTotales / numeroVentas : 0;

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
    SELECT id_cliente, nombre, email, fecha_registro
    FROM "Clientes"
    ORDER BY fecha_registro DESC NULLS LAST
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
    stats,
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

  const currentPorMes  = {};
  const previousPorMes = {};

  currentResult.rows.forEach(r  => { currentPorMes[r.mes_num]  = Number(r.total); });
  previousResult.rows.forEach(r => { previousPorMes[r.mes_num] = Number(r.total); });

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

// ── NUEVO: reporte de ventas filtrado por rango de fechas ──────────────────
// Separado del resumen general (que siempre muestra "hoy"/"todo el tiempo"):
// este reporte SOLO devuelve lo que cae dentro de [desde, hasta], con sus
// propios totales calculados sobre ese rango exclusivamente — no mezcla datos
// de fuera del rango consultado.
const getReporteVentas = async ({ desde, hasta }) => {
  if (!desde || !hasta) {
    throw { status: 400, message: 'Debes indicar una fecha "desde" y una fecha "hasta".' };
  }
  if (new Date(desde) > new Date(hasta)) {
    throw { status: 400, message: 'La fecha "desde" no puede ser posterior a la fecha "hasta".' };
  }

  const ventasResult = await pool.query(`
    SELECT v.id_venta, c.nombre AS cliente, v.total, v.estado, v.fecha, v.metodo_pago
    FROM "Ventas" v
    JOIN "Clientes" c ON v.id_cliente = c.id_cliente
    WHERE v.fecha::date BETWEEN $1 AND $2
      AND v.estado != 'Abandonado'
    ORDER BY v.fecha DESC, v.id_venta DESC
  `, [desde, hasta]);

  const ventas = ventasResult.rows;

  // ── Cálculos sobre el rango consultado (y solo sobre él) ──
  const totalVentas    = ventas.length;
  const ingresosTotales = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
  const ingresosPagados = ventas
    .filter(v => v.estado === 'Pagado')
    .reduce((acc, v) => acc + Number(v.total || 0), 0);
  const ticketPromedio = totalVentas > 0 ? ingresosTotales / totalVentas : 0;

  return {
    desde,
    hasta,
    totales: {
      total_ventas:      totalVentas,
      ingresos_totales:  ingresosTotales,
      ingresos_pagados:  ingresosPagados,
      ticket_promedio:   ticketPromedio,
    },
    ventas,
  };
};

module.exports = { getResumen, getVentasMensuales, getComprasMensuales, getReporteVentas };