import { IconX } from "../../../../shared/components/Icons";
import { MAX_MONTO, MAX_LONGITUD_TEXTO_LIBRE, MAX_LONGITUD_DIRECCION } from "../../../../shared/utils/numerico";
import ClienteAutocomplete from "./ClienteAutocomplete";
import VentaItemRow from "./VentaItemRow";
import VentaPagoFields from "./VentaPagoFields";
import "../../../checkout/pages/Checkout.cuotas.css";
import { fmt, HOY_ISO } from "../../utils/pedidosVentasHelpers";
import { useNuevaVenta } from "../../hooks/useNuevaVenta";

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
  const { numCuotasSel, valorCuotaSel, fechasCuotasSel } = useNuevaVenta(formVenta, totalVenta);

  if (!modalVenta) return null;

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

          <VentaPagoFields
            formVenta={formVenta} setFormVenta={setFormVenta} erroresVenta={erroresVenta} setErroresVenta={setErroresVenta}
            metodosPago={metodosPago} cargandoCredito={cargandoCredito} creditoInfo={creditoInfo}
            totalVenta={totalVenta} opcionesCuotasVenta={opcionesCuotasVenta}
            numCuotasSel={numCuotasSel} valorCuotaSel={valorCuotaSel} fechasCuotasSel={fechasCuotasSel}
          />

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
            <label className="pedidosventas-form-label">Dirección de entrega</label>
            <input
              type="text"
              maxLength={MAX_LONGITUD_DIRECCION}
              placeholder="Ej: Cra 43A # 18-20 Apto 302"
              className={`pedidosventas-form-input${erroresVenta.direccion_entrega ? " input-error" : ""}`}
              value={formVenta.direccion_entrega}
              onChange={(e) => {
                setFormVenta({ ...formVenta, direccion_entrega: e.target.value });
                if (erroresVenta.direccion_entrega) setErroresVenta((prev) => ({ ...prev, direccion_entrega: e.target.value.trim() ? "" : prev.direccion_entrega }));
              }}
            />
            {erroresVenta.direccion_entrega && <span className="pedidosventas-field-error">{erroresVenta.direccion_entrega}</span>}
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
