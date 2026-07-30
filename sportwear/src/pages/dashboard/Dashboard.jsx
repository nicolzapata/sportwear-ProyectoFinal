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

  // ── NUEVO: reporte de ventas por rango de fechas ──────────────────────────
  const [reporteDesde,   setReporteDesde]   = useState("");
  const [reporteHasta,   setReporteHasta]   = useState(hoyISO());
  const [reporte,        setReporte]        = useState(null);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [errorReporte,   setErrorReporte]   = useState("");

  const generarReporte = async () => {
    if (!reporteDesde || !reporteHasta) {
      setErrorReporte("Selecciona ambas fechas para consultar.");
      return;
    }
    setCargandoReporte(true);
    setErrorReporte("");
    try {
      const { data } = await api.get("/dashboard/reporte", {
        params: { desde: reporteDesde, hasta: reporteHasta },
      });
      setReporte(data);
    } catch (err) {
      setErrorReporte(err.response?.data?.message || "No se pudo generar el reporte.");
      setReporte(null);
    } finally {
      setCargandoReporte(false);
    }
  };

  // ── NUEVO: período seleccionado por gráfico — el botón "Mensual" ya alterna de verdad ──
  const [periodoVentas, setPeriodoVentas]   = useState("actual");   // actual | anterior
  const [periodoCompras, setPeriodoCompras] = useState("actual");
  const [expandidosStock, setExpandidosStock] = useState({});

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
  const pagado    = ventasRecientes.filter((v) => v.estado === "Pagado").length;
  const pendiente = ventasRecientes.filter((v) => v.estado === "Pendiente").length;
  const cancelado = ventasRecientes.filter((v) => v.estado !== "Pagado" && v.estado !== "Pendiente").length;

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

      {/* ── NUEVO: Reporte de ventas por rango de fechas ── */}
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
              max={reporteHasta || undefined}
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
              onChange={(e) => setReporteHasta(e.target.value)}
            />
          </div>
          <button className="btn-generar-reporte" onClick={generarReporte} disabled={cargandoReporte}>
            {cargandoReporte ? "Consultando..." : "Generar reporte"}
          </button>
        </div>

        {errorReporte && <p className="reporte-error">{errorReporte}</p>}

        {reporte && (
          <>
            <div className="reporte-totales">
              <div className="reporte-total-item">
                <span>Ventas en el rango</span>
                <strong>{reporte.totales.total_ventas}</strong>
              </div>
              <div className="reporte-total-item">
                <span>Ingresos totales</span>
                <strong>{formatCurrency(reporte.totales.ingresos_totales)}</strong>
              </div>
              <div className="reporte-total-item">
                <span>Ingresos ya pagados</span>
                <strong>{formatCurrency(reporte.totales.ingresos_pagados)}</strong>
              </div>
              <div className="reporte-total-item">
                <span>Ticket promedio</span>
                <strong>{formatCurrency(reporte.totales.ticket_promedio)}</strong>
              </div>
            </div>

            <div className="tbl-container">
              <table className="tbl">
                <thead className="tbl-header">
                  <tr>
                    <th className="tbl-th">Fecha</th>
                    <th className="tbl-th">Cliente</th>
                    <th className="tbl-th">Método</th>
                    <th className="tbl-th">Total</th>
                    <th className="tbl-th">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.ventas.length === 0 ? (
                    <tr><td className="tbl-td" colSpan={5} style={{ textAlign: "center", color: MUTED, fontStyle: "italic" }}>No hay ventas en ese rango de fechas.</td></tr>
                  ) : reporte.ventas.map((v) => (
                    <tr key={v.id_venta} className="tbl-row">
                      <td className="tbl-td">{new Date(v.fecha).toLocaleDateString("es-CO")}</td>
                      <td className="tbl-td">{v.cliente}</td>
                      <td className="tbl-td">{v.metodo_pago || "—"}</td>
                      <td className="tbl-td">{formatCurrency(v.total)}</td>
                      <td className="tbl-td">
                        <span className={`tabla-badge ${getBadgeClass(v.estado)}`}>{v.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reporte.ventas.length > 0 && (
                <div className="print-button-container">
                  <ExportButtons
                    datos={reporte.ventas}
                    columnas={[
                      { header: "Fecha", value: (v) => new Date(v.fecha).toLocaleDateString("es-CO") },
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
          </>
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
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Ventas mensuales</h3>
              <p className="chart-subtitle">Acumulado por mes {periodoVentas === "actual" ? "— año actual" : "— año anterior"}</p>
            </div>
            <button className="period-badge" onClick={() => setPeriodoVentas(p => p === "actual" ? "anterior" : "actual")}>
              {periodoVentas === "actual" ? "Ver año anterior" : "Ver año actual"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 10, color: MUTED, fontFamily: "'Jost', sans-serif" }}>
            <span>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: CHARCOAL, marginRight: 5, verticalAlign: "middle" }} />
              {periodoVentas === "actual" ? "Este año" : "Año anterior"}
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
              <p className="chart-subtitle">Los más vendidos</p>
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
            <div><h3 className="chart-title">Últimas ventas</h3></div>
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
                ) : ventasRecientes.map((venta) => (
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
              <p className="chart-subtitle">Distribución de ventas</p>
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
              <p className="chart-subtitle">Acumulado por mes {periodoCompras === "actual" ? "— año actual" : "— año anterior"}</p>
            </div>
            <button className="period-badge" onClick={() => setPeriodoCompras(p => p === "actual" ? "anterior" : "actual")}>
              {periodoCompras === "actual" ? "Ver año anterior" : "Ver año actual"}
            </button>
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
              <h3 className="chart-title">Clientes recientes</h3>
              <p className="chart-subtitle">Últimos registrados</p>
            </div>
          </div>
          <div className="top-products">
            {clientesRecientes.length === 0 ? (
              <p style={{ fontSize: 13, color: MUTED, fontStyle: "italic" }}>Sin datos aún.</p>
            ) : clientesRecientes.map((cliente) => (
              <div key={cliente.id_cliente} className="top-product">
                <div className="top-product-info">
                  <span className="top-product-name">{cliente.nombre}</span>
                  <span className="top-product-count">
                    {cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString("es-CO") : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Productos con bajo stock</h3>
            <p className="chart-subtitle">Variantes con menos de 5 unidades disponibles</p>
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