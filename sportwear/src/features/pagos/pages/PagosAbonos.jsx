// src/pages/pagos/PagosAbonos.jsx
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import './PagosAbonos.css';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { MAX_MONTO, MAX_LONGITUD_NOMBRE } from "../../utils/numerico";
import { DetalleItem, DetalleGrid } from "../../components/ModalDetalle";
import { IconCheck, IconEye, IconSearch, IconX, IconSettings } from "../../components/Icons";
import Loader from "../../components/Loader";
import ExportButtons from "../../components/ExportButtons";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const FILAS_POR_PAGINA = 10;
// ── NUEVO: mismo mínimo que valida el backend — un abono no debería poder
// registrarse por $1 o cualquier valor sin sentido. ──
const MONTO_MINIMO_ABONO = 20000;

// ── NUEVO: mismo patrón de desplegable de estado que ya usan Pedidos y
// Compras — antes, Confirmar/Anular vivían como botones sueltos en
// "Acciones" mientras el estado era solo texto plano; ahora todo vive junto
// en el propio badge de Estado, igual que en el resto del admin. ──
const TRANSICIONES_PAGO = {
  'Pendiente':  ['Confirmado', 'Anulado'],
  'Confirmado': [],
  'Anulado':    [],
};

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheckSm = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function EstadoDropdownPago({ pago, abierto, onToggle, onCambiar, cambiando, tienePerm }) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const estadoActual = pago.estado;
  const esFinal = estadoActual === 'Confirmado' || estadoActual === 'Anulado';
  const siguientes = TRANSICIONES_PAGO[estadoActual] || [];
  const puedeEditar = tienePerm('Pagos.estado') && siguientes.length > 0;

  useEffect(() => {
    if (!abierto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width, arriba: false });
  }, [abierto]);

  // ── NUEVO: voltea el panel hacia arriba si no cabe debajo del botón. ──
  useLayoutEffect(() => {
    if (!abierto || !coords || coords.arriba || !panelRef.current || !btnRef.current) return;
    const panelAlto = panelRef.current.getBoundingClientRect().height;
    const r = btnRef.current.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - r.bottom;
    if (panelAlto + 12 > espacioAbajo) {
      setCoords({ top: r.top - panelAlto - 6, left: r.left, width: r.width, arriba: true });
    }
  }, [abierto, coords]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) onToggle(null);
    };
    const cerrarPorScroll = () => onToggle(null);
    document.addEventListener('mousedown', cerrar);
    window.addEventListener('scroll', cerrarPorScroll, true);
    window.addEventListener('resize', cerrarPorScroll);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      window.removeEventListener('scroll', cerrarPorScroll, true);
      window.removeEventListener('resize', cerrarPorScroll);
    };
  }, [abierto, onToggle]);

  const badgeClase =
    estadoActual === 'Confirmado' ? 'exito' :
    estadoActual === 'Anulado'    ? 'error' : 'pendiente';

  return (
    <div className="pagosabonos-estado-dropdown">
      <button
        ref={btnRef}
        type="button"
        className={`pagosabonos-estado-trigger pagosabonos-estado-${badgeClase}`}
        onClick={() => puedeEditar && onToggle(abierto ? null : pago.id_pago)}
        disabled={!puedeEditar}
      >
        {estadoActual}
        {puedeEditar && <IconChevronDown />}
      </button>

      {abierto && puedeEditar && coords && createPortal(
        <div
          ref={panelRef}
          className="pagosabonos-estado-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 190) }}
        >
          {esFinal ? (
            <div className="pagosabonos-estado-final-msg">
              {estadoActual === 'Confirmado' ? 'Pago confirmado' : 'Pago anulado'}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="pagosabonos-estado-item pagosabonos-estado-item-confirmar clickable"
                disabled={cambiando}
                onClick={() => { onCambiar(pago.id_pago, 'Confirmado'); onToggle(null); }}
              >
                <span className="pagosabonos-estado-dot"><IconCheckSm /></span>
                <span className="pagosabonos-estado-item-label">Confirmar pago</span>
              </button>
              <div className="pagosabonos-estado-divider" />
              <button
                type="button"
                className="pagosabonos-estado-item pagosabonos-estado-item-cancelar clickable"
                disabled={cambiando}
                onClick={() => { onCambiar(pago.id_pago, 'Anulado'); onToggle(null); }}
              >
                <span className="pagosabonos-estado-dot" />
                <span className="pagosabonos-estado-item-label">Anular pago</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function PagosAbonos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos,      setDatos]      = useState([]);
  const [totalPagos, setTotalPagos] = useState(0);
  const [ventas,     setVentas]     = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [busqueda,   setBusqueda]   = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina,     setPagina]     = useState(1);
  const [modal,      setModal]      = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [guardando,  setGuardando]  = useState(false);
  const [form, setForm] = useState({ id_venta: "", monto: "", tipo: "Pago completo", metodo: "Efectivo", estado: "Pendiente", fecha: "" });
  const [errores, setErrores] = useState({ id_venta: "", monto: "", fecha: "" });
  // ── NUEVO: fila con el desplegable de estado abierto (solo una a la vez) ──
  const [filaAbierta, setFilaAbierta] = useState(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  // ── NUEVO: como en Pedidos, el loader de pantalla completa solo debe
  // aparecer en la carga inicial — si no, cada búsqueda desmonta la tabla
  // completa (con el buscador adentro) y el input pierde el foco. ──
  const primerCargaHecha = useRef(false);

  const [metodosPago,    setMetodosPago]    = useState([]);
  const [modalMetodos,   setModalMetodos]   = useState(false);
  const [nuevoMetodo,    setNuevoMetodo]    = useState("");

  useEffect(() => { cargarMetodos(); api.get("/ventas").then(r => setVentas(r.data)).catch(console.error); }, []);

  const cargarMetodos = async () => {
    try {
      const { data } = await api.get("/metodos-pago");
      setMetodosPago(data);
    } catch (err) { console.error("Error cargando métodos de pago:", err); }
  };

  const crearMetodo = async () => {
    if (!nuevoMetodo.trim()) { showToast("error", "Escribe un nombre para el método de pago."); return; }
    try {
      await api.post("/metodos-pago", { nombre: nuevoMetodo.trim() });
      setNuevoMetodo("");
      cargarMetodos();
      showToast("exito", "Método de pago creado correctamente.");
    } catch (err) { showToast("error", err.response?.data?.message ?? "Error al crear el método de pago."); }
  };

  const toggleMetodoEstado = async (id) => {
    try {
      await api.patch(`/metodos-pago/${id}/estado`);
      cargarMetodos();
      showToast("exito", "Estado del método de pago actualizado.");
    } catch (err) { showToast("error", err.response?.data?.message ?? "Error al cambiar el estado del método."); }
  };

  const cargar = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    setErrorMsg("");
    try {
      const { data } = await api.get("/pagos", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setDatos(data.data);
      setTotalPagos(data.total);
    } catch (err) {
      console.error("Error cargando pagos:", err);
      setErrorMsg("No se pudieron cargar los pagos. Intenta de nuevo.");
    } finally {
      setCargando(false);
      primerCargaHecha.current = true;
    }
  };

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const handleVentaChange = (id_venta) => {
    // ── CORREGIDO: antes esto siempre fijaba tipo="Pago completo" sin
    // importar qué venta se eligiera — así que un pago para una venta a
    // cuotas también se guardaba etiquetado "Pago completo" en vez de
    // "Abono". Ahora se calcula según el tipo_pago real de la venta elegida. ──
    const ventaSel = ventas.find(v => String(v.id_venta) === String(id_venta));
    const tipoCorrecto = ventaSel?.tipo_pago === 'cuotas' ? 'Abono' : 'Pago completo';
    setForm(f => ({ ...f, id_venta, tipo: tipoCorrecto }));
    // ── NUEVO: ahora que /ventas sí trae total_pagado real, se puede avisar
    // de una vez si la venta elegida ya está completamente pagada — antes
    // esto no se detectaba nunca (total_pagado llegaba undefined = 0
    // siempre), lo que dejaba registrar pagos de más sin ningún aviso. ──
    const venta = ventas.find(v => String(v.id_venta) === String(id_venta));
    if (venta) {
      const restante = Number(venta.total || 0) - Number(venta.total_pagado || 0);
      if (restante <= 0) {
        setErrores(prev => ({ ...prev, id_venta: "Esta venta ya está completamente pagada — no tiene saldo pendiente." }));
        return;
      }
    }
    setErrores(prev => ({ ...prev, id_venta: "" }));
  };

  const totalPaginas = Math.ceil(totalPagos / FILAS_POR_PAGINA) || 1;

  const restanteVentaSeleccionada = () => {
    const venta = ventas.find(v => String(v.id_venta) === String(form.id_venta));
    if (!venta) return null;
    return Number(venta.total || 0) - Number(venta.total_pagado || 0);
  };

  const errorMonto = (monto) => {
    if (!monto || Number(monto) <= 0) return "El monto es obligatorio";
    const restante = restanteVentaSeleccionada();
    if (restante !== null && Number(monto) > restante) return "El monto no puede ser mayor al saldo de la venta";
    // ── NUEVO: mismo mínimo que valida el backend — salvo que este pago
    // liquide exactamente el saldo restante (ej. últimos $15.000 de una
    // deuda), no tendría sentido exigirle un mínimo más alto que eso. ──
    const liquidaSaldoCompleto = restante !== null && Math.abs(Number(monto) - restante) < 1;
    if (Number(monto) < MONTO_MINIMO_ABONO && !liquidaSaldoCompleto) {
      return `El monto mínimo para un abono es de ${fmt(MONTO_MINIMO_ABONO)} (a menos que liquide el saldo restante).`;
    }
    return "";
  };

  const guardar = async () => {
    const e = {};
    if (!form.id_venta) e.id_venta = "Selecciona una venta";
    const msgMonto = errorMonto(form.monto);
    if (msgMonto) e.monto = msgMonto;
    if (!form.fecha) e.fecha = "La fecha es obligatoria";
    setErrores(e);
    if (Object.keys(e).length > 0) return;
    setGuardando(true);
    try {
      await api.post("/pagos", {
        id_venta: Number(form.id_venta),
        monto:    Number(form.monto),
        tipo:     form.tipo,
        metodo:   form.metodo,
        estado:   form.estado,
        fecha:    form.fecha || new Date().toISOString().split("T")[0],
      });
      cargar();
      setModal(false);
      showToast("exito", "Pago registrado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message ?? "Error al registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  // ── NUEVO: reemplaza a registrarPago/cancelarPago sueltos — un solo
  // handler para el desplegable de estado, igual que en Pedidos/Compras. ──
  const cambiarEstadoPago = async (id_pago, estado) => {
    setCambiandoEstado(true);
    try {
      await api.patch(`/pagos/${id_pago}/estado`, { estado });
      setDatos(prev => prev.map(p => p.id_pago === id_pago ? { ...p, estado } : p));
      showToast("exito", estado === "Confirmado" ? "Pago confirmado correctamente." : "Pago anulado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message ?? "Error al actualizar el pago.");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const getMetodoIcon = (metodo) => {
    switch (metodo) {
      case "Efectivo":      return "Ef.";
      case "Tarjeta":       return "Tarj.";
      case "Transferencia": return "Transf.";
      default:              return "—";
    }
  };

  const abrirRegistrarPago = () => {
    setForm({ id_venta: "", monto: "", tipo: "Pago completo", metodo: metodosPago[0]?.nombre || "Efectivo", estado: "Pendiente", fecha: "" });
    setErrores({ id_venta: "", monto: "", fecha: "" });
    setModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModal(false);
  };

  if (cargando && !primerCargaHecha.current) return <Loader text="Cargando pagos..." />;
  if (errorMsg) return <div style={{ padding: 32, color: "var(--danger)" }}>{errorMsg}<button onClick={() => cargar()} style={{ marginLeft: 12 }}>Reintentar</button></div>;

  return (
    <div className="pagosabonos-container">
      <div className="pagosabonos-actions-bar">
        <div className="pagosabonos-actions-left">
          <div className="pagosabonos-search-wrapper">
          <span className="pagosabonos-search-icon"><IconSearch /></span>
          <input type="text" className="pagosabonos-search-input" placeholder="Buscar por cliente o ID..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {busqueda && <button className="pagosabonos-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>
        </div>
        <div className="pagosabonos-actions-right">
          {tienePerm('Pagos.editar') && (
            <button className="btn-print" onClick={() => setModalMetodos(true)} title="Gestionar métodos de pago"><IconSettings /></button>
          )}
          {tienePerm('Pagos.crear') && (
            <button className="pagosabonos-btn-primary" onClick={abrirRegistrarPago}>
              <span>+</span> Nuevo pago
            </button>
          )}
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/pagos", { params: { q: busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Venta", value: (p) => `V-${String(p.id_venta).padStart(3, "0")}` },
              { header: "Cliente", key: "cliente" },
              { header: "Monto", key: "monto" },
              { header: "Tipo", key: "tipo" },
              { header: "Método", key: "metodo" },
              { header: "Fecha", value: (p) => p.fecha?.toString().split("T")[0] },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="pagos"
            titulo="Pagos y Abonos"
          />
        </div>
      </div>

      <div className="tbl-container" style={{ opacity: cargando ? 0.6 : 1, transition: "opacity 0.15s" }}>
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Venta</th>
              <th className="tbl-th">Cliente</th>
              <th className="tbl-th">Monto</th>
              <th className="tbl-th">Tipo</th>
              <th className="tbl-th">Método</th>
              <th className="tbl-th">Fecha</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {datos.map((p) => (
              <tr key={p.id_pago} className="tbl-row">
                <td className="tbl-td"><span className="pagosabonos-venta-badge">V-{String(p.id_venta).padStart(3, "0")}</span></td>
                <td className="tbl-td"><span className="pagosabonos-cliente-name">{p.cliente}</span></td>
                <td className="tbl-td pagosabonos-monto-cell">{fmt(p.monto)}</td>
                <td className="tbl-td pagosabonos-tipo-cell">{p.tipo}</td>
                <td className="tbl-td">
                  <span className="pagosabonos-metodo">
                    <span className="pagosabonos-metodo-icon">{getMetodoIcon(p.metodo)}</span>
                    {p.metodo}
                  </span>
                </td>
                <td className="tbl-td pagosabonos-fecha-cell">{p.fecha?.toString().split("T")[0]}</td>
                <td className="tbl-td">
                  <EstadoDropdownPago
                    pago={p}
                    abierto={filaAbierta === p.id_pago}
                    onToggle={setFilaAbierta}
                    onCambiar={cambiarEstadoPago}
                    cambiando={cambiandoEstado}
                    tienePerm={tienePerm}
                  />
                </td>
                <td className="tbl-td">
                  <div className="pagosabonos-action-cell">
                    <button className="pagosabonos-action-btn pagosabonos-view-btn" onClick={() => setVerDetalle(p)}><IconEye /></button>
                  </div>
                </td>
              </tr>
            ))}
            {datos.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay pagos que coincidan con la búsqueda.</td></tr>
            )}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalPagos} registros</span>
          </div>
        )}
      </div>

      {/* ── Modal registrar pago: panel único tipo factura ── */}
      {modal && (
        <div className="pagosabonos-modal-overlay" onClick={cerrarModal}>
          <div className="pagosabonos-modal pagosabonos-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="pagosabonos-modal-header">
              <h2 className="pagosabonos-modal-title">Registrar pago o abono</h2>
              <button className="pagosabonos-modal-close" onClick={cerrarModal}><IconX /></button>
            </div>
            <div className="pagosabonos-modal-body pagosabonos-factura-body">
              <div className="pagosabonos-factura-seccion">
                <h3 className="pagosabonos-factura-titulo">Datos del pago</h3>

                <div className="pagosabonos-form-row">
                  <div className="pagosabonos-form-group">
                    <label className="pagosabonos-form-label">Venta asociada</label>
                    <select
                      className={`pagosabonos-form-select${errores.id_venta ? " input-error" : ""}`}
                      value={form.id_venta}
                      onChange={(e) => handleVentaChange(e.target.value)}
                    >
                      <option value="">Seleccionar venta...</option>
                      {ventas.map(v => <option key={v.id_venta} value={v.id_venta}>V-{String(v.id_venta).padStart(3, "0")} — {v.cliente}</option>)}
                    </select>
                    {errores.id_venta && <span className="pagosabonos-field-error">{errores.id_venta}</span>}
                  </div>
                  <div className="pagosabonos-form-group">
                    <label className="pagosabonos-form-label">Monto (COP)</label>
                    <input
                      type="number"
                      min="0"
                      max={MAX_MONTO}
                      className={`pagosabonos-form-input${errores.monto ? " input-error" : ""}`}
                      placeholder="Ej: 50000"
                      value={form.monto}
                      onChange={(e) => {
                        const monto = e.target.value;
                        setForm({ ...form, monto });
                        if (errores.monto) setErrores(prev => ({ ...prev, monto: errorMonto(monto) }));
                      }}
                      onBlur={() => setErrores(prev => ({ ...prev, monto: errorMonto(form.monto) }))}
                    />
                    {errores.monto && <span className="pagosabonos-field-error">{errores.monto}</span>}
                  </div>
                </div>

                <div className="pagosabonos-form-row">
                  <div className="pagosabonos-form-group">
                    <label className="pagosabonos-form-label">Tipo</label>
                    <input className="pagosabonos-form-input" value={form.tipo} readOnly style={{ background: "var(--input-disabled-bg, #f3f4f6)", cursor: "not-allowed" }} />
                  </div>
                  <div className="pagosabonos-form-group">
                    <label className="pagosabonos-form-label">Método</label>
                    <select className="pagosabonos-form-select" value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })}>
                      {metodosPago.filter(m => m.estado === "Activo").map(m => (
                        <option key={m.id_metodo} value={m.nombre}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pagosabonos-form-row">
                  <div className="pagosabonos-form-group">
                    <label className="pagosabonos-form-label">Fecha</label>
                    <input
                      type="date"
                      className={`pagosabonos-form-input${errores.fecha ? " input-error" : ""}`}
                      value={form.fecha}
                      onChange={(e) => {
                        setForm({ ...form, fecha: e.target.value });
                        if (errores.fecha) setErrores(prev => ({ ...prev, fecha: "" }));
                      }}
                    />
                    {errores.fecha && <span className="pagosabonos-field-error">{errores.fecha}</span>}
                  </div>
                  <div className="pagosabonos-form-group">
                    <label className="pagosabonos-form-label">Estado</label>
                    <select className="pagosabonos-form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Confirmado">Confirmado</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="pagosabonos-modal-footer">
              <button className="pagosabonos-btn-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              <button className="pagosabonos-btn-primary" onClick={guardar} disabled={guardando || !form.id_venta || !form.monto || !!errores.id_venta}>
                {guardando ? "Registrando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ver detalle: panel único tipo factura ── */}
      {verDetalle && (
        <div className="pagosabonos-modal-overlay" onClick={() => setVerDetalle(null)}>
          <div className="pagosabonos-modal pagosabonos-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="pagosabonos-modal-header">
              <div>
                <h2 className="pagosabonos-modal-title">Pago P-{String(verDetalle.id_pago).padStart(3, "0")}</h2>
                <p className="pagosabonos-modal-subtitulo">Detalle del pago</p>
              </div>
              <button className="pagosabonos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
            </div>

            <div className="pagosabonos-modal-body pagosabonos-factura-body">
              <div className="pagosabonos-factura-seccion">
                <h3 className="pagosabonos-factura-titulo">Información</h3>
                <DetalleGrid>
                  <DetalleItem label="ID" value={`P-${String(verDetalle.id_pago).padStart(3, "0")}`} />
                  <DetalleItem label="Venta" value={`V-${String(verDetalle.id_venta).padStart(3, "0")}`} />
                  <DetalleItem label="Cliente" value={verDetalle.cliente} />
                  <DetalleItem label="Tipo" value={verDetalle.tipo} />
                  <DetalleItem label="Método" value={verDetalle.metodo} />
                  <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
                </DetalleGrid>
              </div>

              <div className="pagosabonos-factura-seccion">
                <h3 className="pagosabonos-factura-titulo">Pago</h3>
                <DetalleGrid>
                  <DetalleItem label="Monto" value={fmt(verDetalle.monto)} />
                  <DetalleItem label="Estado" value={
                    <span className={`pagosabonos-estado-badge-static pagosabonos-estado-${
                      verDetalle.estado === 'Confirmado' ? 'exito' : verDetalle.estado === 'Anulado' ? 'error' : 'pendiente'
                    }`}>{verDetalle.estado}</span>
                  } />
                </DetalleGrid>
              </div>
            </div>

            <div className="pagosabonos-modal-footer">
              <button className="pagosabonos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modalMetodos && (
        <div className="pagosabonos-modal-overlay" onClick={() => setModalMetodos(false)}>
          <div className="pagosabonos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pagosabonos-modal-header">
              <h2 className="pagosabonos-modal-title">Métodos de pago</h2>
              <button className="pagosabonos-modal-close" onClick={() => setModalMetodos(false)}><IconX /></button>
            </div>
            <div className="pagosabonos-modal-body">
              <div className="pagosabonos-form-row">
                <div className="pagosabonos-form-group" style={{ flex: 1 }}>
                  <label className="pagosabonos-form-label">Nuevo método</label>
                  <input
                    className="pagosabonos-form-input"
                    placeholder="Ej: Nequi"
                    maxLength={MAX_LONGITUD_NOMBRE}
                    value={nuevoMetodo}
                    onChange={(e) => setNuevoMetodo(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") crearMetodo(); }}
                  />
                </div>
                <button className="pagosabonos-btn-primary" style={{ alignSelf: "flex-end", marginBottom: 2 }} onClick={crearMetodo}>
                  Agregar
                </button>
              </div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {metodosPago.length === 0 && (
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>No hay métodos de pago registrados.</p>
                )}
                {metodosPago.map((m) => (
                  <div key={m.id_metodo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid var(--border, #e5e5e5)", borderRadius: 8 }}>
                    <span>{m.nombre}</span>
                    <button
                      className={`tabla-status ${m.estado === "Activo" ? "activo" : "inactivo"}`}
                      style={{ cursor: "pointer", border: "none" }}
                      onClick={() => toggleMetodoEstado(m.id_metodo)}
                    >
                      {m.estado}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="pagosabonos-modal-footer">
              <button className="pagosabonos-btn-secondary" onClick={() => setModalMetodos(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}