// src/services/dashboard.service.js
const pool = require('../config/db');

// Desplaza una fecha "YYYY-MM-DD" un número de años (para comparar "mismo
// rango, un año atrás" cuando hay un filtro de fechas activo).
const shiftYear = (fechaStr, deltaYears) => {
  const d = new Date(fechaStr + 'T00:00:00Z');
  d.setUTCFullYear(d.getUTCFullYear() + deltaYears);
  return d.toISOString().slice(0, 10);
};

// ── getResumen acepta un rango opcional {desde, hasta}.
//
// Sin rango: las cifras "del día" muestran HOY, y las "totales" muestran
// TODO EL TIEMPO (comportamiento de siempre).
//
// Con rango: TODO lo relacionado con ventas/ingresos/compras se calcula
// sobre ese mismo rango.
//
// "Bajo stock" y "Pedidos pendientes" NUNCA se filtran por fecha: son una
// foto del estado actual del inventario/pedidos, no un hecho histórico.
const getResumen = async (filtros = {}) => {
  const { desde, hasta } = filtros;
  const hayRango = !!(desde && hasta);
  const params = hayRango ? [desde, hasta] : [];

  const fVentasDia    = hayRango ? `fecha::date BETWEEN $1 AND $2` : `fecha::date = CURRENT_DATE`;
  const fVentasTotal  = hayRango ? `fecha::date BETWEEN $1 AND $2` : `TRUE`;
  const fComprasDia   = hayRango ? `fecha::date BETWEEN $1 AND $2` : `fecha::date = CURRENT_DATE`;
  const fComprasTotal = hayRango ? `fecha::date BETWEEN $1 AND $2` : `TRUE`;

  const statsResult = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM "Ventas" WHERE ${fVentasDia} AND estado NOT IN ('Abandonado', 'Pendiente'))            AS ventas_hoy,
      (SELECT COALESCE(SUM(total),0) FROM "Ventas" WHERE estado='Pagado' AND ${fVentasDia})                        AS ingresos_hoy,
      (SELECT COUNT(*) FROM "Clientes" WHERE estado='Activo')                                                      AS clientes_activos,
      (SELECT COUNT(DISTINCT pv.id_producto) FROM "ProductoVariantes" pv WHERE pv.stock < 5)                       AS bajo_stock,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado='Pendiente')                                                     AS pedidos_pendientes,
      (SELECT COALESCE(SUM(total),0) FROM "Ventas" WHERE estado IN ('Pagado', 'Confirmado') AND ${fVentasTotal})   AS ingresos_totales,
      (SELECT COUNT(*) FROM "Productos" WHERE estado='Activo')                                                     AS total_productos,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado NOT IN ('Abandonado', 'Pendiente') AND ${fVentasTotal})          AS ventas_totales,
      (SELECT COUNT(*) FROM "Compras" WHERE estado != 'Anulado' AND ${fComprasTotal})                              AS compras_totales,
      (SELECT COALESCE(SUM(total),0) FROM "Compras" WHERE estado != 'Anulado' AND ${fComprasTotal})                AS compras_monto_total,
      (SELECT COALESCE(SUM(total),0) FROM "Compras" WHERE estado != 'Anulado' AND ${fComprasDia})                  AS compras_hoy,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado='Pagado' AND ${fVentasTotal})                                    AS balance_pagado,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado='Pendiente' AND ${fVentasTotal})                                 AS balance_pendiente,
      (SELECT COUNT(*) FROM "Ventas" WHERE estado NOT IN ('Pagado','Pendiente','Abandonado') AND ${fVentasTotal})  AS balance_cancelado
  `, params);

  const stats = statsResult.rows[0];

  const numeroVentas = Number(stats.ventas_totales) || 0;
  const ingresosTotales = Number(stats.ingresos_totales) || 0;
  stats.numero_ventas = numeroVentas;
  stats.ticket_promedio = numeroVentas > 0 ? ingresosTotales / numeroVentas : 0;

  const fTopProductos = hayRango ? `v.fecha::date BETWEEN $1 AND $2` : `TRUE`;
  const topResult = await pool.query(`
    SELECT p.nombre, SUM(dv.cantidad) AS total_vendido
    FROM "DetalleVenta" dv
    INNER JOIN "Productos" p ON dv.id_producto = p.id_producto
    INNER JOIN "Ventas"    v ON dv.id_venta    = v.id_venta
    WHERE v.estado NOT IN ('Anulado', 'Pendiente', 'Abandonado') AND ${fTopProductos}
    GROUP BY p.nombre ORDER BY total_vendido DESC LIMIT 5
  `, params);

  const fVentasRecientes = hayRango ? `v.fecha::date BETWEEN $1 AND $2` : `TRUE`;
  const limiteVentasRecientes = hayRango ? '' : 'LIMIT 10';
  const ventasResult = await pool.query(`
    SELECT id_venta, cliente, producto, total, estado, fecha
    FROM (
      SELECT DISTINCT ON (v.id_venta)
             v.id_venta, c.nombre AS cliente, p.nombre AS producto,
             v.total, v.estado, v.fecha
      FROM "Ventas" v
      INNER JOIN "Clientes"     c  ON v.id_cliente  = c.id_cliente
      LEFT  JOIN "DetalleVenta" dv ON dv.id_venta   = v.id_venta
      LEFT  JOIN "Productos"    p  ON dv.id_producto = p.id_producto
      WHERE v.estado NOT IN ('Abandonado', 'Pendiente') AND ${fVentasRecientes}
      ORDER BY v.id_venta, dv.id_detalle_venta
    ) ultimas
    ORDER BY fecha DESC, id_venta DESC
    ${limiteVentasRecientes}
  `, params);

  // ── NUEVO: "Clientes recientes" — sin rango, sigue siendo "los últimos 5
  // registrados". CON rango activo, filtra por fecha de REGISTRO dentro de
  // ese rango, y se trae completo (sin límite) para poder paginarlo. ──
  const fClientes = hayRango ? `fecha_registro::date BETWEEN $1 AND $2` : `TRUE`;
  const limiteClientes = hayRango ? '' : 'LIMIT 5';
  const clientesRecientesResult = await pool.query(`
    SELECT id_cliente, nombre, email, fecha_registro
    FROM "Clientes"
    WHERE ${fClientes}
    ORDER BY fecha_registro DESC NULLS LAST
    ${limiteClientes}
  `, params);

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
    rangoActivo: hayRango ? { desde, hasta } : null,
  };
};

// ── Sin rango: año actual vs año anterior completo (de siempre). CON
// rango: compara el rango elegido contra el MISMO rango de días, un año
// atrás — la comparación correcta cuando ya se eligieron fechas puntuales. ──
const getVentasMensuales = async (filtros = {}) => {
  const { desde, hasta } = filtros;
  const hayRango = !!(desde && hasta);
  const mesesNombres = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  let currentResult, previousResult;

  if (hayRango) {
    const desdeAnterior = shiftYear(desde, -1);
    const hastaAnterior = shiftYear(hasta, -1);
    [currentResult, previousResult] = await Promise.all([
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Ventas"
        WHERE fecha::date BETWEEN $1 AND $2 AND estado NOT IN ('Anulado', 'Abandonado', 'Pendiente')
        GROUP BY mes_num
      `, [desde, hasta]),
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Ventas"
        WHERE fecha::date BETWEEN $1 AND $2 AND estado NOT IN ('Anulado', 'Abandonado', 'Pendiente')
        GROUP BY mes_num
      `, [desdeAnterior, hastaAnterior]),
    ]);
  } else {
    [currentResult, previousResult] = await Promise.all([
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Ventas"
        WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND estado NOT IN ('Anulado', 'Abandonado', 'Pendiente')
        GROUP BY mes_num
      `),
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Ventas"
        WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE) - 1
          AND estado NOT IN ('Anulado', 'Abandonado', 'Pendiente')
        GROUP BY mes_num
      `),
    ]);
  }

  const currentPorMes  = {};
  const previousPorMes = {};
  currentResult.rows.forEach(r  => { currentPorMes[r.mes_num]  = Number(r.total); });
  previousResult.rows.forEach(r => { previousPorMes[r.mes_num] = Number(r.total); });

  const labels   = mesesNombres;
  const current  = mesesNombres.map((_, i) => currentPorMes[i + 1]  || 0);
  const previous = mesesNombres.map((_, i) => previousPorMes[i + 1] || 0);

  return { labels, current, previous, rangoActivo: hayRango ? { desde, hasta } : null };
};

// ── Mismo criterio que getVentasMensuales — ver comentario arriba. ──
const getComprasMensuales = async (filtros = {}) => {
  const { desde, hasta } = filtros;
  const hayRango = !!(desde && hasta);
  const mesesNombres = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  let currentResult, previousResult;

  if (hayRango) {
    const desdeAnterior = shiftYear(desde, -1);
    const hastaAnterior = shiftYear(hasta, -1);
    [currentResult, previousResult] = await Promise.all([
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Compras"
        WHERE fecha::date BETWEEN $1 AND $2 AND estado != 'Anulado'
        GROUP BY mes_num
      `, [desde, hasta]),
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Compras"
        WHERE fecha::date BETWEEN $1 AND $2 AND estado != 'Anulado'
        GROUP BY mes_num
      `, [desdeAnterior, hastaAnterior]),
    ]);
  } else {
    [currentResult, previousResult] = await Promise.all([
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Compras"
        WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE) AND estado != 'Anulado'
        GROUP BY mes_num
      `),
      pool.query(`
        SELECT EXTRACT(MONTH FROM fecha)::int AS mes_num, COALESCE(SUM(total), 0) AS total
        FROM "Compras"
        WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE) - 1 AND estado != 'Anulado'
        GROUP BY mes_num
      `),
    ]);
  }

  const currentPorMes  = {};
  const previousPorMes = {};
  currentResult.rows.forEach(r  => { currentPorMes[r.mes_num]  = Number(r.total); });
  previousResult.rows.forEach(r => { previousPorMes[r.mes_num] = Number(r.total); });

  const labels   = mesesNombres;
  const current  = mesesNombres.map((_, i) => currentPorMes[i + 1]  || 0);
  const previous = mesesNombres.map((_, i) => previousPorMes[i + 1] || 0);

  return { labels, current, previous, rangoActivo: hayRango ? { desde, hasta } : null };
};

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