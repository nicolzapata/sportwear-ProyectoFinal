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

/* ── Datos demo Admin ── */
const DEMO_STATS = {
  ingresos_hoy: 735000, ventas_hoy: 4, bajo_stock: 3,
  ingresos_totales: 5_835_000, total_productos: 24,
};
const DEMO_VENTAS_MENSUALES = {
  labels:   ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar"],
  current:  [1_200_000, 1_850_000, 2_400_000, 980_000, 1_560_000, 1_940_000],
  previous: [  900_000, 1_100_000, 1_800_000, 750_000, 1_200_000, 1_500_000],
};
const DEMO_TOP_PRODUCTOS = [
  { nombre: "Enterizo Largo - Manga Corta (Rojo)",     total_vendido: 18 },
  { nombre: "Enterizo Largo - Manga Corta (Negro)",    total_vendido: 14 },
  { nombre: "Enterizo Largo - Manga Larga - Cierre",   total_vendido: 11 },
  { nombre: "Enterizo Largo - Manga Corta (Azul)",     total_vendido:  8 },
  { nombre: "Enterizo Largo - Manga Larga - Elástico", total_vendido:  6 },
];
const DEMO_VENTAS_RECIENTES = [
  { id_venta: 1, cliente: "Valentina Gómez",      producto: "Enterizo Largo - Manga Corta (Rojo)",  total: 280000, estado: "Pagado"    },
  { id_venta: 2, cliente: "Carlos Martínez",       producto: "Enterizo Largo - Manga Corta (Negro)", total: 120000, estado: "Pagado"    },
  { id_venta: 3, cliente: "Sofía Restrepo",        producto: "Pantalón Tiro Alto",                  total: 195000, estado: "Pagado"    },
  { id_venta: 4, cliente: "Andrés Zapata",         producto: "Enterizo Largo - Manga Corta (Azul)", total:  85000, estado: "Cancelado" },
  { id_venta: 5, cliente: "Luisa Fernanda Torres", producto: "Falda Midi Flores",                   total: 155000, estado: "Pagado"    },
];

/* ── Charts ── */
function SalesBarChart({ data }) {
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
          labels: data.labels,
          datasets: [
            { label: "Este año",   data: data.current,  backgroundColor: CHARCOAL, borderRadius: 4, borderSkipped: false, barPercentage: 0.45, categoryPercentage: 0.65 },
            { label: "Año pasado", data: data.previous, backgroundColor: BROWN,    borderRadius: 4, borderSkipped: false, barPercentage: 0.45, categoryPercentage: 0.65 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#fff", borderColor: BORDER, borderWidth: 1,
              titleColor: CHARCOAL, bodyColor: MUTED, cornerRadius: 8, padding: 10,
              callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
            },
          },
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: MUTED, font: { family: "'Jost', sans-serif", size: 10 } } },
            y: { grid: { color: "#f0ede8" }, border: { display: false, dash: [3,3] }, ticks: { color: MUTED, font: { family: "'Jost', sans-serif", size: 10 }, maxTicksLimit: 5, callback: (v) => formatCurrency(v) } },
          },
        },
      });
    });
    return () => { destroyed = true; chartRef.current?.destroy(); };
  }, [data]);
  return <div style={{ position: "relative", height: 160 }}><canvas ref={canvasRef} /></div>;
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
        data: { datasets: [{ data: [pagado, pendiente, cancelado], backgroundColor: [CHARCOAL, BROWN, LIGHT], borderWidth: 0, hoverOffset: 4 }] },
        options: { responsive: true, maintainAspectRatio: true, cutout: "72%", plugins: { legend: { display: false }, tooltip: { enabled: false } } },
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
  const stats           = DEMO_STATS;
  const topProductos    = DEMO_TOP_PRODUCTOS;
  const ventasRecientes = DEMO_VENTAS_RECIENTES;
  const barData         = DEMO_VENTAS_MENSUALES;

  const getBadgeClass = (estado) => {
    switch (estado) {
      case "Pagado":    return "badge-success";
      case "Pendiente": return "badge-warning";
      default:          return "badge-danger";
    }
  };

  const pagado    = ventasRecientes.filter((v) => v.estado === "Pagado").length;
  const pendiente = ventasRecientes.filter((v) => v.estado === "Pendiente").length;
  const cancelado = ventasRecientes.filter((v) => v.estado !== "Pagado" && v.estado !== "Pendiente").length;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Panel de control</h1>
          <p className="dashboard-subtitle">Resumen ejecutivo · DVNA Colección</p>
        </div>
        <span className="dashboard-date">{today}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-card-wrapper">
          <div className="stat-icon stat-icon-primary"><IconDollar /></div>
          <div className="stat-card">
            <div className="stat-card-accent" />
            <div className="stat-content">
              <span className="stat-label">Ventas del día</span>
              <span className="stat-value">{formatCurrency(stats.ingresos_hoy)}</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-icon stat-icon-success"><IconCart /></div>
          <div className="stat-card">
            <div className="stat-card-accent success" />
            <div className="stat-content">
              <span className="stat-label">Ventas realizadas</span>
              <span className="stat-value">{stats.ventas_hoy}</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-icon stat-icon-danger"><IconAlertTriangle /></div>
          <div className="stat-card">
            <div className="stat-card-accent danger" />
            <div className="stat-content">
              <span className="stat-label">Bajo stock</span>
              <span className="stat-value">{stats.bajo_stock}</span>
            </div>
          </div>
        </div>
        <div className="stat-card-wrapper">
          <div className="stat-icon stat-icon-warning"><IconBolt /></div>
          <div className="stat-card">
            <div className="stat-card-accent warning" />
            <div className="stat-content">
              <span className="stat-label">Ingresos totales</span>
              <span className="stat-value">{formatCurrency(stats.ingresos_totales)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Ventas mensuales</h3>
              <p className="chart-subtitle">Comparativo año anterior</p>
            </div>
            <button className="period-badge">Mensual</button>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 10, color: MUTED, fontFamily: "'Jost', sans-serif" }}>
            <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: CHARCOAL, marginRight: 5, verticalAlign: "middle" }} />Este año</span>
            <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: BROWN,    marginRight: 5, verticalAlign: "middle" }} />Año pasado</span>
          </div>
          <SalesBarChart data={barData} />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Top productos</h3>
              <p className="chart-subtitle">Los más vendidos</p>
            </div>
          </div>
          <div className="top-products">
            {topProductos.map((producto, index) => (
              <div key={index} className="top-product">
                <div className="top-product-info">
                  <span className={`top-product-rank ${index === 0 ? "gold" : ""}`}>{index + 1}</span>
                  <span className="top-product-name">{producto.nombre}</span>
                  <span className="top-product-count">{producto.total_vendido} uds</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(producto.total_vendido / topProductos[0].total_vendido) * 100}%` }} />
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
              <thead>
                <tr>
                  <th className="tbl-th">Cliente</th>
                  <th className="tbl-th">Producto</th>
                  <th className="tbl-th">Total</th>
                  <th className="tbl-th">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventasRecientes.map((venta) => (
                  <tr key={venta.id_venta} className="tbl-row">
                    <td className="tbl-td">{venta.cliente}</td>
                    <td className="tbl-td">{venta.producto}</td>
                    <td className="tbl-td">{formatCurrency(venta.total)}</td>
                    <td className="tbl-td">
                      <span className={`badge ${getBadgeClass(venta.estado)}`}>{venta.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Balance</h3>
              <p className="chart-subtitle">Distribución de ventas</p>
            </div>
          </div>
          <DonutChart pagado={pagado} pendiente={pendiente} cancelado={cancelado} />
        </div>
      </div>

      <div className="bottom-stats">
        <div className="stat-mini-card">
          <span className="stat-mini-icon"><IconDollar /></span>
          <div>
            <span className="stat-mini-label">Ingresos totales</span>
            <span className="stat-mini-value">{formatCurrency(stats.ingresos_totales)}</span>
          </div>
        </div>
        <div className="stat-mini-card">
          <span className="stat-mini-icon"><IconTag /></span>
          <div>
            <span className="stat-mini-label">Productos totales</span>
            <span className="stat-mini-value">{stats.total_productos}</span>
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

  const [pedidos, setPedidos]             = useState([]);
  const [perfil, setPerfil]               = useState(null);
  const [showModalSteps, setShowModalSteps] = useState(false);
  const [form, setForm]                   = useState({});
  const [guardando, setGuardando]         = useState(false);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [barrios, setBarrios]             = useState([]);
  const [zonas, setZonas]                 = useState([]);
  const [barFiltrados, setBarFiltrados]   = useState([]);
  const [detallesPedidos, setDetallesPedidos] = useState({});

  /* ── Nuevos estados ── */
  const [pagoModal, setPagoModal]         = useState(null); // pedido abierto en modal de pago
  const [detalleModal, setDetalleModal]   = useState(null); // pedido abierto en modal de detalle
  const [toastMsg, setToastMsg]           = useState(null);

  /* ── Carga inicial ── */
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

  /* ── Callback: pago confirmado → actualizar estado local en tiempo real ── */
  const handlePagoConfirmado = ({ id_venta, montoPagado, cuotaId, estaCompleto, nuevoTotalPagado }) => {
    const actualizarPedido = (p) => {
      if (p.id_venta !== id_venta) return p;
      const abonosActualizados = p.abonos?.map((a) => {
        if (cuotaId) return a.id_pago === cuotaId ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
        return a.estado === "Pendiente" ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
      });
      return { ...p, total_pagado: nuevoTotalPagado, estado: estaCompleto ? "Pagado" : "Abonado", abonos: abonosActualizados };
    };

    setPedidos((prev) => prev.map(actualizarPedido));

    // Sincronizar detalle si está abierto
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

  /* ── Helpers UI ── */
  const getBadgeClass = (estado) => {
    switch (estado) {
      case "Pagado": case "Confirmado": case "Abonado": return "badge-success";
      case "Pendiente":  return "badge-warning";
      case "Cancelado":  return "badge-danger";
      default:           return "badge-secondary";
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

  /* ── Stats de perfil ── */
  const totalCompras = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalPagado  = pedidos.reduce((s, p) => s + Number(p.total_pagado || 0), 0);
  const countPagados = pedidos.filter((p) => ["Pagado","Confirmado","Abonado"].includes(p.estado)).length;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  /* ── Campos perfil (solo lectura) ── */
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

  /* ── Pasos editar perfil ── */
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
            {["CC","CE","TI","NIT","Pasaporte"].map((t) => <option key={t}>{t}</option>)}
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

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="dashboard">

      {/* Toast */}
      {toastMsg && <div className="dvna-toast">{toastMsg}</div>}

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            ¡Hola, {usuario?.nombre?.split(" ")[0] || "cliente"}!
          </h1>
        </div>
        <span className="dashboard-date">{today}</span>
      </div>

      {/* ── Perfil ── */}
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

      {/* Modal editar perfil */}
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

      {/* ── TABLA DE PEDIDOS ── */}
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
              <thead>
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
                  const esCuotas          = pedido.tipo_pago === "cuotas";
                  const restante          = Number(pedido.total || 0) - Number(pedido.total_pagado || 0);
                  const puedePagar        = restante > 0 && pedido.estado !== "Cancelado";
                  const textoTipo         = esCuotas ? `${abonosConfirmados}/${pedido.num_cuotas}` : "Completo";

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

                      {/* ── COLUMNA PAGAR ── */}
                      <td className="tbl-td">
                        {puedePagar ? (
                          <button
                            className="tbl-action-btn tbl-action-btn--pay"
                            onClick={() => setPagoModal(pedido)}
                          >
                            <IconCreditCard /> Pagar
                          </button>
                        ) : (
                          <span className="tbl-action-disabled">
                            {pedido.estado === "Cancelado" ? "Cancelado" : "Al día"}
                          </span>
                        )}
                      </td>

                      {/* ── COLUMNA VER DETALLE ── */}
                      <td className="tbl-td">
                        <button
                          className="tbl-action-btn tbl-action-btn--detail"
                          onClick={() => cargarDetallePedido(pedido)}
                        >
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

      {/* ── Modal de PAGO ── */}
      {pagoModal && (
        <PaymentModal
          pedido={pagoModal}
          cliente={perfil}
          onClose={() => setPagoModal(null)}
          onPagoConfirmado={handlePagoConfirmado}
        />
      )}

      {/* ── Modal de DETALLE ── */}
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

/* ════════════════════════════════════════════
   EXPORT PRINCIPAL
════════════════════════════════════════════ */
export default function Dashboard() {
  const { usuario } = useAuth();
  return usuario?.rol === "Admin" ? <DashboardAdmin /> : <DashboardCliente />;
}