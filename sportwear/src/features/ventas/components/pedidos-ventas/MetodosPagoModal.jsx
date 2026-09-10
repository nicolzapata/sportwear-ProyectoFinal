import { MAX_LONGITUD_NOMBRE } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";

// ── Ported desde el antiguo módulo Pagos (ya eliminado) — la gestión de
// métodos de pago (Efectivo/Tarjeta/Transferencia/etc.) vive ahora dentro de
// Ventas, detrás del botón de engranaje en la barra de acciones. ──
export default function MetodosPagoModal({
  setModalMetodos, nuevoMetodo, setNuevoMetodo, crearMetodo, metodosPagoTodos, toggleMetodoEstado,
}) {
  return (
    <div className="pedidosventas-modal-overlay" onClick={() => setModalMetodos(false)}>
      <div className="pedidosventas-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pedidosventas-modal-header">
          <h2 className="pedidosventas-modal-title">Métodos de pago</h2>
          <button className="pedidosventas-modal-close" onClick={() => setModalMetodos(false)}><IconX /></button>
        </div>
        <div className="pedidosventas-modal-body">
          <div className="pedidosventas-form-row">
            <div className="pedidosventas-form-group" style={{ flex: 1 }}>
              <label className="pedidosventas-form-label">Nuevo método</label>
              <input
                className="pedidosventas-form-input"
                placeholder="Ej: Nequi"
                maxLength={MAX_LONGITUD_NOMBRE}
                value={nuevoMetodo}
                onChange={(e) => setNuevoMetodo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") crearMetodo(); }}
              />
            </div>
            <button className="pedidosventas-btn-primary" style={{ alignSelf: "flex-end", marginBottom: 2 }} onClick={crearMetodo}>
              Agregar
            </button>
          </div>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {metodosPagoTodos.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No hay métodos de pago registrados.</p>
            )}
            {metodosPagoTodos.map((m) => (
              <div key={m.id_metodo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8 }}>
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
        <div className="pedidosventas-modal-footer">
          <button className="pedidosventas-btn-secondary" onClick={() => setModalMetodos(false)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
