// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import {
  IconCreditCard, IconDollar, IconShoppingCart, IconPrint, IconUsers,
} from "../../components/Icons";
import "./Dashboard.css";

/* ── Chart.js lazy loader ── */
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

/* ── Helpers ── */
const formatCurrency = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n || 0);

const BROWN    = "#b49780";
const CHARCOAL = "#1a1a1a";
const LIGHT    = "#e8e0d8";
const MUTED    = "#888888";
const BORDER   = "#e5e5e5";

/* ── Charts ── */
function SalesBarChart({ data }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    let destroyed = false;
    loadChartJs().then((Chart) => {
      if (destroyed || !canvasRef.current) return;
      if (chartRef.current) chartRef.current.destroy();
      const valores = data.values || data.current || [];
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: data.labels,
          datasets: [{
            label: "Este año",
            data: valores,
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
  }, [data]);

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

/* ════════════════════════════════════════════
   DASHBOARD ADMIN
════════════════════════════════════════════ */
export default function Dashboard() {
  const { usuario } = useAuth();

  const [stats, setStats] = useState({
    ingresos_hoy: 0,
    ventas_hoy: 0,
    bajo_stock: 0,
    clientes_activos: 0,
    pedidos_pendientes: 0,
    ingresos_totales: 0,
    total_productos: 0,
    numero_ventas: 0,
    ticket_promedio: 0,
  });
  const [topProductos,    setTopProductos]    = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [ventasMensuales, setVentasMensuales] = useState(null);
  const [cargando,        setCargando]        = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard"),
      api.get("/dashboard/ventas-mensuales"),
    ]).then(([resumenRes, mensualRes]) => {
      setStats(resumenRes.data?.stats || {});
      setTopProductos(resumenRes.data?.topProductos || []);
      setVentasRecientes(resumenRes.data?.ventasRecientes || []);
      setVentasMensuales(mensualRes.data || { labels: [], values: [] });
      setCargando(false);
    }).catch(() => setCargando(false));
  }, []);

  const getBadgeClass = (estado) => {
    switch (estado) {
      case "Pagado":    return "exito";
      case "Pendiente": return "pendiente";
      default:          return "error";
    }
  };

  const barData   = ventasMensuales || { labels: [], values: [] };
  const pagado    = ventasRecientes.filter((v) => v.estado === "Pagado").length;
  const pendiente = ventasRecientes.filter((v) => v.estado === "Pendiente").length;
  const cancelado = ventasRecientes.filter((v) => v.estado !== "Pagado" && v.estado !== "Pendiente").length;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (cargando) return (
    <div style={{ padding: 48, color: "var(--muted)" }}>Cargando dashboard...</div>
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

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent" />
            <div className="stat-content">
              <span className="stat-label">Ventas del día</span>
              <span className="stat-value">{formatCurrency(stats.ingresos_hoy)}</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent success" />
            <div className="stat-content">
              <span className="stat-label">Ventas realizadas</span>
              <span className="stat-value">{stats.ventas_hoy}</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent danger" />
            <div className="stat-content">
              <span className="stat-label">Bajo stock</span>
              <span className="stat-value">{stats.bajo_stock}</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-card">
            <div className="stat-card-accent warning" />
            <div className="stat-content">
              <span className="stat-label">Ingresos totales</span>
              <span className="stat-value">{formatCurrency(stats.ingresos_totales)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 1: Ventas mensuales + Top productos */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Ventas mensuales</h3>
              <p className="chart-subtitle">Acumulado por mes — año actual</p>
            </div>
            <button className="period-badge">Mensual</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 10, color: MUTED, fontFamily: "'Jost', sans-serif" }}>
            <span>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: CHARCOAL, marginRight: 5, verticalAlign: "middle" }} />
              Este año
            </span>
          </div>
          <SalesBarChart key={barData.labels?.join()} data={barData} />
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

      {/* Fila 2: Últimas ventas + Balance */}
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
                {ventasRecientes.map((venta) => (
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
              <button className="btn-print" onClick={() => window.print()}>
                <IconPrint />
              </button>
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
            <div className="print-button-container">
              <button className="btn-print" onClick={() => window.print()}>
                <IconPrint />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}