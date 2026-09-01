import { IconX, IconBox } from "../../../../shared/components/Icons";
import Select from "../../../../shared/components/Select";
import { fmt } from "../../utils/pedidosVentasHelpers";

// ── NUEVO: editar un pedido — conectado a Ventas (edita la misma venta).
// Solo pedidos "Pendiente" o "En preparación" pueden editarse. Los
// productos ya existentes quedan intocables (ni cantidad ni precio ni se
// pueden quitar) — la edición solo puede AGREGAR productos nuevos, nunca
// reducir lo ya vendido, así el costo total nunca puede bajar. ──
export default function EditarPedidoModal({
  pedido, onClose,
  form, setForm, errores, setErrores,
  productos, metodosPago, cargandoDatos,
  nuevasLineas, agregarLinea, quitarLinea, actualizarLinea,
  totalActual, totalNuevo, guardando, onGuardar,
}) {
  if (!pedido) return null;

  return (
    <div className="pedidos-modal-overlay" onClick={() => !guardando && onClose()}>
      <div className="pedidos-modal pedidos-modal-factura" style={{ maxWidth: 900, width: "95%" }} onClick={(e) => e.stopPropagation()}>
        <div className="pedidos-modal-header">
          <div>
            <h2 className="pedidos-modal-title">Editar pedido P-{String(pedido.id_pedido).padStart(3, "0")}</h2>
            <p className="pedidos-modal-subtitulo">Los productos ya registrados no se pueden modificar ni quitar — solo agregar nuevos.</p>
          </div>
          <button className="pedidos-modal-close" onClick={onClose} disabled={guardando}><IconX /></button>
        </div>

        <div className="pedidos-modal-body pedidos-factura-body">
          {cargandoDatos ? (
            <p style={{ color: "var(--dvna-muted)" }}>Cargando datos del pedido...</p>
          ) : (
            <>
              <div className="pedidosventas-form-row">
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Dirección de entrega</label>
                  <input
                    type="text"
                    className={`pedidosventas-form-input${errores.direccion_entrega ? " input-error" : ""}`}
                    value={form.direccion_entrega}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, direccion_entrega: e.target.value }));
                      if (errores.direccion_entrega) setErrores((prev) => ({ ...prev, direccion_entrega: e.target.value.trim() ? "" : prev.direccion_entrega }));
                    }}
                  />
                  {errores.direccion_entrega && <span className="pedidosventas-field-error">{errores.direccion_entrega}</span>}
                </div>
                <div className="pedidosventas-form-group">
                  <label className="pedidosventas-form-label">Método de pago</label>
                  <Select
                    className="pedidosventas-form-select"
                    value={form.metodo_pago || ""}
                    onChange={(e) => setForm((f) => ({ ...f, metodo_pago: e.target.value }))}
                  >
                    {metodosPago.map((m) => (
                      <option key={m.id_metodo} value={m.nombre}>{m.nombre}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Observaciones</label>
                <textarea
                  className="pedidosventas-form-input"
                  rows={2}
                  value={form.observaciones || ""}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                />
              </div>

              <div className="pedidos-factura-seccion">
                <h3 className="pedidos-factura-titulo">Productos ya registrados (no editables)</h3>
                {(pedido.items || []).map((item, i) => (
                  <div key={i} className="pedidos-detalle-producto-row">
                    <div className="pedidos-detalle-producto-thumb">
                      {item.producto_imagen ? <img src={item.producto_imagen} alt={item.producto} /> : <IconBox />}
                    </div>
                    <div className="pedidos-detalle-producto-info">
                      <span className="pedidos-detalle-producto-nombre">{item.producto}</span>
                      <div className="pedidos-detalle-producto-tags">
                        {item.talla && <span className="pedidos-detalle-tag">Talla: {item.talla}</span>}
                        {item.color_nombre && <span className="pedidos-detalle-tag">{item.color_nombre}</span>}
                      </div>
                    </div>
                    <span className="pedidos-detalle-producto-cant">Cant: {item.cantidad}</span>
                  </div>
                ))}
              </div>

              <div className="pedidosventas-items-section">
                <div className="pedidosventas-items-header">
                  <label className="pedidosventas-form-label">Agregar productos nuevos</label>
                  <button type="button" className="pedidosventas-btn-add-item" onClick={agregarLinea}>+ Agregar producto</button>
                </div>

                {nuevasLineas.length > 0 && (
                  <div className="pedidosventas-item-titulos">
                    <span>Producto</span>
                    <span>Talla / Color</span>
                    <span>Cantidad</span>
                    <span>Precio unitario</span>
                    <span>Subtotal</span>
                    <span></span>
                  </div>
                )}

                {nuevasLineas.map((linea, i) => {
                  const productoSel = productos.find((p) => String(p.id_producto) === String(linea.id_producto));
                  const variantesActivas = (productoSel?.variantes || []).filter((v) => v.estado === "Activo");
                  const cant = Number(linea.cantidad) || 0;
                  const precio = Number(linea.precio_unitario) || 0;
                  return (
                    <div key={i} className="pedidosventas-item-row">
                      <div>
                        <Select
                          className={`pedidosventas-form-select${errores[`linea_${i}_producto`] ? " input-error" : ""}`}
                          value={linea.id_producto}
                          onChange={(e) => actualizarLinea(i, "id_producto", e.target.value)}
                        >
                          <option value="">Producto...</option>
                          {productos.map((p) => {
                            const stockProducto = Number(p.stock ?? 0);
                            return (
                              <option key={p.id_producto} value={p.id_producto} disabled={stockProducto === 0}>
                                {p.nombre}{stockProducto === 0 ? " — Sin stock" : ""}
                              </option>
                            );
                          })}
                        </Select>
                        {errores[`linea_${i}_producto`] && <span className="pedidosventas-field-error">{errores[`linea_${i}_producto`]}</span>}
                      </div>
                      <div>
                        <Select
                          className={`pedidosventas-form-select${errores[`linea_${i}_variante`] ? " input-error" : ""}`}
                          value={linea.id_variante}
                          onChange={(e) => actualizarLinea(i, "id_variante", e.target.value)}
                          disabled={!linea.id_producto || variantesActivas.length === 0}
                        >
                          <option value="">
                            {!linea.id_producto ? "Elige un producto" : variantesActivas.length === 0 ? "Sin variantes" : "Talla / color..."}
                          </option>
                          {variantesActivas.map((v) => (
                            <option key={v.id_variante} value={v.id_variante} disabled={Number(v.stock) === 0}>
                              {v.talla} · {v.color_nombre} {Number(v.stock) === 0 ? "— Agotado" : `(stock: ${v.stock})`}
                            </option>
                          ))}
                        </Select>
                        {errores[`linea_${i}_variante`] && <span className="pedidosventas-field-error">{errores[`linea_${i}_variante`]}</span>}
                      </div>
                      <div>
                        <input
                          type="number" min="1" step={1}
                          className={`pedidosventas-form-input${errores[`linea_${i}_cantidad`] ? " input-error" : ""}`}
                          value={linea.cantidad}
                          onChange={(e) => actualizarLinea(i, "cantidad", e.target.value)}
                        />
                        {errores[`linea_${i}_cantidad`] && <span className="pedidosventas-field-error">{errores[`linea_${i}_cantidad`]}</span>}
                      </div>
                      <div>
                        <input
                          type="number" min="0"
                          className="pedidosventas-form-input"
                          value={linea.precio_unitario}
                          onChange={(e) => actualizarLinea(i, "precio_unitario", e.target.value)}
                        />
                      </div>
                      <div className="pedidosventas-item-subtotal">{fmt(cant * precio)}</div>
                      <button type="button" className="pedidosventas-item-remove" onClick={() => quitarLinea(i)} title="Quitar producto agregado">
                        <IconX />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pedidosventas-total-resumen">
                <span>Total actual: {fmt(totalActual)}</span>
                <span className="pedidosventas-total-final">Nuevo total: {fmt(totalNuevo)}</span>
              </div>
            </>
          )}
        </div>
        <div className="pedidos-modal-footer">
          <button className="pedidos-btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button className="pedidosventas-btn-primary" onClick={onGuardar} disabled={guardando || cargandoDatos}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
