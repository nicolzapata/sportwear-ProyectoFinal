import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconEdit, IconX } from "../../../../shared/components/Icons";
import { fmt, getEstadoBadge } from "../../utils/comprasHelpers";

export default function CompraDetalleModal({
  verDetalle, cerrarDetalle, tienePerm,
  modoEdicion, setModoEdicion, estadoEditado, setEstadoEditado,
  guardandoEstado, guardarEstado,
}) {
  if (!verDetalle) return null;

  return (
    <div className="compras-modal-overlay" onClick={() => !guardandoEstado && cerrarDetalle()}>
      <div className="compras-modal compras-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="compras-modal-header">
          <div>
            <h2 className="compras-modal-title">
              C-{String(verDetalle.id_compra).padStart(3, "0")}
            </h2>
            <p className="compras-modal-subtitulo">Detalle de compra</p>
          </div>
          <button className="compras-modal-close" onClick={cerrarDetalle}><IconX /></button>
        </div>

        <div className="compras-modal-body compras-factura-body">

          {modoEdicion && (
            <div className="compras-edicion-banner">
              <IconEdit /> Estás editando el estado de esta compra
            </div>
          )}

          <div className="compras-factura-seccion">
            <h3 className="compras-factura-titulo">Información</h3>
            <DetalleGrid>
              <DetalleItem label="Proveedor" value={verDetalle.proveedor} />
              <DetalleItem label="N° Orden" value={verDetalle.numero_orden} />
              <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
              <DetalleItem label="Estado" value={
                modoEdicion ? (
                  <select
                    className="compras-form-select compras-detalle-estado-select"
                    value={estadoEditado}
                    onChange={(e) => setEstadoEditado(e.target.value)}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Tránsito">En Tránsito</option>
                    <option value="Recibido">Recibido</option>
                  </select>
                ) : (
                  <span className={`compras-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>
                )
              } />
              {verDetalle.observaciones && (
                <DetalleItem label="Observaciones" value={verDetalle.observaciones} full />
              )}
            </DetalleGrid>
          </div>

          <div className="compras-factura-seccion">
            <h3 className="compras-factura-titulo">Productos</h3>
            {(verDetalle.items || []).map((it, i) => (
              <div key={i} className="compras-detalle-item-linea">
                <span>{it.producto} {it.talla ? `(${it.talla}${it.color ? " · " + it.color : ""})` : ""} × {it.cantidad}</span>
                <span className="compras-detalle-item-precios">
                  {it.precio_venta != null && (
                    <span className="compras-detalle-item-venta">Venta: {fmt(it.precio_venta)}</span>
                  )}
                  {fmt(it.cantidad * it.precio_unitario)}
                </span>
              </div>
            ))}
          </div>

          <div className="compras-factura-seccion">
            <h3 className="compras-factura-titulo">Pago</h3>
            <div className="compras-total-resumen compras-total-resumen-detalle">
              <span>Subtotal: {fmt(verDetalle.subtotal)}</span>
              <span>Descuento: {fmt(verDetalle.descuento)}</span>
              <span className="compras-total-final">Total: {fmt(verDetalle.total)}</span>
            </div>
          </div>
        </div>

        <div className="compras-modal-footer">
          {modoEdicion ? (
            <>
              <button
                className="compras-btn-secondary"
                onClick={() => { setModoEdicion(false); setEstadoEditado(verDetalle.estado); }}
                disabled={guardandoEstado}
              >
                Cancelar
              </button>
              <button className="compras-btn-primary" onClick={guardarEstado} disabled={guardandoEstado}>
                {guardandoEstado ? "Guardando..." : "Guardar cambios"}
              </button>
            </>
          ) : (
            <>
              <button className="compras-btn-secondary" onClick={cerrarDetalle}>Cerrar</button>
              {tienePerm('Compras.editar') && verDetalle.estado !== "Anulado" && (
                <button className="compras-btn-primary" onClick={() => setModoEdicion(true)}>
                  <IconEdit /> Editar estado
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
