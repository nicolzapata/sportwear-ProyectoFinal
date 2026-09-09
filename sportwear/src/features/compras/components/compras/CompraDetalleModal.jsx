import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import DetallePanel from "../../../../shared/components/DetallePanel";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { IconEdit } from "../../../../shared/components/Icons";
import Select from "../../../../shared/components/Select";
import { fmt, getEstadoBadge } from "../../utils/comprasHelpers";

// Panel acoplado a la tabla (mismo criterio que Usuarios/Proveedores): "Ver
// detalle" y "Editar estado" ya no abren un modal centrado, se ven como
// panel al lado de la tabla — modoEdicion alterna entre ambos adentro del
// mismo panel, tal cual ya hacía dentro del modal.
export default function CompraDetalleModal({
  verDetalle, cerrarDetalle, tienePerm,
  modoEdicion, setModoEdicion, estadoEditado, setEstadoEditado,
  guardandoEstado, guardarEstado,
}) {
  if (!verDetalle) return null;

  return (
    <DetallePanel
      iniciales={getInitials(verDetalle.proveedor)}
      avatarColor={getAvatarColor(verDetalle.id_compra)}
      nombre={`C-${String(verDetalle.id_compra).padStart(3, "0")}`}
      subtitulo={modoEdicion ? "Editando estado" : "Detalle de compra"}
      onClose={() => !guardandoEstado && cerrarDetalle()}
      footer={
        modoEdicion ? (
          <>
            <button
              className="detalle-panel-btn-secundario"
              onClick={() => { setModoEdicion(false); setEstadoEditado(verDetalle.estado); }}
              disabled={guardandoEstado}
            >
              Cancelar
            </button>
            <button className="detalle-panel-btn-primario" onClick={guardarEstado} disabled={guardandoEstado}>
              {guardandoEstado ? "Guardando..." : "Guardar cambios"}
            </button>
          </>
        ) : (
          <>
            <button className="detalle-panel-btn-secundario" onClick={cerrarDetalle}>Cerrar</button>
            {tienePerm('Compras.editar') && verDetalle.estado !== "Anulado" && (
              <button className="detalle-panel-btn-primario" onClick={() => setModoEdicion(true)}>
                <IconEdit /> Editar estado
              </button>
            )}
          </>
        )
      }
    >
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
              <Select
                className="compras-form-select compras-detalle-estado-select"
                value={estadoEditado}
                onChange={(e) => setEstadoEditado(e.target.value)}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En Tránsito">En Tránsito</option>
                <option value="Recibido">Recibido</option>
              </Select>
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
    </DetallePanel>
  );
}
