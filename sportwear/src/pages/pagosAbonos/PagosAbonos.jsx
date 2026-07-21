// src/pages/pagos/PagosAbonos.jsx
import { useState, useEffect } from "react";
import './PagosAbonos.css';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { DetalleItem, DetalleGrid } from "../../components/ModalDetalle";
import { IconCheck, IconEye, IconSearch, IconX, IconSettings } from "../../components/Icons";
import Loader from "../../components/Loader";
import ExportButtons from "../../components/ExportButtons";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const FILAS_POR_PAGINA = 10;

export default function PagosAbonos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

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
    if (!nuevoMetodo.trim()) return;
    try {
      await api.post("/metodos-pago", { nombre: nuevoMetodo.trim() });
      setNuevoMetodo("");
      cargarMetodos();
    } catch (err) { alert(err.response?.data?.message ?? "Error al crear el método de pago."); }
  };

  const toggleMetodoEstado = async (id) => {
    try {
      await api.patch(`/metodos-pago/${id}/estado`);
      cargarMetodos();
    } catch (err) { alert(err.response?.data?.message ?? "Error al cambiar el estado del método."); }
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
    setForm(f => ({ ...f, id_venta, tipo: "Pago completo" }));
  };

  const totalPaginas = Math.ceil(totalPagos / FILAS_POR_PAGINA) || 1;

  const guardar = async () => {
    const e = {};
    if (!form.id_venta) e.id_venta = "Selecciona una venta";
    if (!form.monto || Number(form.monto) <= 0) e.monto = "El monto es obligatorio";
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
    } catch (err) {
      alert(err.response?.data?.message ?? "Error al registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  const registrarPago = async (id) => {
    try {
      await api.patch(`/pagos/${id}/estado`, { estado: "Confirmado" });
      setDatos(prev => prev.map(p => p.id_pago === id ? { ...p, estado: "Confirmado" } : p));
    } catch (err) { alert(err.response?.data?.message ?? "Error al registrar el pago."); }
  };

  const cancelarPago = async (id) => {
    try {
      await api.patch(`/pagos/${id}/estado`, { estado: "Anulado" });
      setDatos(prev => prev.map(p => p.id_pago === id ? { ...p, estado: "Anulado" } : p));
    } catch (err) { alert(err.response?.data?.message ?? "Error al cancelar el pago."); }
  };

  const getMetodoIcon = (metodo) => {
    switch (metodo) {
      case "Efectivo":      return "Ef.";
      case "Tarjeta":       return "Tarj.";
      case "Transferencia": return "Transf.";
      default:              return "—";
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "Confirmado": return "exito";
      case "Pendiente":  return "pendiente";
      case "Anulado":    return "error";
      default:           return "info";
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

  if (cargando) return <Loader text="Cargando pagos..." />;
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

      <div className="tbl-container">
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
                <td className="tbl-td"><span className={`tabla-badge ${getEstadoBadge(p.estado)}`}>{p.estado}</span></td>
                <td className="tbl-td">
                  <div className="pagosabonos-action-cell">
                    <button className="pagosabonos-action-btn pagosabonos-view-btn" onClick={() => setVerDetalle(p)}><IconEye /></button>
                    {tienePerm('Pagos.estado') && p.estado === "Pendiente" && (
                      <>
                        <button className="pagosabonos-action-btn pagosabonos-register-btn" onClick={() => registrarPago(p.id_pago)} title="Registrar pago"><IconCheck /></button>
                        <button className="pagosabonos-action-btn pagosabonos-cancel-btn" onClick={() => cancelarPago(p.id_pago)} title="Cancelar"><IconX /></button>
                      </>
                    )}
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
                      onChange={(e) => {
                        handleVentaChange(e.target.value);
                        if (errores.id_venta) setErrores(prev => ({ ...prev, id_venta: "" }));
                      }}
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
                      className={`pagosabonos-form-input${errores.monto ? " input-error" : ""}`}
                      placeholder="Ej: 50000"
                      value={form.monto}
                      onChange={(e) => {
                        setForm({ ...form, monto: e.target.value });
                        if (errores.monto) setErrores(prev => ({ ...prev, monto: "" }));
                      }}
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
              <button className="pagosabonos-btn-primary" onClick={guardar} disabled={guardando || !form.id_venta || !form.monto}>
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
                  <DetalleItem label="Estado" value={<span className={`tabla-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>} />
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