// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import ModalSteps from "../../components/ModalSteps";
import PaymentModal from "../../components/PaymentModal";
import OrderDetailModal from "../../components/OrderDetailModal";
import {
  IconAlertTriangle, IconBox, IconBolt, IconCart, IconCheck,
  IconClock, IconCreditCard, IconDollar, IconShoppingCart, IconTag, IconX,
  IconPrint, IconUsers,
} from "../../components/Icons";
import "./Dashboard.css";
import "../roles/Roles.css";
import "../clientes/Clientes.css";

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

      // Soporta tanto { labels, values } (backend) como { labels, current } (legacy)
      const valores = data.values || data.current || [];

      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: "Este año",
              data: valores,
              backgroundColor: CHARCOAL,
              borderRadius: 4,
              borderSkipped: false,
              barPercentage: 0.55,
              categoryPercentage: 0.7,
            },
          ],
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
              callbacks: {
                label: (ctx) => `  ${formatCurrency(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                color: MUTED,
                font: { family: "'Jost', sans-serif", size: 10 },
              },
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
function DashboardAdmin() {
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
  const [topProductos, setTopProductos]       = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [ventasMensuales, setVentasMensuales] = useState(null);
  const [cargando, setCargando]               = useState(true);

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

  if (cargando) return <div style={{ padding: 48, color: "var(--muted)" }}>Cargando dashboard...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Panel de control</h1>
          <p className="dashboard-subtitle">Resumen ejecutivo · DVNA Colección</p>
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

/* ════════════════════════════════════════════
   DASHBOARD CLIENTE
════════════════════════════════════════════ */
function DashboardCliente() {
  const { usuario, actualizarUsuario } = useAuth();

  const [pedidos, setPedidos]               = useState([]);
  const [perfil, setPerfil]                 = useState(null);
  const [showModalSteps, setShowModalSteps] = useState(false);
  const [form, setForm]                     = useState({});
  const [guardando, setGuardando]           = useState(false);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [barrios, setBarrios]               = useState([]);
  const [zonas, setZonas]                   = useState([]);
  const [barFiltrados, setBarFiltrados]     = useState([]);
  const [detallesPedidos, setDetallesPedidos] = useState({});
  const [pagoModal, setPagoModal]           = useState(null);
  const [detalleModal, setDetalleModal]     = useState(null);
  const [toastMsg, setToastMsg]             = useState(null);

  useEffect(() => {
    if (!usuario) return;
    setCargandoPerfil(true);
    Promise.all([
      api.get("/ventas/mis-pedidos").catch(() => ({ data: [] })),
      api.get("/clientes/mi-perfil").catch(() => ({ data: null })),
      api.get("/barrios").catch(() => ({ data: [] })),
      api.get("/barrios/zonas").catch(() => ({ data: [] })),
    ]).then(([pedidosRes, perfilRes, barriosRes, zonasRes]) => {
      const filtrados = (pedidosRes.data || []).filter(
        (p) => ["Confirmado", "Pagado", "Cancelado", "Abonado"].includes(p.estado)
      );
      setPedidos(filtrados);
      if (perfilRes.data) {
        setPerfil(perfilRes.data);
        setForm({
          nombre:        perfilRes.data.nombre        || "",
          tipo_doc:      perfilRes.data.tipo_doc      || "CC",
          documento:     perfilRes.data.documento     || "",
          telefono:      perfilRes.data.telefono      || "",
          email:         perfilRes.data.email         || "",
          id_barrio:     perfilRes.data.id_barrio     || "",
          direccion:     perfilRes.data.direccion     || "",
          ciudad:        perfilRes.data.ciudad        || "Medellín",
          tipo_cliente:  perfilRes.data.tipo_cliente  || "Regular",
          permiso_pagos: perfilRes.data.permiso_pagos || 1,
          estado:        perfilRes.data.estado        || "Activo",
        });
      }
      setBarrios(barriosRes.data);
      setBarFiltrados(barriosRes.data);
      setZonas(zonasRes.data);
      setCargandoPerfil(false);
    });
  }, [usuario]);

  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter((b) => b.zona === zona) : barrios);
    setForm((f) => ({ ...f, id_barrio: "" }));
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      const { data } = await api.put("/clientes/mi-perfil", form);
      setPerfil(data);
      actualizarUsuario({ nombre: data.nombre });
      setShowModalSteps(false);
    } catch (err) {
      alert("Error al guardar: " + (err.response?.data?.message || "Error"));
    } finally {
      setGuardando(false);
    }
  };

  const handlePagoConfirmado = ({ id_venta, cuotaId, estaCompleto, nuevoTotalPagado }) => {
    const actualizarPedido = (p) => {
      if (p.id_venta !== id_venta) return p;
      const abonosActualizados = p.abonos?.map((a) => {
        if (cuotaId) return a.id_pago === cuotaId ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
        return a.estado === "Pendiente" ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
      });
      return { ...p, total_pagado: nuevoTotalPagado, estado: estaCompleto ? "Pagado" : "Abonado", abonos: abonosActualizados };
    };
    setPedidos((prev) => prev.map(actualizarPedido));
    setDetalleModal((prev) => prev ? actualizarPedido(prev) : null);
    showToast(estaCompleto ? "✅ ¡Pedido pagado completamente!" : "✅ Abono registrado con éxito");
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const cargarDetallePedido = async (pedido) => {
    try {
      const { data } = await api.get(`/ventas/${pedido.id_venta}`);
      setDetallesPedidos((prev) => ({ ...prev, [pedido.id_venta]: data }));
      setDetalleModal(pedido);
    } catch (err) {
      console.error("Error cargando detalle:", err);
      setDetalleModal(pedido);
    }
  };

  const getBadgeClass = (estado) => {
    switch (estado) {
      case "Pagado": case "Confirmado": case "Abonado": return "exito";
      case "Pendiente": return "pendiente";
      case "Cancelado": return "error";
      default:          return "info";
    }
  };

  const formatEstado = (estado) =>
    ({ Confirmado: "Confirmado", Pagado: "Pagado", Cancelado: "Cancelado", Abonado: "Abonado", Pendiente: "Pendiente" }[estado] || estado);

  const fmt = (n) =>
    Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

  const getInitials = (nombre) => {
    if (!nombre) return "?";
    return nombre.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
  };

  const getBarrioNombre = (id) => {
    const b = barrios.find((b) => b.id_barrio === id);
    return b ? `${b.nombre} (${b.comuna})` : null;
  };

  const totalCompras = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalPagado  = pedidos.reduce((s, p) => s + Number(p.total_pagado || 0), 0);
  const countPagados = pedidos.filter((p) => ["Pagado", "Confirmado", "Abonado"].includes(p.estado)).length;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const camposPerfil = [
    { label: "Nombre",    key: "nombre"    },
    { label: "Tipo doc.", key: "tipo_doc"  },
    { label: "Documento", key: "documento" },
    { label: "Teléfono",  key: "telefono"  },
    { label: "Email",     key: "email"     },
    { label: "Ciudad",    key: "ciudad"    },
    { label: "Barrio",    key: "id_barrio" },
    { label: "Dirección", key: "direccion" },
  ];

  const PasoDatos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label>
        <input className="ms-form-input" placeholder="Ej: Juan Pérez" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Tipo documento</label>
          <select className="ms-form-select" value={form.tipo_doc} onChange={(e) => setForm({ ...form, tipo_doc: e.target.value })}>
            {["CC", "CE", "TI", "NIT", "Pasaporte"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">N° documento <span className="ms-req">*</span></label>
          <input className="ms-form-input" placeholder="123456789" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
        </div>
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Teléfono</label>
          <input className="ms-form-input" placeholder="3001234567" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Correo electrónico</label>
          <input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
    </div>
  );

  const PasoUbicacion = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Ciudad</label>
        <input className="ms-form-input" value="Medellín" disabled style={{ opacity: 0.55 }} />
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Zona / Área</label>
          <select className="ms-form-select" onChange={(e) => handleZona(e.target.value)}>
            <option value="">— Todas las zonas —</option>
            {zonas.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Barrio / Comuna</label>
          <select className="ms-form-select" value={form.id_barrio} onChange={(e) => setForm({ ...form, id_barrio: Number(e.target.value) })}>
            <option value="">— Seleccionar —</option>
            {barFiltrados.map((b) => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} — {b.comuna}</option>)}
          </select>
        </div>
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">Dirección completa</label>
        <input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      {toastMsg && <div className="dvna-toast">{toastMsg}</div>}

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            ¡Hola, {usuario?.nombre?.split(" ")[0] || "cliente"}!
          </h1>
        </div>
        <span className="dashboard-date">{today}</span>
      </div>

      {/* Perfil */}
      <div className="chart-card" style={{ marginBottom: 16 }}>
        {cargandoPerfil ? (
          <p style={{ color: "var(--dvna-muted)", fontSize: 13 }}>Cargando...</p>
        ) : perfil ? (
          <>
            <div className="profile-top-row">
              <div className="profile-avatar">
                <span className="profile-initials">{getInitials(perfil.nombre || usuario?.nombre)}</span>
              </div>
              <div className="profile-right">
                <p className="profile-name">{perfil.nombre || usuario?.nombre}</p>
                {perfil.documento && <p className="profile-doc">CC {perfil.documento}</p>}
                <div className="profile-stats-row">
                  {[
                    { value: pedidos.length,    label: pedidos.length === 1 ? "pedido" : "pedidos" },
                    { value: fmt(totalCompras), label: "total compras" },
                    { value: fmt(totalPagado),  label: "total pagado" },
                    { value: countPagados,      label: countPagados === 1 ? "pagado" : "pagados" },
                  ].map((stat, i, arr) => (
                    <div key={i} className="profile-stats-group">
                      <div className="profile-stat-item">
                        <span className="profile-stat-value">{stat.value}</span>
                        <span className="profile-stat-label">{stat.label}</span>
                      </div>
                      {i < arr.length - 1 && <div className="profile-stat-divider" />}
                    </div>
                  ))}
                </div>
                {!showModalSteps && (
                  <button className="btn profile-edit-btn" onClick={() => setShowModalSteps(true)}>
                    Editar perfil
                  </button>
                )}
              </div>
            </div>
            <div className="profile-fields-grid">
              {camposPerfil.map(({ label, key }) => (
                <div key={key} className="profile-field-item">
                  <label className="profile-field-label">{label}</label>
                  <p className="profile-field-value">
                    {key === "id_barrio"
                      ? getBarrioNombre(perfil[key]) || <span style={{ color: "var(--dvna-muted)", fontStyle: "italic" }}>No registrado</span>
                      : perfil[key] || <span style={{ color: "var(--dvna-muted)", fontStyle: "italic" }}>No registrado</span>}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: "var(--dvna-muted)", fontSize: 13 }}>No se pudo cargar la información del perfil.</p>
        )}
      </div>

      {showModalSteps && (
        <ModalSteps
          titulo="Editar perfil"
          pasos={["Datos personales", "Ubicación"]}
          onClose={() => setShowModalSteps(false)}
          onGuardar={guardarCambios}
          labelGuardar="Actualizar"
          guardando={guardando}
        >
          {PasoDatos}
          {PasoUbicacion}
        </ModalSteps>
      )}

      {/* Tabla de pedidos */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3 className="chart-title">Tus pedidos</h3>
            <p className="chart-subtitle">Historial de compras</p>
          </div>
        </div>

        {pedidos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><IconShoppingCart /></div>
            <h4 className="empty-state-title">Aún no tienes pedidos</h4>
            <p className="empty-state-text">Explora nuestro catálogo y encuentra lo que buscas</p>
            <a href="/catalogo" className="btn-primary">Ver catálogo</a>
          </div>
        ) : (
          <div className="tbl-container">
            <table className="tbl">
              <thead className="tbl-header">
                <tr>
                  <th className="tbl-th">#</th>
                  <th className="tbl-th">Productos</th>
                  <th className="tbl-th">Total</th>
                  <th className="tbl-th">Pagado</th>
                  <th className="tbl-th">Tipo</th>
                  <th className="tbl-th">Fecha</th>
                  <th className="tbl-th">Estado</th>
                  <th className="tbl-th">Pagar</th>
                  <th className="tbl-th">Ver detalle</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido, idx) => {
                  const abonosConfirmados = pedido.abonos?.filter((a) => a.estado === "Confirmado").length || 0;
                  const esCuotas  = pedido.tipo_pago === "cuotas";
                  const restante  = Number(pedido.total || 0) - Number(pedido.total_pagado || 0);
                  const puedePagar = restante > 0 && pedido.estado !== "Cancelado";
                  const textoTipo = esCuotas ? `${abonosConfirmados}/${pedido.num_cuotas}` : "Completo";

                  return (
                    <tr key={pedido.id_venta} className="tbl-row">
                      <td className="tbl-td">{idx + 1}</td>
                      <td className="tbl-td">{pedido.items?.map((i) => i.producto).join(", ") || "Sin productos"}</td>
                      <td className="tbl-td">{fmt(pedido.total)}</td>
                      <td className="tbl-td">{fmt(pedido.total_pagado || 0)}</td>
                      <td className="tbl-td">
                        <span className={`badge ${esCuotas ? "badge-info" : "badge-secondary"}`}>{textoTipo}</span>
                      </td>
                      <td className="tbl-td">{new Date(pedido.fecha).toLocaleDateString("es-CO")}</td>
                      <td className="tbl-td">
                        <span className={`badge ${getBadgeClass(pedido.estado)}`}>{formatEstado(pedido.estado)}</span>
                      </td>
                      <td className="tbl-td">
                        {puedePagar ? (
                          <button className="tbl-action-btn tbl-action-btn--pay" onClick={() => setPagoModal(pedido)}>
                            <IconCreditCard /> Pagar
                          </button>
                        ) : (
                          <span className="tbl-disabled">
                            {pedido.estado === "Cancelado" ? "Cancelado" : "Al día"}
                          </span>
                        )}
                      </td>
                      <td className="tbl-td">
                        <button className="tbl-action-btn tbl-action-btn--view" onClick={() => cargarDetallePedido(pedido)}>
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagoModal && (
        <PaymentModal
          pedido={pagoModal}
          cliente={perfil}
          onClose={() => setPagoModal(null)}
          onPagoConfirmado={handlePagoConfirmado}
        />
      )}

      {detalleModal && (
        <OrderDetailModal
          pedido={detallesPedidos[detalleModal.id_venta] || detalleModal}
          onClose={() => {
            setDetalleModal(null);
            setDetallesPedidos((prev) => {
              const newObj = { ...prev };
              delete newObj[detalleModal.id_venta];
              return newObj;
            });
          }}
        />
      )}
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  return usuario?.rol === "Cliente" ? <DashboardCliente /> : <DashboardAdmin />;
}