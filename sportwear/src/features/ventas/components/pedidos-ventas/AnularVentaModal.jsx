import { IconX } from "../../../../shared/components/Icons";

// ── NUEVO: anular una venta ahora exige un motivo — este modal lo pide con
// un textarea obligatorio; solo se manda la petición si el admin escribe algo. ──
export default function AnularVentaModal({ venta, onClose, motivo, setMotivo, guardando, onConfirmar }) {
  if (!venta) return null;

  const puedeConfirmar = motivo.trim().length > 0 && !guardando;

  return (
    <div className="pedidosventas-modal-overlay" onClick={() => !guardando && onClose()}>
      <div className="pedidosventas-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="pedidosventas-modal-header">
          <h2 className="pedidosventas-modal-title">Anular venta V-{String(venta.id_venta).padStart(3, "0")}</h2>
          <button className="pedidosventas-modal-close" onClick={onClose} disabled={guardando}><IconX /></button>
        </div>
        <div className="pedidosventas-modal-body">
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 0 }}>
            Esta acción anulará la venta <b>V-{String(venta.id_venta).padStart(3, "0")}</b>
            {venta.cliente ? <> del cliente <b>{venta.cliente}</b></> : null}. Indica el motivo de la anulación.
          </p>
          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Motivo de la anulación</label>
            <textarea
              className="pedidosventas-form-input"
              rows={3}
              autoFocus
              placeholder="Ej: Cliente canceló el pedido, error en el registro, producto agotado..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
        </div>
        <div className="pedidosventas-modal-footer">
          <button className="pedidosventas-btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button
            className="pedidosventas-btn-primary pedidosventas-estado-item-cancelar"
            onClick={onConfirmar}
            disabled={!puedeConfirmar}
          >
            {guardando ? "Anulando..." : "Anular venta"}
          </button>
        </div>
      </div>
    </div>
  );
}
