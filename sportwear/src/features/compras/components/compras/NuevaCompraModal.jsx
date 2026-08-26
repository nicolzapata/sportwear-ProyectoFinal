import { MAX_MONTO, MAX_LONGITUD_CODIGO, MAX_LONGITUD_TEXTO_LIBRE } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";
import CompraItemRow from "./CompraItemRow";
import { fmt, HOY_ISO, errorFecha, errorDescuentoGeneral } from "../../utils/comprasHelpers";

export default function NuevaCompraModal({
  modal, setModal, guardando, guardar,
  form, setForm, errores, setErrores,
  proveedores, productos,
  actualizarItem, agregarItem, quitarItem, toggleMismoPrecio,
  subtotal, totalCompra,
}) {
  if (!modal) return null;

  return (
    <div className="compras-modal-overlay" onClick={() => !guardando && setModal(false)}>
      <div className="compras-modal compras-modal-nueva" onClick={(e) => e.stopPropagation()}>
        <div className="compras-modal-header">
          <h2 className="compras-modal-title">Nueva compra</h2>
          <button className="compras-modal-close" onClick={() => setModal(false)}><IconX /></button>
        </div>
        <div className="compras-modal-body">
          <div className="compras-form-row">
            <div className="compras-form-group">
              <label className="compras-form-label">Proveedor</label>
              <select
                className={`compras-form-select${errores.id_proveedor ? " input-error" : ""}`}
                value={form.id_proveedor}
                onChange={(e) => {
                  const valor = e.target.value;
                  setForm({ ...form, id_proveedor: valor });
                  if (errores.id_proveedor) setErrores((prev) => ({ ...prev, id_proveedor: valor ? "" : prev.id_proveedor }));
                }}
                onBlur={() => setErrores((prev) => ({ ...prev, id_proveedor: form.id_proveedor ? "" : "El proveedor es obligatorio" }))}
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.filter((p) => p.estado === "Activo").map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.nombre_comercial || p.razon_social}
                  </option>
                ))}
              </select>
              {errores.id_proveedor && <span className="compras-field-error">{errores.id_proveedor}</span>}
              {proveedores.length === 0 && (
                <span className="compras-field-hint">
                  No hay proveedores disponibles. Verifica que tu rol tenga el permiso "Proveedores.ver".
                </span>
              )}
            </div>
            <div className="compras-form-group">
              <label className="compras-form-label">N° de orden (opcional)</label>
              <input
                type="text"
                maxLength={MAX_LONGITUD_CODIGO}
                className="compras-form-input"
                value={form.numero_orden}
                onChange={(e) => setForm({ ...form, numero_orden: e.target.value })}
              />
            </div>
          </div>

          <div className="compras-form-row">
            <div className="compras-form-group">
              <label className="compras-form-label">Fecha</label>
              <input
                type="date"
                max={HOY_ISO}
                className={`compras-form-input${errores.fecha ? " input-error" : ""}`}
                value={form.fecha}
                onChange={(e) => {
                  const valor = e.target.value;
                  setForm({ ...form, fecha: valor });
                  if (errores.fecha) setErrores((prev) => ({ ...prev, fecha: errorFecha(valor) }));
                }}
                onBlur={() => setErrores((prev) => ({ ...prev, fecha: errorFecha(form.fecha) }))}
              />
              {errores.fecha && <span className="compras-field-error">{errores.fecha}</span>}
            </div>
            <div className="compras-form-group">
              <label className="compras-form-label">Estado</label>
              <select className="compras-form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                <option value="Pendiente">Pendiente</option>
                <option value="En Tránsito">En Tránsito</option>
                <option value="Recibido">Recibido</option>
              </select>
            </div>
          </div>

          <div className="compras-items-section">
            <div className="compras-items-header">
              <label className="compras-form-label">Productos de la compra</label>
              <div className="compras-items-header-right">
                {/* ── NUEVO: interruptor "mismo precio de venta" — al
                    activarlo, escribir el valor de venta en una línea lo
                    replica a las demás líneas del mismo producto (otra
                    talla/color), nunca a un producto distinto. ── */}
                <label className="compras-toggle-mismo-precio" title="Al escribir el valor de venta de una talla/color, se copia automáticamente a las demás variantes del mismo producto en esta compra.">
                  <input
                    type="checkbox"
                    checked={form.mismoPrecioVenta}
                    onChange={toggleMismoPrecio}
                  />
                  Mismo valor de venta para variantes del mismo producto
                </label>
                <button type="button" className="compras-btn-add-item" onClick={agregarItem}>+ Agregar producto</button>
              </div>
            </div>

            <div className="compras-item-titulos">
              <span>Producto</span>
              <span>Talla / Color</span>
              <span>Cantidad</span>
              <span>Precio de costo</span>
              <span title="Precio al que se va a vender esta unidad en el catálogo">
                Valor de venta <span className="compras-item-titulo-ayuda">ⓘ</span>
              </span>
              <span className="compras-item-titulos-subtotal">Subtotal</span>
              <span></span>
            </div>

            {form.items.map((item, i) => (
              <CompraItemRow
                key={i}
                item={item} index={i} productos={productos}
                errores={errores} setErrores={setErrores}
                actualizarItem={actualizarItem} quitarItem={quitarItem}
                itemsLength={form.items.length}
              />
            ))}
          </div>

          <div className="compras-form-row">
            <div className="compras-form-group">
              <label className="compras-form-label">Descuento general (COP)</label>
              <input
                type="number"
                min="0"
                max={MAX_MONTO}
                className={`compras-form-input${errores.descuento ? " input-error" : ""}`}
                value={form.descuento}
                onChange={(e) => {
                  const valor = e.target.value;
                  setForm({ ...form, descuento: valor });
                  if (errores.descuento) setErrores((prev) => ({ ...prev, descuento: errorDescuentoGeneral(valor, subtotal) }));
                }}
                onBlur={() => setErrores((prev) => ({ ...prev, descuento: errorDescuentoGeneral(form.descuento, subtotal) }))}
              />
              {errores.descuento && <span className="compras-field-error">{errores.descuento}</span>}
            </div>
          </div>

          <div className="compras-form-group">
            <label className="compras-form-label">Observaciones (opcional)</label>
            <textarea
              className="compras-form-input compras-form-textarea"
              rows={2}
              maxLength={MAX_LONGITUD_TEXTO_LIBRE}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>

          <div className="compras-total-resumen">
            <span>Subtotal: {fmt(subtotal)}</span>
            <span className="compras-total-final">Total: {fmt(totalCompra)}</span>
          </div>
        </div>
        <div className="compras-modal-footer">
          <button className="compras-btn-secondary" onClick={() => setModal(false)} disabled={guardando}>Cancelar</button>
          <button className="compras-btn-primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Registrar compra"}
          </button>
        </div>
      </div>
    </div>
  );
}
