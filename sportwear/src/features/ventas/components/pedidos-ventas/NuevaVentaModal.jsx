import { IconX } from "../../../../shared/components/Icons";
import { MAX_MONTO, MAX_LONGITUD_TEXTO_LIBRE, MAX_LONGITUD_DIRECCION } from "../../../../shared/utils/numerico";
import ClienteAutocomplete from "./ClienteAutocomplete";
import VentaItemRow from "./VentaItemRow";
import CuotasCalendario from "../../../checkout/components/checkout/CuotasCalendario";
import "../../../checkout/pages/Checkout.cuotas.css";
import { fmt, HOY_ISO, calcularFechasVencimiento } from "../../utils/pedidosVentasHelpers";

export default function NuevaVentaModal({
  modalVenta, setModalVenta, guardandoVenta, guardarVenta,
  formVenta, setFormVenta, erroresVenta, setErroresVenta,
  clientes, productos, metodosPago,
  busquedaCliente, setBusquedaCliente,
  clienteDropdownAbierto, setClienteDropdownAbierto, clienteInputRef,
  cargandoDatosVenta, errorDatosVenta,
  cargandoCredito, creditoInfo,
  actualizarItemVenta, agregarItemVenta, quitarItemVenta, errorItemStock,
  subtotalVenta, totalVenta, opcionesCuotasVenta,
}) {
  if (!modalVenta) return null;

  const numCuotasSel = Number(formVenta.num_cuotas) || 0;
  const valorCuotaSel = numCuotasSel > 0 ? Math.ceil(totalVenta / numCuotasSel) : 0;
  const fechaBaseCuotas = formVenta.fecha_primera_cuota || formVenta.fecha;
  const fechasCuotasSel = numCuotasSel > 0 && fechaBaseCuotas
    ? calcularFechasVencimiento(fechaBaseCuotas, numCuotasSel, totalVenta)
    : [];

  return (
    <div className="pedidosventas-modal-overlay" onClick={() => !guardandoVenta && setModalVenta(false)}>
      <div className="pedidosventas-modal pedidosventas-modal-factura" style={{ maxWidth: 1100, width: "95%" }} onClick={(e) => e.stopPropagation()}>
        <div className="pedidosventas-modal-header">
          <h2 className="pedidosventas-modal-title">Nueva venta</h2>
          <button className="pedidosventas-modal-close" onClick={() => setModalVenta(false)}><IconX /></button>
        </div>
        <div className="pedidosventas-modal-body">
          <div className="pedidosventas-form-row">
            <ClienteAutocomplete
              clientes={clientes} formVenta={formVenta} setFormVenta={setFormVenta}
              busquedaCliente={busquedaCliente} setBusquedaCliente={setBusquedaCliente}
              clienteDropdownAbierto={clienteDropdownAbierto} setClienteDropdownAbierto={setClienteDropdownAbierto}
              clienteInputRef={clienteInputRef}
              erroresVenta={erroresVenta} setErroresVenta={setErroresVenta}
              cargandoDatosVenta={cargandoDatosVenta} errorDatosVenta={errorDatosVenta}
            />
            <div className="pedidosventas-form-group">
              <label className="pedidosventas-form-label">Fecha</label>
              <input
                type="date"
                max={HOY_ISO}
                className={`pedidosventas-form-input${erroresVenta.fecha ? " input-error" : ""}`}
                value={formVenta.fecha}
                onChange={(e) => { setFormVenta({ ...formVenta, fecha: e.target.value }); setErroresVenta((prev) => ({ ...prev, fecha: "" })); }}
              />
              {erroresVenta.fecha && <span className="pedidosventas-field-error">{erroresVenta.fecha}</span>}
            </div>
          </div>

          <div className="pedidosventas-form-row">
            <div className="pedidosventas-form-group">
              <label className="pedidosventas-form-label">Tipo de pago</label>
              <select
                className="pedidosventas-form-select"
                value={formVenta.tipo_pago}
                onChange={(e) => setFormVenta({ ...formVenta, tipo_pago: e.target.value, num_cuotas: "" })}
              >
                <option value="completo">Pago completo</option>
                <option value="cuotas">Cuotas</option>
              </select>
            </div>
            {formVenta.tipo_pago === "cuotas" && formVenta.id_cliente && (
              <div className="pedidosventas-credito-banner">
                {cargandoCredito ? (
                  <span style={{ color: "var(--muted)" }}>Consultando cupo de crédito...</span>
                ) : creditoInfo?.cupo_credito !== null && creditoInfo?.cupo_credito !== undefined ? (
                  <>
                    <span>Cupo: <b>{fmt(creditoInfo.cupo_credito)}</b></span>
                    <span>Deuda actual: <b>{fmt(creditoInfo.deuda_actual)}</b></span>
                    <span className={totalVenta > (creditoInfo.disponible ?? Infinity) ? "pedidosventas-credito-excedido" : "pedidosventas-credito-ok"}>
                      Disponible: <b>{fmt(creditoInfo.disponible)}</b>
                    </span>
                  </>
                ) : (
                  <span style={{ color: "var(--muted)" }}>Este cliente no tiene cupo de crédito asignado (sin límite).</span>
                )}
              </div>
            )}
            {formVenta.tipo_pago === "cuotas" ? (
              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Número de cuotas</label>
                <select
                  className={`pedidosventas-form-select${erroresVenta.num_cuotas ? " input-error" : ""}`}
                  value={formVenta.num_cuotas}
                  onChange={(e) => {
                    const num_cuotas = e.target.value;
                    setFormVenta((prev) => ({
                      ...prev,
                      num_cuotas,
                      // ── NUEVO: la fecha de la primera cuota se autocompleta con
                      // la fecha de la venta al elegir el número de cuotas — sigue
                      // siendo editable después. ──
                      fecha_primera_cuota: prev.fecha_primera_cuota || prev.fecha,
                    }));
                    setErroresVenta((prev) => ({ ...prev, num_cuotas: "" }));
                  }}
                >
                  <option value="">Selecciona...</option>
                  {(opcionesCuotasVenta || []).map((n) => (
                    <option key={n} value={n}>{n} cuotas de {fmt(Math.ceil(totalVenta / n))}</option>
                  ))}
                </select>
                {erroresVenta.num_cuotas && <span className="pedidosventas-field-error">{erroresVenta.num_cuotas}</span>}
              </div>
            ) : (
              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Estado</label>
                <select className="pedidosventas-form-select" value={formVenta.estado} onChange={(e) => setFormVenta({ ...formVenta, estado: e.target.value })}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Pagado (registrar como ya pagada)</option>
                </select>
              </div>
            )}
          </div>

          <div className="pedidosventas-form-row">
            {/* ── NUEVO: si la venta es a cuotas, no tiene sentido pedir UN
                método de pago general — cada abono ya tiene el suyo propio
                al registrarlo. Solo se pide para pago completo. ── */}
            {formVenta.tipo_pago !== "cuotas" && (
              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Método de pago</label>
                <select className="pedidosventas-form-select" value={formVenta.metodo_pago} onChange={(e) => setFormVenta({ ...formVenta, metodo_pago: e.target.value })}>
                  {metodosPago.map((m) => (
                    <option key={m.id_metodo} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            {formVenta.tipo_pago === "cuotas" && (
              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Estado inicial</label>
                <select className="pedidosventas-form-select" value={formVenta.estado} onChange={(e) => setFormVenta({ ...formVenta, estado: e.target.value })}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagado">Primera cuota confirmada</option>
                </select>
              </div>
            )}
            {/* ── NUEVO: si se confirma la primera cuota de una vez al crear
                la venta, hay que saber CÓMO se pagó esa cuota puntual — las
                demás cuotas futuras ya piden su propio método cada vez que
                se registran desde "Gestionar Abonos", así que esto solo
                aplica a la cuota inicial. ── */}
            {formVenta.tipo_pago === "cuotas" && formVenta.estado === "Pagado" && (
              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Método de pago (cuota inicial)</label>
                <select className="pedidosventas-form-select" value={formVenta.metodo_pago} onChange={(e) => setFormVenta({ ...formVenta, metodo_pago: e.target.value })}>
                  {metodosPago.map((m) => (
                    <option key={m.id_metodo} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── NUEVO: fecha de la primera cuota (misma fila que el
              calendario, no debajo) — se recalcula solo si cambia la fecha
              o el número de cuotas. ── */}
          {formVenta.tipo_pago === "cuotas" && numCuotasSel > 0 && (
            <div className="pedidosventas-form-row pedidosventas-cuotas-row">
              <div className="pedidosventas-form-group">
                <label className="pedidosventas-form-label">Fecha de la primera cuota</label>
                <input
                  type="date"
                  max={HOY_ISO}
                  className="pedidosventas-form-input"
                  value={formVenta.fecha_primera_cuota || formVenta.fecha}
                  onChange={(e) => setFormVenta({ ...formVenta, fecha_primera_cuota: e.target.value })}
                />
              </div>
              <div className="pedidosventas-calendario-cuotas">
                <CuotasCalendario
                  tipoPagoActivo="cuotas" total={totalVenta} numCuotasActivo={numCuotasSel}
                  valorCuota={valorCuotaSel} fechasCuotas={fechasCuotasSel}
                />
              </div>
            </div>
          )}

          <div className="pedidosventas-items-section">
            <div className="pedidosventas-items-header">
              <label className="pedidosventas-form-label">Productos de la venta</label>
              <button type="button" className="pedidosventas-btn-add-item" onClick={agregarItemVenta}>+ Agregar producto</button>
            </div>

            <div className="pedidosventas-item-titulos">
              <span>Producto</span>
              <span>Talla / Color</span>
              <span>Cantidad</span>
              <span>Precio unitario</span>
              <span>Descuento</span>
              <span>Subtotal</span>
              <span></span>
            </div>

            {formVenta.items.map((item, i) => (
              <VentaItemRow
                key={i}
                item={item} index={i} productos={productos}
                erroresVenta={erroresVenta} setErroresVenta={setErroresVenta}
                actualizarItemVenta={actualizarItemVenta} quitarItemVenta={quitarItemVenta}
                errorItemStock={errorItemStock} itemsLength={formVenta.items.length}
              />
            ))}
          </div>

          <div className="pedidosventas-form-row">
            <div className="pedidosventas-form-group">
              <label className="pedidosventas-form-label">Descuento general (COP)</label>
              <input
                type="number"
                min="0"
                max={MAX_MONTO}
                className={`pedidosventas-form-input${erroresVenta.descuento ? " input-error" : ""}`}
                value={formVenta.descuento}
                onChange={(e) => {
                  const descuento = e.target.value;
                  setFormVenta({ ...formVenta, descuento });
                  if (erroresVenta.motivo_descuento && Number(descuento) === 0) {
                    setErroresVenta((prev) => ({ ...prev, motivo_descuento: "" }));
                  }
                  if (erroresVenta.descuento) {
                    const msg = Number(descuento) < 0 ? "No puede ser negativo" : Number(descuento) > subtotalVenta ? "No puede ser mayor al subtotal" : "";
                    setErroresVenta((prev) => ({ ...prev, descuento: msg }));
                  }
                }}
              />
              {erroresVenta.descuento && <span className="pedidosventas-field-error">{erroresVenta.descuento}</span>}
            </div>
            <div className="pedidosventas-form-group">
              <label className="pedidosventas-form-label">Impuesto (COP)</label>
              <input
                type="number"
                min="0"
                max={MAX_MONTO}
                className={`pedidosventas-form-input${erroresVenta.impuesto ? " input-error" : ""}`}
                value={formVenta.impuesto}
                onChange={(e) => {
                  const impuesto = e.target.value;
                  setFormVenta({ ...formVenta, impuesto });
                  if (erroresVenta.impuesto) {
                    const msg = Number(impuesto) < 0 ? "No puede ser negativo" : Number(impuesto) > MAX_MONTO ? `No puede ser mayor a ${MAX_MONTO.toLocaleString("es-CO")}` : "";
                    setErroresVenta((prev) => ({ ...prev, impuesto: msg }));
                  }
                }}
              />
              {erroresVenta.impuesto && <span className="pedidosventas-field-error">{erroresVenta.impuesto}</span>}
            </div>
          </div>

          {Number(formVenta.descuento) > 0 && (
            <div className="pedidosventas-form-group">
              <label className="pedidosventas-form-label">Motivo del descuento</label>
              <input
                type="text"
                maxLength={MAX_LONGITUD_TEXTO_LIBRE}
                placeholder="Ej: Cliente frecuente, producto con detalle menor, promoción..."
                className={`pedidosventas-form-input${erroresVenta.motivo_descuento ? " input-error" : ""}`}
                value={formVenta.motivo_descuento}
                onChange={(e) => {
                  const motivo_descuento = e.target.value;
                  setFormVenta({ ...formVenta, motivo_descuento });
                  if (erroresVenta.motivo_descuento) setErroresVenta((prev) => ({ ...prev, motivo_descuento: motivo_descuento.trim() ? "" : prev.motivo_descuento }));
                }}
              />
              {erroresVenta.motivo_descuento && <span className="pedidosventas-field-error">{erroresVenta.motivo_descuento}</span>}
            </div>
          )}

          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Dirección de entrega (opcional)</label>
            <input
              type="text"
              maxLength={MAX_LONGITUD_DIRECCION}
              placeholder="Ej: Cra 43A # 18-20 Apto 302 — déjalo vacío si la venta es en persona"
              className="pedidosventas-form-input"
              value={formVenta.direccion_entrega}
              onChange={(e) => setFormVenta({ ...formVenta, direccion_entrega: e.target.value })}
            />
          </div>

          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Observaciones (opcional)</label>
            <textarea
              className="pedidosventas-form-input"
              rows={2}
              maxLength={MAX_LONGITUD_TEXTO_LIBRE}
              value={formVenta.observaciones}
              onChange={(e) => setFormVenta({ ...formVenta, observaciones: e.target.value })}
            />
          </div>

          <div className="pedidosventas-total-resumen">
            <span>Subtotal: {fmt(subtotalVenta)}</span>
            <span className="pedidosventas-total-final">Total: {fmt(totalVenta)}</span>
          </div>
        </div>
        <div className="pedidosventas-modal-footer">
          <button className="pedidosventas-btn-secondary" onClick={() => setModalVenta(false)} disabled={guardandoVenta}>Cancelar</button>
          <button className="pedidosventas-btn-primary" onClick={guardarVenta} disabled={guardandoVenta}>
            {guardandoVenta ? "Guardando..." : "Registrar venta"}
          </button>
        </div>
      </div>
    </div>
  );
}
