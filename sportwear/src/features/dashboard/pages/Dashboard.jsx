// src/pages/dashboard/Dashboard.jsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import api from "../../../shared/services/api";
import MiCuenta from "../../clientes/pages/MiCuenta";
import Loader from "../../../shared/components/Loader";
import { IconAlertTriangle } from "../../../shared/components/Icons";
import "./Dashboard.css";
import ReporteFechasCard from "../components/dashboard/ReporteFechasCard";
import StatsGrid from "../components/dashboard/StatsGrid";
import VentasMensualesCard from "../components/dashboard/VentasMensualesCard";
import TopProductosCard from "../components/dashboard/TopProductosCard";
import UltimasVentasCard from "../components/dashboard/UltimasVentasCard";
import BalanceCard from "../components/dashboard/BalanceCard";
import ComprasMensualesCard from "../components/dashboard/ComprasMensualesCard";
import ClientesRecientesCard from "../components/dashboard/ClientesRecientesCard";
import BajoStockTable from "../components/dashboard/BajoStockTable";
import { hoyISO } from "../utils/dashboardHelpers";

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

      <ReporteFechasCard
        reporteDesde={reporteDesde} setReporteDesde={setReporteDesde}
        reporteHasta={reporteHasta} setReporteHasta={setReporteHasta}
        generarReporte={generarReporte} cargandoReporte={cargandoReporte}
        reporte={reporte} quitarFiltro={quitarFiltro} errorReporte={errorReporte}
      />

      <StatsGrid stats={stats} reporte={reporte} />

      <div className="charts-grid">
        <VentasMensualesCard
          reporte={reporte} periodoVentas={periodoVentas} setPeriodoVentas={setPeriodoVentas} ventasData={ventasData}
        />
        <TopProductosCard reporte={reporte} topProductos={topProductos} />
      </div>

      <div className="charts-grid-2">
        <UltimasVentasCard
          reporte={reporte} ventasRecientes={ventasRecientes}
          ventasRecientesPagina={ventasRecientesPagina} setVentasRecientesPagina={setVentasRecientesPagina}
          ventasRecientesPorPagina={VENTAS_RECIENTES_POR_PAGINA}
        />
        <BalanceCard reporte={reporte} stats={stats} pagado={pagado} pendiente={pendiente} cancelado={cancelado} />
      </div>

      <div className="charts-grid-2">
        <ComprasMensualesCard
          reporte={reporte} periodoCompras={periodoCompras} setPeriodoCompras={setPeriodoCompras} comprasData={comprasData}
        />
        <ClientesRecientesCard
          reporte={reporte} clientesRecientes={clientesRecientes}
          clientesRecientesPagina={clientesRecientesPagina} setClientesRecientesPagina={setClientesRecientesPagina}
          clientesRecientesPorPagina={CLIENTES_RECIENTES_POR_PAGINA}
        />
      </div>

      <BajoStockTable
        bajoStockAgrupado={bajoStockAgrupado} expandidosStock={expandidosStock} toggleExpandidoStock={toggleExpandidoStock}
      />
    </div>
  );
}
