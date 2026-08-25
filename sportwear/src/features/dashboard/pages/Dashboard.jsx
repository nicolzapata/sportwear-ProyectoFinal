// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import MiCuenta from "../clientes/MiCuenta";
import ExportButtons from "../../components/ExportButtons";
import Loader from "../../components/Loader";
import {
  IconDollar, IconShoppingCart, IconUsers, IconAlertTriangle,
  IconBox, IconTruck,
} from "../../components/Icons";
import "./Dashboard.css";

let chartJsLoaded = false;
let chartJsPromise = null;
function loadChartJs() {
  if (chartJsLoaded) return Promise.resolve(window.Chart);
  if (chartJsPromise) return chartJsPromise;
  chartJsPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => { chartJsLoaded = true; resolve(window.Chart); };
    document.head.appendChild(s);
  });
  return chartJsPromise;
}

const formatCurrency = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n || 0);

// ── Escala el tamaño de fuente del KPI según qué tan largo sea el texto,
// para que los montos grandes ($5.008.000) nunca se salgan de la tarjeta ──
const valueSizeClass = (texto) => {
  const len = String(texto).length;
  if (len > 12) return "stat-value-xs";
  if (len > 9)  return "stat-value-sm";
  return "";
};

const BROWN    = "#b49780";
const CHARCOAL = "#1a1a1a";
const LIGHT    = "#e8e0d8";
const MUTED    = "#888888";
const BORDER   = "#e5e5e5";

// ── Gráfico de barras — ahora recibe directamente los valores + la etiqueta del período
// (antes ignoraba silenciosamente "previous" y el botón "Mensual" no hacía nada) ──
function SalesBarChart({ labels, values, seriesLabel }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    let destroyed = false;
    loadChartJs().then((Chart) => {
      if (destroyed || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: seriesLabel,
            data: values,
            backgroundColor: CHARCOAL,
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#fff",
              borderColor: BORDER,
              borderWidth: 1,
              titleColor: CHARCOAL,
              bodyColor: MUTED,
              cornerRadius: 8,
              padding: 10,
              callbacks: { label: (ctx) => `  ${formatCurrency(ctx.parsed.y)}` },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: MUTED, font: { family: "'Jost', sans-serif", size: 10 } },
            },
            y: {
              grid: { color: "#f0ede8" },
              border: { display: false, dash: [3, 3] },
              ticks: {
                color: MUTED,
                font: { family: "'Jost', sans-serif", size: 10 },
                maxTicksLimit: 5,
                callback: (v) => formatCurrency(v),
              },
            },
          },
        },
      });
    });
    return () => { destroyed = true; chartRef.current?.destroy(); };
  }, [labels, values, seriesLabel]);

  return <div style={{ position: "relative", flex: 1, minHeight: 160 }}><canvas ref={canvasRef} /></div>;
}

function DonutChart({ pagado, pendiente, cancelado }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const total = pagado + pendiente + cancelado || 1;
  const pct   = Math.round((pagado / total) * 100);

  useEffect(() => {
    let destroyed = false;
    loadChartJs().then((Chart) => {
      if (destroyed || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new Chart(canvasRef.current, {
        type: "doughnut",
        data: {
          datasets: [{
            data: [pagado, pendiente, cancelado],
            backgroundColor: [CHARCOAL, BROWN, LIGHT],
            borderWidth: 0,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: "72%",
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    });
    return () => { destroyed = true; chartRef.current?.destroy(); };
  }, [pagado, pendiente, cancelado]);

  return (
    <div className="donut-wrap">
      <div className="donut-container">
        <canvas ref={canvasRef} />
        <div className="donut-center">
          <div className="donut-value">{pct}%</div>
          <div className="donut-label">completado</div>
        </div>
      </div>
      <div className="donut-legend">
        <span><span className="donut-legend-dot" style={{ background: CHARCOAL }} />Pagado</span>
        <span><span className="donut-legend-dot" style={{ background: BROWN }} />Pendiente</span>
        <span><span className="donut-legend-dot" style={{ background: LIGHT }} />Cancelado</span>
      </div>
    </div>
  );
}

const hoyISO = () => new Date().toISOString().slice(0, 10);
// ── NUEVO: "2026-07-01" → "01/07/2026", para los textitos de rango
// filtrado. Se parsea el string a mano (no con new Date) para no toparse
// con el corrimiento de zona horaria de fechas "solo fecha". ──
const formatFechaCorta = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};
const getBadgeClass = (estado) => {
  switch (estado) {
    case "Pagado":    return "exito";
    case "Pendiente": return "pendiente";
    default:          return "error";
  }
};

export default function Dashboard() {
  const { usuario } = useAuth();

  const [stats, setStats] = useState({
    ingresos_hoy: 0, ventas_hoy: 0, bajo_stock: 0,
    clientes_activos: 0, pedidos_pendientes: 0,
    ingresos_totales: 0, total_productos: 0,
    numero_ventas: 0, ticket_promedio: 0,
  });
  const [topProductos,       setTopProductos]       = useState([]);
  const [ventasRecientes,    setVentasRecientes]    = useState([]);
  const [ventasMensuales,    setVentasMensuales]    = useState(null);
  const [comprasMensuales,   setComprasMensuales]   = useState(null);
  const [clientesRecientes,  setClientesRecientes]  = useState([]);
  const [productosBajoStock, setProductosBajoStock] = useState([]);
  const [cargando,        setCargando]        = useState(true);
  const [errorCarga,      setErrorCarga]       = useState("");

  // ── Reporte de ventas por rango de fechas ─────────────────────────────────
  const [reporteDesde,   setReporteDesde]   = useState("");
  const [reporteHasta,   setReporteHasta]   = useState(hoyISO());
  const [reporte,        setReporte]        = useState(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [errorReporte,   setErrorReporte]   = useState("");

  // ── NUEVO: textito chiquito de "de qué fecha a qué fecha" — se repite en
  // cada tarjeta/sección que sí queda filtrada, para que quede clarísimo
  // qué se está viendo sin tener que adivinar. ──
  const RangoTexto = () => reporte ? (
    <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--dvna-circle)", fontWeight: 500 }}>
      Del {formatFechaCorta(reporte.desde)} al {formatFechaCorta(reporte.hasta)}
    </span>
  ) : null;

  const generarReporte = async () => {
    if (!reporteDesde || !reporteHasta) {
      setErrorReporte("Selecciona ambas fechas para consultar.");
      return;
    }
    // ── NUEVO: "Hasta" ya tiene el límite max={hoyISO()} en el input, pero
    // se valida también aquí por si acaso (ej. alguien edita el valor del
    // campo directamente sin pasar por el selector nativo). ──
    if (reporteHasta > hoyISO()) {
      setErrorReporte("La fecha \"Hasta\" no puede ser futura.");
      return;
    }
    setCargandoReporte(true);
    setErrorReporte("");
    try {
      // ── NUEVO: además de la tabla del reporte, se vuelve a pedir TODO lo
      // que sí tiene sentido filtrar — resumen general, ventas mensuales y
      // compras mensuales — con el mismo rango de fechas. "Bajo stock" y
      // "Pedidos pendientes" nunca se piden filtrados: son estado actual. ──
      const paramsRango = { params: { desde: reporteDesde, hasta: reporteHasta } };
      const [reporteRes, resumenRes, ventasMensRes, comprasMensRes] = await Promise.all([
        api.get("/dashboard/reporte", paramsRango),
        api.get("/dashboard", paramsRango),
        api.get("/dashboard/ventas-mensuales", paramsRango),
        api.get("/dashboard/compras-mensuales", paramsRango),
      ]);
      setReporte(reporteRes.data);
      setStats(resumenRes.data?.stats || {});
      setTopProductos(resumenRes.data?.topProductos || []);
      setVentasRecientes(resumenRes.data?.ventasRecientes || []);
      setVentasRecientesPagina(1);
      setClientesRecientes(resumenRes.data?.clientesRecientes || []);
      setClientesRecientesPagina(1);
      setVentasMensuales(ventasMensRes.data || { labels: [], current: [], previous: [] });
      setComprasMensuales(comprasMensRes.data || { labels: [], current: [], previous: [] });
      // Sin "año anterior" que mostrar en modo rango — se fuerza a "actual"
      // para no dejar seleccionado un toggle que ya no tiene datos.
      setPeriodoVentas("actual");
      setPeriodoCompras("actual");
      // "Bajo stock" no se toca: siempre queda el estado actual del
      // inventario, con o sin rango — no hay historial de stock que filtrar.
    } catch (err) {
      setErrorReporte(err.response?.data?.message || "No se pudo generar el reporte.");
      setReporte(null);
    } finally {
      setCargandoReporte(false);
    }
  };

  // ── NUEVO: quita el filtro de fechas y recarga todo en su modo normal
  // (hoy / todo el tiempo / registro reciente) — pedido explícitamente
  // para no depender de refrescar la página a mano. ──
  const quitarFiltro = async () => {
    setCargandoReporte(true);
    setErrorReporte("");
    try {
      const [resumenRes, ventasMensRes, comprasMensRes] = await Promise.all([
        api.get("/dashboard"),
        api.get("/dashboard/ventas-mensuales"),
        api.get("/dashboard/compras-mensuales"),
      ]);
      setReporte(null);
      setReporteDesde("");
      setStats(resumenRes.data?.stats || {});
      setTopProductos(resumenRes.data?.topProductos || []);
      setVentasRecientes(resumenRes.data?.ventasRecientes || []);
      setVentasRecientesPagina(1);
      setClientesRecientes(resumenRes.data?.clientesRecientes || []);
      setClientesRecientesPagina(1);
      setVentasMensuales(ventasMensRes.data || { labels: [], current: [], previous: [] });
      setComprasMensuales(comprasMensRes.data || { labels: [], current: [], previous: [] });
    } catch {
      setErrorReporte("No se pudo quitar el filtro. Intenta de nuevo.");
    } finally {
      setCargandoReporte(false);
    }
  };

  // ── período seleccionado por gráfico — el botón "Mensual" ya alterna de verdad ──
  const [periodoVentas, setPeriodoVentas]   = useState("actual");   // actual | anterior
  const [periodoCompras, setPeriodoCompras] = useState("actual");
  const [expandidosStock, setExpandidosStock] = useState({});
  // ── NUEVO: "Últimas ventas" ahora puede traer el rango completo cuando
  // hay un filtro de fechas activo (antes siempre venía topada a 10) — se
  // pagina en el frontend, igual que el resto de tablas del admin. ──
  const [ventasRecientesPagina, setVentasRecientesPagina] = useState(1);
  const VENTAS_RECIENTES_POR_PAGINA = 10;
  // ── NUEVO: mismo criterio para "Clientes en el rango" — con filtro activo
  // se trae completo (sin límite) para poder paginarlo. ──
  const [clientesRecientesPagina, setClientesRecientesPagina] = useState(1);
  const CLIENTES_RECIENTES_POR_PAGINA = 10;

  const toggleExpandidoStock = (key) => setExpandidosStock(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Agrupa "Productos con bajo stock" por producto (antes: una fila por talla/color = mucho scroll) ──
  const bajoStockAgrupado = useMemo(() => {
    const map = {};
    productosBajoStock.forEach((p) => {
      const key = p.id_producto ?? p.nombre;
      if (!map[key]) map[key] = { key, nombre: p.nombre, variantes: [] };
      map[key].variantes.push({ talla: p.talla, color: p.color, stock: p.stock });
    });
    return Object.values(map);
  }, [productosBajoStock]);

  useEffect(() => {
    if (usuario?.rol === 'Cliente') return;
    Promise.all([
      api.get("/dashboard"),
      api.get("/dashboard/ventas-mensuales"),
      api.get("/dashboard/compras-mensuales"),
    ]).then(([resumenRes, mensualRes, comprasRes]) => {
      setStats(resumenRes.data?.stats || {});
      setTopProductos(resumenRes.data?.topProductos || []);
      setVentasRecientes(resumenRes.data?.ventasRecientes || []);
      setClientesRecientes(resumenRes.data?.clientesRecientes || []);
      setProductosBajoStock(resumenRes.data?.productosBajoStock || []);
      setVentasMensuales(mensualRes.data || { labels: [], current: [], previous: [] });
      setComprasMensuales(comprasRes.data || { labels: [], current: [], previous: [] });
      setCargando(false);
    }).catch((err) => {
      console.error("Error cargando el dashboard:", err);
      setErrorCarga(err.response?.data?.message || "No se pudo cargar la información del dashboard.");
      setCargando(false);
    });
  }, [usuario?.rol]);

  // Early return DESPUÉS de todos los hooks
  if (usuario?.rol === 'Cliente') return <MiCuenta />;

  const ventasData   = ventasMensuales  || { labels: [], current: [], previous: [] };
  const comprasData  = comprasMensuales || { labels: [], current: [], previous: [] };
  // ── CORREGIDO: antes se contaba sobre las 10 filas de "Últimas ventas"
  // (que además excluían "Pendiente" por completo) — ahora usa el conteo
  // real que trae el backend sobre TODAS las ventas del rango (o de
  // siempre, sin rango). ──
  const pagado    = Number(stats.balance_pagado) || 0;
  const pendiente = Number(stats.balance_pendiente) || 0;
  const cancelado = Number(stats.balance_cancelado) || 0;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (cargando) return <Loader text="Cargando dashboard..." />;

  if (errorCarga) return (
    <div className="dashboard">
      <div className="dashboard-error-banner">
        <IconAlertTriangle /> {errorCarga}
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Panel de control</h1>
          <p className="dashboard-subtitle">
            Bienvenido, {usuario?.nombre?.split(" ")[0] || "usuario"} · DVNA Colección
          </p>
        </div>
        <span className="dashboard-date">{today}</span>
      </div>

      {/* ── Reporte de ventas por rango de fechas ── */}
      <div className="chart-card dashboard-reporte-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Reporte por fechas</h3>
            <p className="chart-subtitle">Consulta las ventas de un rango específico y exporta el resultado</p>
          </div>
        </div>

        <div className="reporte-filtros">
          <div className="reporte-filtro-campo">
            <label>Desde</label>
            <input
              type="date"
              className="reporte-input"
              value={reporteDesde}
              max={reporteHasta || hoyISO()}
              onChange={(e) => setReporteDesde(e.target.value)}
            />
          </div>
          <div className="reporte-filtro-campo">
            <label>Hasta</label>
            <input
              type="date"
              className="reporte-input"
              value={reporteHasta}
              min={reporteDesde || undefined}
              // ── NUEVO: "Hasta" no puede ser una fecha futura — antes no
              // tenía ningún límite superior y dejaba, por ejemplo, generar
              // un reporte hasta el año 2027. ──
              max={hoyISO()}
              onChange={(e) => setReporteHasta(e.target.value)}
            />
          </div>
          <button className="btn-generar-reporte" onClick={generarReporte} disabled={cargandoReporte}>
            {cargandoReporte ? "Consultando..." : "Generar reporte"}
          </button>
          {/* ── NUEVO: solo aparece con un filtro activo — quita el rango y
              devuelve todo el dashboard a su modo normal. ── */}
          {reporte && (
            <button
              onClick={quitarFiltro}
              disabled={cargandoReporte}
              style={{
                fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
                letterSpacing: "0.06em", color: "var(--dvna-charcoal)",
                background: "var(--dvna-white)", border: "0.5px solid var(--dvna-border)",
                borderRadius: 8, padding: "9px 18px", cursor: cargandoReporte ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Quitar filtro
            </button>
          )}
        </div>

        {errorReporte && <p className="reporte-error">{errorReporte}</p>}

        {/* ── CORREGIDO: antes esta tarjeta generaba su PROPIA tabla de
            resultados (con totales y filas), separada de todo lo demás —
            eso era contenido nuevo empujando el resto del dashboard hacia
            abajo. Los resultados del rango ya se ven en su lugar de
            siempre: las tarjetas de KPI, "Top productos" y "Últimas
            ventas" (junto a "Balance") — esta tarjeta ya no necesita
            mostrar nada más que el botón para exportar el rango completo. ── */}
        {reporte && reporte.ventas.length > 0 && (
          <div className="print-button-container">
            <ExportButtons
              datos={reporte.ventas}
              columnas={[
                { header: "Fecha", value: (v) => new Date(v.fecha).toLocaleDateString("es-CO", { timeZone: "UTC" }) },
                { header: "Cliente", key: "cliente" },
                { header: "Método de pago", value: (v) => v.metodo_pago || "—" },
                { header: "Total", value: (v) => formatCurrency(v.total) },
                { header: "Estado", key: "estado" },
              ]}
              nombreArchivo={`reporte_ventas_${reporte.desde}_a_${reporte.hasta}`}
              titulo={`Reporte de ventas — ${reporte.desde} a ${reporte.hasta}`}
            />
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent" />
            <div className="stat-icon stat-icon-primary"><IconDollar /></div>
            <div className="stat-content">
              <span className="stat-label">Ventas del día</span>
              <span className={`stat-value ${valueSizeClass(formatCurrency(stats.ingresos_hoy))}`}>{formatCurrency(stats.ingresos_hoy)}</span>
              <RangoTexto />
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent success" />
            <div className="stat-icon stat-icon-success"><IconShoppingCart /></div>
            <div className="stat-content">
              <span className="stat-label">Ventas realizadas</span>
              <span className={`stat-value ${valueSizeClass(stats.ventas_hoy)}`}>{stats.ventas_hoy}</span>
              <RangoTexto />
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent danger" />
            <div className="stat-icon stat-icon-danger"><IconAlertTriangle /></div>
            <div className="stat-content">
              <span className="stat-label">Bajo stock</span>
              <span className={`stat-value ${valueSizeClass(stats.bajo_stock)}`}>{stats.bajo_stock}</span>
              {/* ── NUEVO: aclara que este número NUNCA sigue el filtro de
                  fechas — es el inventario actual, no hay historial. ── */}
              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--dvna-muted)" }}>Estado actual</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent warning" />
            <div className="stat-icon stat-icon-warning"><IconDollar /></div>
            <div className="stat-content">
              <span className="stat-label">Ingresos totales</span>
              <span className={`stat-value ${valueSizeClass(formatCurrency(stats.ingresos_totales))}`}>{formatCurrency(stats.ingresos_totales)}</span>
              <RangoTexto />
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent" />
            <div className="stat-icon stat-icon-primary"><IconBox /></div>
            <div className="stat-content">
              <span className="stat-label">Pedidos pendientes</span>
              <span className={`stat-value ${valueSizeClass(stats.pedidos_pendientes ?? 0)}`}>{stats.pedidos_pendientes ?? 0}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--dvna-muted)" }}>Estado actual</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent success" />
            <div className="stat-icon stat-icon-success"><IconTruck /></div>
            <div className="stat-content">
              <span className="stat-label">Compras totales</span>
              <span className={`stat-value ${valueSizeClass(formatCurrency(stats.compras_monto_total))}`}>{formatCurrency(stats.compras_monto_total)}</span>
              <RangoTexto />
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Ventas mensuales</h3>
              <p className="chart-subtitle">
                {reporte
                  ? <RangoTexto />
                  : <>Acumulado por mes {periodoVentas === "actual" ? "— año actual" : "— año anterior"}</>}
              </p>
            </div>
            {/* ── NUEVO: con un rango activo no hay serie de "año anterior"
                que comparar, así que el botón se oculta en vez de mostrar
                un toggle que no haría nada. ── */}
            {!reporte && (
              <button className="period-badge" onClick={() => setPeriodoVentas(p => p === "actual" ? "anterior" : "actual")}>
                {periodoVentas === "actual"
                  ? (reporte ? "Ver mismo rango, año anterior" : "Ver año anterior")
                  : (reporte ? "Ver rango actual" : "Ver año actual")}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 10, color: MUTED, fontFamily: "'Jost', sans-serif" }}>
            <span>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: CHARCOAL, marginRight: 5, verticalAlign: "middle" }} />
              {reporte ? "En el rango" : (periodoVentas === "actual" ? "Este año" : "Año anterior")}
            </span>
          </div>
          <SalesBarChart
            key={`ventas-${periodoVentas}`}
            labels={ventasData.labels}
            values={periodoVentas === "actual" ? ventasData.current : ventasData.previous}
            seriesLabel={periodoVentas === "actual" ? "Este año" : "Año anterior"}
          />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Top productos</h3>
              <p className="chart-subtitle">{reporte ? <RangoTexto /> : "Los más vendidos"}</p>
            </div>
          </div>
          <div className="top-products">
            {topProductos.length === 0 ? (
              <p style={{ fontSize: 13, color: MUTED, fontStyle: "italic" }}>Sin datos aún.</p>
            ) : topProductos.map((producto, index) => (
              <div key={index} className="top-product">
                <div className="top-product-info">
                  <span className={`top-product-rank ${index === 0 ? "gold" : ""}`}>{index + 1}</span>
                  <span className="top-product-name">{producto.nombre}</span>
                  <span className="top-product-count">{producto.total_vendido} uds</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(producto.total_vendido / topProductos[0].total_vendido) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Últimas ventas</h3>
              {reporte && <p className="chart-subtitle"><RangoTexto /></p>}
            </div>
          </div>
          <div className="tbl-container">
            <table className="tbl">
              <thead className="tbl-header">
                <tr>
                  <th className="tbl-th">Cliente</th>
                  <th className="tbl-th">Producto</th>
                  <th className="tbl-th">Total</th>
                  <th className="tbl-th">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventasRecientes.length === 0 ? (
                  <tr><td className="tbl-td" colSpan={4} style={{ textAlign: "center", color: MUTED, fontStyle: "italic" }}>Sin ventas registradas aún.</td></tr>
                ) : ventasRecientes
                    .slice((ventasRecientesPagina - 1) * VENTAS_RECIENTES_POR_PAGINA, ventasRecientesPagina * VENTAS_RECIENTES_POR_PAGINA)
                    .map((venta) => (
                  <tr key={`${venta.id_venta}-${venta.producto}`} className="tbl-row">
                    <td className="tbl-td">{venta.cliente}</td>
                    <td className="tbl-td">{venta.producto}</td>
                    <td className="tbl-td">{formatCurrency(venta.total)}</td>
                    <td className="tbl-td">
                      <span className={`tabla-badge ${getBadgeClass(venta.estado)}`}>{venta.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── NUEVO: solo aparece cuando hay más de una página (ej. un
                rango con muchas ventas) — sin filtro, sigue siendo un
                preview corto de 10 sin paginador, como siempre. ── */}
            {(() => {
              const totalPaginasVentasRecientes = Math.ceil(ventasRecientes.length / VENTAS_RECIENTES_POR_PAGINA) || 1;
              return totalPaginasVentasRecientes > 1 && (
                <div className="paginador">
                  <button className="paginador-btn" onClick={() => setVentasRecientesPagina(p => Math.max(p - 1, 1))} disabled={ventasRecientesPagina === 1}>‹</button>
                  {Array.from({ length: totalPaginasVentasRecientes }, (_, i) => i + 1).map(n => (
                    <button key={n} className={`paginador-btn ${n === ventasRecientesPagina ? "paginador-btn-active" : ""}`} onClick={() => setVentasRecientesPagina(n)}>{n}</button>
                  ))}
                  <button className="paginador-btn" onClick={() => setVentasRecientesPagina(p => Math.min(p + 1, totalPaginasVentasRecientes))} disabled={ventasRecientesPagina === totalPaginasVentasRecientes}>›</button>
                  <span className="paginador-info">Página {ventasRecientesPagina} de {totalPaginasVentasRecientes} · {ventasRecientes.length} ventas</span>
                </div>
              );
            })()}

            <div className="print-button-container">
              <ExportButtons
                datos={ventasRecientes}
                columnas={[
                  { header: "Cliente", key: "cliente" },
                  { header: "Producto", key: "producto" },
                  { header: "Total", value: (v) => formatCurrency(v.total) },
                  { header: "Estado", key: "estado" },
                ]}
                nombreArchivo="ultimas_ventas"
                titulo="Últimas ventas"
              />
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Balance</h3>
              <p className="chart-subtitle">{reporte ? <RangoTexto /> : "Distribución de ventas"}</p>
            </div>
          </div>
          <div className="balance-summary">
            <DonutChart pagado={pagado} pendiente={pendiente} cancelado={cancelado} />
            <div className="balance-stats">
              <div className="balance-stat">
                <span className="stat-mini-icon"><IconDollar /></span>
                <div>
                  <span className="stat-mini-label">Ingresos totales</span>
                  <span className="stat-mini-value">{formatCurrency(stats.ingresos_totales)}</span>
                </div>
              </div>
              <div className="balance-stat">
                <span className="stat-mini-icon"><IconUsers /></span>
                <div>
                  <span className="stat-mini-label">Número de ventas</span>
                  <span className="stat-mini-value">{stats.numero_ventas ?? 0}</span>
                </div>
              </div>
              <div className="balance-stat">
                <span className="stat-mini-icon"><IconShoppingCart /></span>
                <div>
                  <span className="stat-mini-label">Ticket promedio</span>
                  <span className="stat-mini-value">{formatCurrency(stats.ticket_promedio)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Compras mensuales</h3>
              <p className="chart-subtitle">
                {reporte
                  ? <RangoTexto />
                  : <>Acumulado por mes {periodoCompras === "actual" ? "— año actual" : "— año anterior"}</>}
              </p>
            </div>
            {!reporte && (
              <button className="period-badge" onClick={() => setPeriodoCompras(p => p === "actual" ? "anterior" : "actual")}>
                {periodoCompras === "actual"
                  ? (reporte ? "Ver mismo rango, año anterior" : "Ver año anterior")
                  : (reporte ? "Ver rango actual" : "Ver año actual")}
              </button>
            )}
          </div>
          <SalesBarChart
            key={`compras-${periodoCompras}`}
            labels={comprasData.labels}
            values={periodoCompras === "actual" ? comprasData.current : comprasData.previous}
            seriesLabel={periodoCompras === "actual" ? "Este año" : "Año anterior"}
          />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              {/* ── Con un rango activo, esta lista deja de ser "los
                  últimos en registrarse en general" y pasa a ser los
                  clientes que se registraron DENTRO de ese rango de
                  fechas — el título lo dice explícitamente para no
                  confundir con clientes que compraron en el rango. ── */}
              <h3 className="chart-title">{reporte ? "Clientes en el rango" : "Clientes recientes"}</h3>
              <p className="chart-subtitle">{reporte ? <RangoTexto /> : "Últimos registrados"}</p>
            </div>
          </div>
          <div className="top-products">
            {clientesRecientes.length === 0 ? (
              <p style={{ fontSize: 13, color: MUTED, fontStyle: "italic" }}>Sin datos aún.</p>
            ) : clientesRecientes
                .slice((clientesRecientesPagina - 1) * CLIENTES_RECIENTES_POR_PAGINA, clientesRecientesPagina * CLIENTES_RECIENTES_POR_PAGINA)
                .map((cliente) => (
              <div key={cliente.id_cliente} className="top-product">
                <div className="top-product-info">
                  <span className="top-product-name">{cliente.nombre}</span>
                  <span className="top-product-count">
                    {cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {(() => {
            const totalPaginasClientes = Math.ceil(clientesRecientes.length / CLIENTES_RECIENTES_POR_PAGINA) || 1;
            return totalPaginasClientes > 1 && (
              <div className="paginador">
                <button className="paginador-btn" onClick={() => setClientesRecientesPagina(p => Math.max(p - 1, 1))} disabled={clientesRecientesPagina === 1}>‹</button>
                {Array.from({ length: totalPaginasClientes }, (_, i) => i + 1).map(n => (
                  <button key={n} className={`paginador-btn ${n === clientesRecientesPagina ? "paginador-btn-active" : ""}`} onClick={() => setClientesRecientesPagina(n)}>{n}</button>
                ))}
                <button className="paginador-btn" onClick={() => setClientesRecientesPagina(p => Math.min(p + 1, totalPaginasClientes))} disabled={clientesRecientesPagina === totalPaginasClientes}>›</button>
                <span className="paginador-info">Página {clientesRecientesPagina} de {totalPaginasClientes} · {clientesRecientes.length} clientes</span>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Productos con bajo stock</h3>
            <p className="chart-subtitle">Variantes con menos de 5 unidades disponibles — estado actual</p>
          </div>
        </div>
        <div className="tbl-container">
          <table className="tbl">
            <thead className="tbl-header">
              <tr>
                <th className="tbl-th">Producto</th>
                <th className="tbl-th">Talla</th>
                <th className="tbl-th">Color</th>
                <th className="tbl-th">Stock</th>
              </tr>
            </thead>
            <tbody>
              {bajoStockAgrupado.length === 0 ? (
                <tr><td className="tbl-td" colSpan={4} style={{ textAlign: "center", color: MUTED }}>Sin productos en alerta.</td></tr>
              ) : bajoStockAgrupado.map((grupo) => {
                const multiplesVariantes = grupo.variantes.length > 1;
                const abierto = !!expandidosStock[grupo.key];
                const stockMinimo = Math.min(...grupo.variantes.map((v) => v.stock));
                const unica = grupo.variantes[0];
                return (
                  <Fragment key={grupo.key}>
                    <tr
                      className="tbl-row bajostock-row-principal"
                      onClick={() => multiplesVariantes && toggleExpandidoStock(grupo.key)}
                      style={{ cursor: multiplesVariantes ? "pointer" : "default" }}
                    >
                      <td className="tbl-td" style={multiplesVariantes ? { fontWeight: 600 } : undefined}>
                        {multiplesVariantes && (
                          <span className={`bajostock-chevron-btn${abierto ? " abierto" : ""}`}>›</span>
                        )}
                        {grupo.nombre}
                        {multiplesVariantes && (
                          <span className="bajostock-count">
                            {grupo.variantes.length} variantes
                          </span>
                        )}
                      </td>
                      <td className="tbl-td">{multiplesVariantes ? "—" : (unica.talla || "—")}</td>
                      <td className="tbl-td">{multiplesVariantes ? "—" : (unica.color || "—")}</td>
                      <td className="tbl-td">
                        <span className="tabla-badge" style={{ color: stockMinimo === 0 ? "#b83232" : "#7a5500" }}>
                          <IconAlertTriangle />
                          {multiplesVariantes
                            ? ` Mínimo: ${stockMinimo}${stockMinimo === 0 ? " (agotado)" : ""}`
                            : ` ${unica.stock} ${unica.stock === 0 ? "(agotado)" : ""}`}
                        </span>
                      </td>
                    </tr>
                    {abierto && grupo.variantes.map((v, i) => (
                      <tr key={`${grupo.key}-${i}`} className="tbl-row bajostock-row-variante">
                        <td className="tbl-td bajostock-td-indent">–</td>
                        <td className="tbl-td">{v.talla || "—"}</td>
                        <td className="tbl-td">{v.color || "—"}</td>
                        <td className="tbl-td">
                          <span className="tabla-badge" style={{ color: v.stock === 0 ? "#b83232" : "#7a5500" }}>
                            <IconAlertTriangle /> {v.stock} {v.stock === 0 ? "(agotado)" : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}