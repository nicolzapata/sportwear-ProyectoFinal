// src/pages/pedidos/PedidosVentas.jsx
import { useState, useEffect } from "react";
import './PedidosVentas.css';
import api from "../../services/api";
import { IconDollar, IconEye, IconPrint, IconSearch, IconX } from "../../components/Icons";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import ModalSteps from "../../components/ModalSteps";

const fmt = (n) => Number(n||0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

const FILAS_POR_PAGINA = 10;

export default function PedidosVentas() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [verDetalle, setVerDetalle] = useState(null);
  const [abonosModal, setAbonosModal] = useState(null);
  const [formAbono, setFormAbono] = useState({ monto: "", metodo: "Efectivo", fecha: "" });

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg("");
    try {
      const [ventasRes, pagosRes] = await Promise.all([
        api.get("/ventas"),
        api.get("/pagos")
      ]);
      
      const ventas = ventasRes.data.map(v => {
        const abonos = pagosRes.data.filter(p => p.id_venta === v.id_venta);
        const totalPagado = abonos.reduce((sum, p) => sum + (p.estado === "Confirmado" ? Number(p.monto) : 0), 0);
        
        let estado;
        if (v.estado === "Anulado") {
          estado = "Anulado";
        } else if (v.tipo_pago === 'cuotas' && v.num_cuotas) {
          const cuotasConfirmadas = abonos.filter(p => p.estado === "Confirmado" && p.num_cuota).length;
          estado = cuotasConfirmadas >= v.num_cuotas ? "Pagado" : "Pendiente";
        } else {
          estado = totalPagado >= v.total ? "Pagado" : "Pendiente";
        }
        
        if (estado === "Pendiente" && v.estado === "Pendiente") return null;
        
        return { ...v, total_pagado: totalPagado, abonos, estado };
      }).filter(Boolean);
      
      setDatos(ventas);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setErrorMsg("Error al cargar los datos");
    } finally {
      setCargando(false);
    }
  };

  const filtrados = datos.filter(v =>
    v.cliente?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPaginas = Math.ceil(filtrados.length / FILAS_POR_PAGINA);
  const filtradosPagina = filtrados.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/ventas/${id}/estado`, { estado });
      setDatos(prev => prev.map(v => v.id_venta === id ? { ...v, estado } : v));
    } catch (err) {
      console.error("Error:", err);
      alert(err.response?.data?.message || "Error al cambiar estado");
    }
  };

  const agregarAbono = async () => {
    if (!formAbono.monto || !abonosModal) return;
    try {
      const { data: nuevo } = await api.post("/pagos", {
        id_venta: abonosModal.id_venta,
        monto: Number(formAbono.monto),
        metodo: formAbono.metodo,
        estado: "Confirmado",
        fecha: formAbono.fecha || new Date().toISOString().split("T")[0]
      });

      setDatos(prev => prev.map(v => {
        if (v.id_venta !== abonosModal.id_venta) return v;
        const nuevoTotal = (v.total_pagado || 0) + Number(formAbono.monto);
        const nuevoEstado = nuevoTotal >= v.total ? "Pagado" : "Pendiente";
        return {
          ...v,
          total_pagado: nuevoTotal,
          estado: nuevoEstado,
          abonos: [...(v.abonos || []), { ...nuevo, monto: Number(formAbono.monto), estado: "Confirmado" }]
        };
      }));

      setAbonosModal(null);
      setFormAbono({ monto: "", metodo: "Efectivo", fecha: "" });
    } catch (err) {
      console.error("Error:", err);
      alert(err.response?.data?.message || "Error al registrar abono");
    }
  };

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case "Pagado": return "pedidosventas-badge-active";
      case "Pendiente": return "pedidosventas-badge-pending";
      case "Anulado": return "pedidosventas-badge-inactive";
      default: return "pedidosventas-badge-info";
    }
  };

  if (cargando) return <div style={{ padding: 48, color: "var(--muted)" }}>Cargando pedidos...</div>;
  if (errorMsg) return <div style={{ padding: 32, color: "var(--danger)" }}>{errorMsg}</div>;

  return (
    <div className="pedidosventas-container">

      <div className="pedidosventas-actions-bar">
        <div className="pedidosventas-search-wrapper">
          <span className="pedidosventas-search-icon"><IconSearch /></span>
          <input
            type="text"
            className="pedidosventas-search-input"
            placeholder="Buscar por cliente o ID..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          />
          {busqueda && (
            <button className="pedidosventas-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}>
              <IconX />
            </button>
          )}
        </div>
      </div>

      <div className="pedidosventas-results-count">
        {filtrados.length} venta{filtrados.length !== 1 ? 's' : ''} encontrada{filtrados.length !== 1 ? 's' : ''}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Cliente</th>
              <th className="tbl-th">Producto</th>
              <th className="tbl-th">Cant.</th>
              <th className="tbl-th">Total</th>
              <th className="tbl-th">Tipo</th>
              <th className="tbl-th">Abonos</th>
              <th className="tbl-th">Saldo</th>
              <th className="tbl-th">Fecha</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtradosPagina.map((v) => (
              <tr key={v.id_venta} className="tbl-row">
                <td className="tbl-td">
                  <span className="pedidosventas-cliente-name">{v.cliente}</span>
                </td>
                <td className="tbl-td pedidosventas-producto-cell">
                  {v.items?.map(i => i.producto).filter(Boolean).join(', ') || '-'}
                </td>
                <td className="tbl-td pedidosventas-cantidad-cell">
                  {v.items?.reduce((sum, i) => sum + i.cantidad, 0) || '-'}
                </td>
                <td className="tbl-td pedidosventas-total-cell">{fmt(v.total)}</td>
                <td className="tbl-td">
                  {v.tipo_pago === 'cuotas' ? (
                    <span className="pedidosventas-badge pedidosventas-badge-info">Cuotas ({v.num_cuotas})</span>
                  ) : (
                    <span className="pedidosventas-badge">Completo</span>
                  )}
                </td>
                <td className="tbl-td">
                  <button
                    className="pedidosventas-abonos-btn"
                    onClick={() => setAbonosModal(v)}
                    title="Ver abonos"
                  >
                    {v.total_pagado ? fmt(v.total_pagado) : "-"}
                  </button>
                </td>
                <td className="tbl-td">
                  <span className={`pedidosventas-saldo ${(v.total - (v.total_pagado || 0)) <= 0 ? 'pedidosventas-saldo-zero' : ''}`}>
                    {fmt(v.total - (v.total_pagado || 0))}
                  </span>
                </td>
                <td className="tbl-td pedidosventas-fecha-cell">{v.fecha?.toString().split("T")[0]}</td>
                <td className="tbl-td">
                  <span className={`pedidosventas-badge ${getEstadoBadge(v.estado)}`}>{v.estado}</span>
                </td>
                <td className="tbl-td">
                  <div className="pedidosventas-action-cell">
                    <button className="pedidosventas-action-btn pedidosventas-view-btn" onClick={() => setVerDetalle(v)} title="Ver detalles"><IconEye /></button>
                    {v.estado !== "Anulado" && v.estado !== "Pagado" && (
                      <button className="pedidosventas-action-btn pedidosventas-pay-btn" onClick={() => setAbonosModal(v)} title="Agregar abono"><IconDollar /></button>
                    )}
                    {v.estado === "Pendiente" && (
                      <button className="pedidosventas-action-btn pedidosventas-pay-full-btn" onClick={() => cambiarEstado(v.id_venta, "Pagado")} title="Marcar como pagado"><IconDollar /></button>
                    )}
                    {v.estado !== "Anulado" && (
                      <button className="pedidosventas-action-btn pedidosventas-cancel-btn" onClick={() => cambiarEstado(v.id_venta, "Anulado")} title="Anular venta"><IconX /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  No hay ventas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginador */}
        {totalPaginas > 1 && (
          <div className="paginador">
            <button
              className="paginador-btn"
              onClick={() => setPagina(p => Math.max(p - 1, 1))}
              disabled={pagina === 1}
            >
              ‹
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`}
                onClick={() => setPagina(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="paginador-btn"
              onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))}
              disabled={pagina === totalPaginas}
            >
              ›
            </button>
            <span className="paginador-info">
              Página {pagina} de {totalPaginas} · {filtrados.length} registros
            </span>
          </div>
        )}

        <div className="print-button-container">
          <button className="btn-print" onClick={() => window.print()}>
            <IconPrint />
          </button>
        </div>
      </div>

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle de venta"
          subtitulo={`V-${String(verDetalle.id_venta).padStart(3, "0")}`}
          badge={<span className={`pedidosventas-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>}
          pasos={["Información", "Pago"]}
          onClose={() => setVerDetalle(null)}
        >
          <DetalleSeccion titulo="Información">
            <DetalleGrid>
              <DetalleItem label="ID" value={`V-${String(verDetalle.id_venta).padStart(3, "0")}`} />
              <DetalleItem label="Cliente" value={verDetalle.cliente} />
              <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
              <DetalleItem label="Tipo pago" value={verDetalle.tipo_pago === 'cuotas' ? `Cuotas (${verDetalle.num_cuotas})` : 'Completo'} />
            </DetalleGrid>
          </DetalleSeccion>
          <DetalleSeccion titulo="Productos">
            <DetalleGrid>
              {verDetalle.items?.map((item, idx) => (
                <DetalleItem
                  key={idx}
                  label={`${item.producto} (Talla: ${item.talla || '-'})`}
                  value={`Cant: ${item.cantidad} - ${fmt(item.subtotal)}`}
                />
              ))}
            </DetalleGrid>
          </DetalleSeccion>
          <DetalleSeccion titulo="Pago">
            <DetalleGrid>
              <DetalleItem label="Total" value={fmt(verDetalle.total)} />
              <DetalleItem label="Abonado" value={fmt(verDetalle.total_pagado || 0)} />
              <DetalleItem label="Saldo" value={fmt(verDetalle.total - (verDetalle.total_pagado || 0))} />
              <DetalleItem label="Estado" value={verDetalle.estado} />
            </DetalleGrid>
          </DetalleSeccion>
          {(verDetalle.abonos && verDetalle.abonos.length > 0) && (
            <DetalleSeccion titulo="Historial de Abonos">
              <DetalleGrid>
                {verDetalle.abonos.map((a, idx) => (
                  <DetalleItem
                    key={idx}
                    label={a.num_cuota ? `Cuota ${a.num_cuota}` : `Abono ${idx + 1}`}
                    value={`${fmt(a.monto)} - ${a.estado}`}
                  />
                ))}
              </DetalleGrid>
            </DetalleSeccion>
          )}
        </ModalDetalle>
      )}

      {abonosModal && (
        <div className="pedidosventas-modal-overlay" onClick={() => setAbonosModal(null)}>
          <div className="pedidosventas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pedidosventas-modal-header">
              <h2 className="pedidosventas-modal-title">Gestionar Abonos</h2>
              <button className="pedidosventas-modal-close" onClick={() => setAbonosModal(null)}><IconX /></button>
            </div>
            <div className="pedidosventas-modal-body">
              <div className="pedidosventas-abonos-summary">
                <div className="pedidosventas-abonos-summary-item">
                  <span className="pedidosventas-abonos-summary-label">Total</span>
                  <span className="pedidosventas-abonos-summary-value">{fmt(abonosModal.total)}</span>
                </div>
                <div className="pedidosventas-abonos-summary-item">
                  <span className="pedidosventas-abonos-summary-label">Abonado</span>
                  <span className="pedidosventas-abonos-summary-value">{fmt(abonosModal.total_pagado || 0)}</span>
                </div>
                <div className="pedidosventas-abonos-summary-item">
                  <span className="pedidosventas-abonos-summary-label">Saldo</span>
                  <span className="pedidosventas-abonos-summary-value pedidosventas-abonos-summary-saldo">
                    {fmt(abonosModal.total - (abonosModal.total_pagado || 0))}
                  </span>
                </div>
              </div>

              {abonosModal.abonos && abonosModal.abonos.length > 0 && (
                <div className="pedidosventas-abonos-list">
                  <h4 className="pedidosventas-abonos-list-title">Historial de Abonos</h4>
                  {abonosModal.abonos.map((a, idx) => (
                    <div key={idx} className="pedidosventas-abono-item">
                      <div className="pedidosventas-abono-item-info">
                        <span className="pedidosventas-abono-item-monto">{fmt(a.monto)}</span>
                        <span className="pedidosventas-abono-item-fecha">{a.fecha?.toString().split("T")[0]}</span>
                      </div>
                      <span className="pedidosventas-badge pedidosventas-badge-active">{a.estado}</span>
                    </div>
                  ))}
                </div>
              )}

              {abonosModal.estado !== "Pagado" && abonosModal.estado !== "Anulado" && (
                <div className="pedidosventas-form-section">
                  <h4 className="pedidosventas-form-section-title">Nuevo Abono</h4>
                  <div className="pedidosventas-form-row">
                    <div className="pedidosventas-form-group">
                      <label className="pedidosventas-form-label">Monto (COP)</label>
                      <input
                        type="number"
                        className="pedidosventas-form-input"
                        placeholder={`Máx: ${fmt(abonosModal.total - (abonosModal.total_pagado || 0))}`}
                        value={formAbono.monto}
                        onChange={(e) => setFormAbono({ ...formAbono, monto: e.target.value })}
                      />
                    </div>
                    <div className="pedidosventas-form-group">
                      <label className="pedidosventas-form-label">Método</label>
                      <select
                        className="pedidosventas-form-select"
                        value={formAbono.metodo}
                        onChange={(e) => setFormAbono({ ...formAbono, metodo: e.target.value })}
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                      </select>
                    </div>
                  </div>
                  <div className="pedidosventas-form-row">
                    <div className="pedidosventas-form-group">
                      <label className="pedidosventas-form-label">Fecha</label>
                      <input
                        type="date"
                        className="pedidosventas-form-input"
                        value={formAbono.fecha}
                        onChange={(e) => setFormAbono({ ...formAbono, fecha: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="pedidosventas-modal-footer">
              <button className="pedidosventas-btn-secondary" onClick={() => setAbonosModal(null)}>Cerrar</button>
              {abonosModal.estado !== "Pagado" && abonosModal.estado !== "Anulado" && (
                <button className="pedidosventas-btn-primary" onClick={agregarAbono}>
                  <IconDollar /> Registrar Abono
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}