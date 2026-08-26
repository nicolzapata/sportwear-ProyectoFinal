import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconX, IconBox } from "../../../../shared/components/Icons";
import { getPagoBadge, getPagoTexto, getEstadoBadge } from "../../utils/pedidosHelpers";

// ── Modal "ver detalle" — panel único tipo factura ──
export default function PedidoDetalleModal({ verDetalle, setVerDetalle }) {
  return (
    <div className="pedidos-modal-overlay" onClick={() => setVerDetalle(null)}>
      <div className="pedidos-modal pedidos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="pedidos-modal-header">
          <div>
            <h2 className="pedidos-modal-title">P-{String(verDetalle.id_pedido).padStart(3, "0")}</h2>
            <p className="pedidos-modal-subtitulo">Detalle de pedido</p>
          </div>
          <button className="pedidos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
        </div>

        <div className="pedidos-modal-body pedidos-factura-body">
          <div className="pedidos-factura-seccion">
            <h3 className="pedidos-factura-titulo">Información</h3>
            <DetalleGrid>
              <DetalleItem label="Cliente" value={verDetalle.cliente} />
              <DetalleItem label="Documento" value={verDetalle.cliente_documento} />
              <DetalleItem label="Dirección" value={verDetalle.direccion_entrega} />
              <DetalleItem label="Venta" value={`V-${String(verDetalle.id_venta).padStart(3, "0")}`} />
              <DetalleItem label="Método de pago" value={verDetalle.metodo_pago || "—"} />
              <DetalleItem label="Pago" value={<span className={`pedidos-badge ${getPagoBadge(verDetalle.estado_venta)}`}>{getPagoTexto(verDetalle.estado_venta)}</span>} />
              <DetalleItem label="Estado de envío" value={<span className={`pedidos-badge ${getEstadoBadge(verDetalle.estado_pedido)}`}>{verDetalle.estado_pedido}</span>} />
            </DetalleGrid>
          </div>

          <div className="pedidos-factura-seccion">
            <h3 className="pedidos-factura-titulo">Productos</h3>
            {(verDetalle.items || []).map((item, i) => (
              <div key={i} className="pedidos-detalle-producto-row">
                <div className="pedidos-detalle-producto-thumb">
                  {item.producto_imagen ? (
                    <img src={item.producto_imagen} alt={item.producto} />
                  ) : (
                    <IconBox />
                  )}
                </div>
                <div className="pedidos-detalle-producto-info">
                  <span className="pedidos-detalle-producto-nombre">{item.producto}</span>
                  <div className="pedidos-detalle-producto-tags">
                    {item.producto_codigo && <span className="pedidos-detalle-tag pedidos-detalle-tag-ref">{item.producto_codigo}</span>}
                    {item.talla && <span className="pedidos-detalle-tag">Talla: {item.talla}</span>}
                    {item.color_nombre && <span className="pedidos-detalle-tag">{item.color_nombre}</span>}
                  </div>
                </div>
                <span className="pedidos-detalle-producto-cant">Cant: {item.cantidad}</span>
              </div>
            ))}
          </div>

          {verDetalle.historial?.length > 0 && (
            <div className="pedidos-factura-seccion">
              <h3 className="pedidos-factura-titulo">Historial de estados</h3>
              {verDetalle.historial.map((h, i) => (
                <div key={i} className="pedidos-detalle-item-linea">
                  <span>{h.estado}</span>
                  <span>{h.fecha?.toString().split("T")[0]} {h.usuario ? `· ${h.usuario}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pedidos-modal-footer">
          <button className="pedidos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
