// src/pages/pagos/PagosAbonos.jsx
import { useState, useEffect } from "react";
import './PagosAbonos.css';
import api from "../../services/api";
import { IconCheck, IconCreditCard, IconEye, IconSearch, IconX } from "../../components/Icons";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0
});

// VIP → Abono | resto → Pago completo
const tipoByCliente = (tipo_cliente) =>
  tipo_cliente === "VIP" ? "Abono" : "Pago completo";

export default function PagosAbonos() {
  const [datos,     setDatos]     = useState([]);
  const [ventas,    setVentas]    = useState([]);
  const [cargando,  setCargando]  = useState(true);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [busqueda,  setBusqueda]  = useState("");
  const [modal,     setModal]     = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    id_venta: "", monto: "", tipo: "Pago completo",
    metodo: "Efectivo", estado: "Pendiente", fecha: ""
  });

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg("");
    try {
      const [pagosRes, ventasRes] = await Promise.all([
        api.get("/pagos"),
        api.get("/ventas"),
      ]);
      setDatos(pagosRes.data);
      setVentas(ventasRes.data);
    } catch (err) {
      console.error("Error cargando pagos:", err);
      setErrorMsg("No se pudieron cargar los pagos. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  // ── Al elegir venta, tipo se asigna automáticamente ───────────────────────
  const handleVentaChange = (id_venta) => {
    const venta = ventas.find(v => String(v.id_venta) === String(id_venta));
    const tipo = venta ? tipoByCliente(venta.tipo_cliente) : "Pago completo";
    setForm(f => ({ ...f, id_venta, tipo }));
  };

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtrados = datos.filter(p =>
    p.cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
    String(p.id_pago).includes(busqueda)
  );

  // ── Guardar nuevo pago ─────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.id_venta || !form.monto) return;
    setGuardando(true);
    try {
      const { data: nuevo } = await api.post("/pagos", {
        id_venta:  Number(form.id_venta),
        monto:     Number(form.monto),
        tipo:      form.tipo,
        metodo:    form.metodo,
        estado:    form.estado,
        fecha:     form.fecha || new Date().toISOString().split("T")[0],
      });

      // El endpoint devuelve el pago sin JOIN, así que enriquecemos con la venta
      const venta = ventas.find(v => v.id_venta === Number(form.id_venta));
      setDatos(prev => [{
        ...nuevo,
        cliente:     venta?.cliente    ?? "—",
        tipo_cliente: venta?.tipo_cliente ?? "—",
      }, ...prev]);

      setModal(false);
    } catch (err) {
      console.error("Error guardando pago:", err);
      alert(err.response?.data?.message ?? "Error al registrar el pago.");
    } finally {
      setGuardando(false);
    }
  };

  // ── Confirmar pago ─────────────────────────────────────────────────────────
  const confirmar = async (id) => {
    try {
      await api.patch(`/pagos/${id}/estado`, { estado: "Confirmado" });
      setDatos(prev =>
        prev.map(p => p.id_pago === id ? { ...p, estado: "Confirmado" } : p)
      );
    } catch (err) {
      console.error("Error confirmando pago:", err);
      alert(err.response?.data?.message ?? "Error al confirmar el pago.");
    }
  };

  // ── Helpers de UI ──────────────────────────────────────────────────────────
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
      case "Confirmado": return "pagosabonos-badge-active";
      case "Pendiente":  return "pagosabonos-badge-pending";
      case "Anulado":    return "pagosabonos-badge-inactive";
      default:           return "pagosabonos-badge-info";
    }
  };

  // ── Estados de carga y error ───────────────────────────────────────────────
  if (cargando) return (
    <div style={{ padding: 48, color: "var(--muted)" }}>Cargando pagos...</div>
  );

  if (errorMsg) return (
    <div style={{ padding: 32, color: "var(--danger)" }}>
      {errorMsg}
      <button onClick={cargar} style={{ marginLeft: 12 }}>Reintentar</button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pagosabonos-container">

      {/* Barra de acciones */}
      <div className="pagosabonos-actions-bar">
        <div className="pagosabonos-search-wrapper">
          <span className="pagosabonos-search-icon"><IconSearch /></span>
          <input
            type="text"
            className="pagosabonos-search-input"
            placeholder="Buscar por cliente o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="pagosabonos-search-clear" onClick={() => setBusqueda("")}>
              <IconX />
            </button>
          )}
        </div>
        <button
          className="pagosabonos-btn-primary"
          onClick={() => {
            setForm({
              id_venta: "", monto: "", tipo: "Pago completo",
              metodo: "Efectivo", estado: "Pendiente", fecha: ""
            });
            setModal(true);
          }}
        >
          <span>+</span> Nuevo pago
        </button>
      </div>

      {/* Contador */}
      <div className="pagosabonos-results-count">
        {filtrados.length} pago{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
      </div>

      {/* Tabla */}
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
            {filtrados.map((p) => (
              <tr key={p.id_pago} className="tbl-row">
                <td className="tbl-td">
                  <span className="pagosabonos-venta-badge">
                    V-{String(p.id_venta).padStart(3, "0")}
                  </span>
                </td>
                <td className="tbl-td">
                  <div className="pagosabonos-cliente-cell">
                    <div className="pagosabonos-cliente-avatar">
                      {p.cliente?.[0]?.toUpperCase() || "C"}
                    </div>
                    <span className="pagosabonos-cliente-name">{p.cliente}</span>
                  </div>
                </td>
                <td className="tbl-td pagosabonos-monto-cell">{fmt(p.monto)}</td>
                <td className="tbl-td pagosabonos-tipo-cell">{p.tipo}</td>
                <td className="tbl-td">
                  <span className="pagosabonos-metodo">
                    <span className="pagosabonos-metodo-icon">{getMetodoIcon(p.metodo)}</span>
                    {p.metodo}
                  </span>
                </td>
                <td className="tbl-td pagosabonos-fecha-cell">
                  {p.fecha?.toString().split("T")[0]}
                </td>
                <td className="tbl-td">
                  <span className={`pagosabonos-badge ${getEstadoBadge(p.estado)}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="tbl-td">
                  <div className="pagosabonos-action-cell">
                    <button
                      className="pagosabonos-action-btn pagosabonos-view-btn"
                      onClick={() => setVerDetalle(p)}
                      title="Ver detalles"
                    >
                      <IconEye />
                    </button>
                    {p.estado === "Pendiente" && (
                      <button
                        className="pagosabonos-action-btn pagosabonos-confirm-btn"
                        onClick={() => confirmar(p.id_pago)}
                        title="Confirmar pago"
                      >
                        <IconCheck />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  No hay pagos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal registro */}
      {modal && (
        <div className="pagosabonos-modal-overlay" onClick={() => setModal(false)}>
          <div className="pagosabonos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pagosabonos-modal-header">
              <h2 className="pagosabonos-modal-title">Registrar pago o abono</h2>
              <button className="pagosabonos-modal-close" onClick={() => setModal(false)}>
                <IconX />
              </button>
            </div>

            <div className="pagosabonos-modal-body">
              <div className="pagosabonos-form-row">
                <div className="pagosabonos-form-group">
                  <label className="pagosabonos-form-label">Venta asociada</label>
                  <select
                    className="pagosabonos-form-select"
                    value={form.id_venta}
                    onChange={(e) => handleVentaChange(e.target.value)}
                  >
                    <option value="">Seleccionar venta...</option>
                    {ventas.map(v => (
                      <option key={v.id_venta} value={v.id_venta}>
                        V-{String(v.id_venta).padStart(3, "0")} — {v.cliente} ({v.tipo_cliente})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pagosabonos-form-group">
                  <label className="pagosabonos-form-label">Monto (COP)</label>
                  <input
                    type="number"
                    className="pagosabonos-form-input"
                    placeholder="Ej: 50000"
                    value={form.monto}
                    onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  />
                </div>
              </div>

              <div className="pagosabonos-form-row">
                <div className="pagosabonos-form-group">
                  <label className="pagosabonos-form-label">
                    Tipo <small style={{ color: "#888" }}>(auto según cliente)</small>
                  </label>
                  <input
                    className="pagosabonos-form-input"
                    value={form.tipo}
                    readOnly
                    style={{ background: "var(--input-disabled-bg, #f3f4f6)", cursor: "not-allowed" }}
                    title="VIP → Abono | Otros → Pago completo"
                  />
                </div>

                <div className="pagosabonos-form-group">
                  <label className="pagosabonos-form-label">Método</label>
                  <select
                    className="pagosabonos-form-select"
                    value={form.metodo}
                    onChange={(e) => setForm({ ...form, metodo: e.target.value })}
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>
              </div>

              <div className="pagosabonos-form-row">
                <div className="pagosabonos-form-group">
                  <label className="pagosabonos-form-label">Fecha</label>
                  <input
                    type="date"
                    className="pagosabonos-form-input"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  />
                </div>

                <div className="pagosabonos-form-group">
                  <label className="pagosabonos-form-label">Estado</label>
                  <select
                    className="pagosabonos-form-select"
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Confirmado">Confirmado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pagosabonos-modal-footer">
              <button
                className="pagosabonos-btn-secondary"
                onClick={() => setModal(false)}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                className="pagosabonos-btn-primary"
                onClick={guardar}
                disabled={guardando || !form.id_venta || !form.monto}
              >
                {guardando ? "Registrando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {verDetalle && (
        <ModalDetalle
          titulo="Detalle del pago"
          subtitulo={`P-${String(verDetalle.id_pago).padStart(3, "0")}`}
          avatar={<IconCreditCard />}
          badge={
            <span className={`pagosabonos-badge ${getEstadoBadge(verDetalle.estado)}`}>
              {verDetalle.estado}
            </span>
          }
          pasos={["Información", "Pago"]}
          onClose={() => setVerDetalle(null)}
        >
          <DetalleSeccion titulo="Información">
            <DetalleGrid>
              <DetalleItem label="ID"      value={`P-${String(verDetalle.id_pago).padStart(3, "0")}`} />
              <DetalleItem label="Venta"   value={`V-${String(verDetalle.id_venta).padStart(3, "0")}`} />
              <DetalleItem label="Cliente" value={verDetalle.cliente} />
              <DetalleItem label="Tipo"    value={verDetalle.tipo} />
              <DetalleItem label="Método"  value={verDetalle.metodo} />
              <DetalleItem label="Fecha"   value={verDetalle.fecha?.toString().split("T")[0]} />
            </DetalleGrid>
          </DetalleSeccion>
          <DetalleSeccion titulo="Pago">
            <DetalleGrid>
              <DetalleItem label="Monto"  value={fmt(verDetalle.monto)} />
              <DetalleItem label="Estado" value={verDetalle.estado} />
            </DetalleGrid>
          </DetalleSeccion>
        </ModalDetalle>
      )}
    </div>
  );
}