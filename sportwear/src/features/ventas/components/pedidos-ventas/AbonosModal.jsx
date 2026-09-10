import { useEffect } from "react";
import { IconDollar, IconX } from "../../../../shared/components/Icons";
import Select from "../../../../shared/components/Select";
import { fmt, HOY_ISO, getEstadoAbonoBadge } from "../../utils/pedidosVentasHelpers";

export default function AbonosModal({
  abonosModal, setAbonosModal, tienePerm,
  formAbono, setFormAbono, erroresAbono, setErroresAbono,
  metodosPago, guardandoAbono, agregarAbono,
}) {
  // ── CORREGIDO: el método siempre arrancaba en "Efectivo" a secas, sin
  // importar con qué método se registró la venta — así que confirmar un
  // pago de una venta por Transferencia mostraba "Efectivo" preseleccionado,
  // como si el dinero hubiera llegado por otro medio. Ahora arranca en el
  // método real de la venta; sigue siendo editable por si el pago de verdad
  // llegó por un canal distinto al planeado. ──
  useEffect(() => {
    if (abonosModal) {
      setFormAbono({ monto: "", metodo: abonosModal.metodo_pago || "Efectivo", fecha: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abonosModal?.id_venta]);

  if (!abonosModal) return null;

  const puedeRegistrar = tienePerm('Ventas.crear') && abonosModal.estado !== "Pagado" && abonosModal.estado !== "Anulado";

  return (
    <div className="pedidosventas-modal-overlay">
      <div className="pedidosventas-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pedidosventas-modal-header">
          <h2 className="pedidosventas-modal-title">
            {abonosModal.tipo_pago === "cuotas" ? "Gestionar Abonos" : "Gestionar Pago"}
          </h2>
          <button className="pedidosventas-modal-close" onClick={() => setAbonosModal(null)}><IconX /></button>
        </div>
        <div className="pedidosventas-modal-body">
          <div className="pedidosventas-abonos-summary">
            <div className="pedidosventas-abonos-summary-item">
              <span className="pedidosventas-abonos-summary-label">Total</span>
              <span className="pedidosventas-abonos-summary-value">{fmt(abonosModal.total)}</span>
            </div>
            <div className="pedidosventas-abonos-summary-item">
              <span className="pedidosventas-abonos-summary-label">{abonosModal.tipo_pago === "cuotas" ? "Abonado" : "Pagado"}</span>
              <span className="pedidosventas-abonos-summary-value">{fmt(abonosModal.total_pagado || 0)}</span>
            </div>
            <div className="pedidosventas-abonos-summary-item">
              <span className="pedidosventas-abonos-summary-label">Saldo</span>
              <span className="pedidosventas-abonos-summary-value pedidosventas-abonos-summary-saldo">{fmt(abonosModal.total - (abonosModal.total_pagado || 0))}</span>
            </div>
          </div>

          {abonosModal.abonos?.length > 0 && (
            <div className="pedidosventas-abonos-list">
              <h4 className="pedidosventas-abonos-list-title">
                {abonosModal.tipo_pago === "cuotas" ? "Historial de Abonos" : "Historial de Pagos"}
              </h4>
              {abonosModal.abonos.map((a, idx) => (
                <div key={idx} className={`pedidosventas-abono-item pedidosventas-abono-item--${a.estado === "Confirmado" ? "confirmado" : a.estado === "Anulado" ? "anulado" : "pendiente"}`}>
                  <div className="pedidosventas-abono-item-info">
                    <span className="pedidosventas-abono-item-monto">{fmt(a.monto)}</span>
                    <span className="pedidosventas-abono-item-fecha">{a.fecha?.toString().split("T")[0]}</span>
                  </div>
                  <span className={`pedidosventas-badge ${getEstadoAbonoBadge(a.estado)}`}>{a.estado}</span>
                </div>
              ))}
            </div>
          )}

          {puedeRegistrar && (
            <div className="pedidosventas-form-section">
              <h4 className="pedidosventas-form-section-title">
                {abonosModal.tipo_pago === "cuotas" ? "Nuevo Abono" : "Registrar pago"}
              </h4>
              <div className="pedidosventas-form-row">
                {abonosModal.tipo_pago === "cuotas" ? (
                  <div className="pedidosventas-form-group">
                    <label className="pedidosventas-form-label">Monto (COP)</label>
                    <input
                      type="number"
                      className={`pedidosventas-form-input${erroresAbono.monto ? " input-error" : ""}`}
                      placeholder={`Máx: ${fmt(abonosModal.total - (abonosModal.total_pagado || 0))}`}
                      value={formAbono.monto}
                      onChange={(e) => {
                        setFormAbono({ ...formAbono, monto: e.target.value });
                        if (erroresAbono.monto) setErroresAbono(prev => ({ ...prev, monto: "" }));
                      }}
                    />
                    {erroresAbono.monto && <span className="pedidosventas-field-error">{erroresAbono.monto}</span>}
                  </div>
                ) : (
                  <div className="pedidosventas-form-group">
                    <label className="pedidosventas-form-label">Monto a cobrar</label>
                    <div className="pedidosventas-monto-fijo">
                      {fmt(abonosModal.total - (abonosModal.total_pagado || 0))}
                    </div>
                  </div>
                )}
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Método</label>
                  <Select
                    className="pedidosventas-form-select"
                    value={formAbono.metodo}
                    onChange={(e) => setFormAbono({ ...formAbono, metodo: e.target.value })}
                  >
                    {metodosPago.map((m) => (
                      <option key={m.id_metodo} value={m.nombre}>{m.nombre}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="pedidosventas-form-row">
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Fecha</label>
                  <input
                    type="date"
                    max={HOY_ISO}
                    className={`pedidosventas-form-input${erroresAbono.fecha ? " input-error" : ""}`}
                    value={formAbono.fecha}
                    onChange={(e) => {
                      setFormAbono({ ...formAbono, fecha: e.target.value });
                      if (erroresAbono.fecha) setErroresAbono(prev => ({ ...prev, fecha: "" }));
                    }}
                  />
                  {erroresAbono.fecha && <span className="pedidosventas-field-error">{erroresAbono.fecha}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="pedidosventas-modal-footer">
          <button className="pedidosventas-btn-secondary" onClick={() => setAbonosModal(null)} disabled={guardandoAbono}>Cerrar</button>
          {puedeRegistrar && (
            <button className="pedidosventas-btn-primary" onClick={agregarAbono} disabled={guardandoAbono}>
              <IconDollar /> {guardandoAbono ? "Guardando..." : (abonosModal.tipo_pago === "cuotas" ? "Registrar Abono" : "Registrar Pago")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
