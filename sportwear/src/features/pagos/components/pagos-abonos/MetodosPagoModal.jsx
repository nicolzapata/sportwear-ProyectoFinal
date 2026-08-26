import { MAX_LONGITUD_NOMBRE } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";

export default function MetodosPagoModal({
  setModalMetodos, nuevoMetodo, setNuevoMetodo, crearMetodo, metodosPago, toggleMetodoEstado,
}) {
  return (
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
  );
}
