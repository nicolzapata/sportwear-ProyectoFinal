import { MAX_MONTO } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";

export default function NuevoPagoModal({
  cerrarModal, ventas, form, setForm, errores, setErrores,
  handleVentaChange, errorMonto, metodosPago, guardando, guardar,
}) {
  return (
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
  );
}
