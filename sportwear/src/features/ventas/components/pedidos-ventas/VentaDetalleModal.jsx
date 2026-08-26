import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconX } from "../../../../shared/components/Icons";
import { fmt, getEstadoBadge } from "../../utils/pedidosVentasHelpers";

export default function VentaDetalleModal({ verDetalle, setVerDetalle }) {
  if (!verDetalle) return null;

  return (
    <div className="pedidosventas-modal-overlay" onClick={() => setVerDetalle(null)}>
      <div className="pedidosventas-modal pedidosventas-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="pedidosventas-modal-header">
          <div>
            <h2 className="pedidosventas-modal-title">V-{String(verDetalle.id_venta).padStart(3, "0")}</h2>
            <p className="pedidosventas-modal-subtitulo">Detalle de venta</p>
          </div>
          <button className="pedidosventas-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
        </div>

        <div className="pedidosventas-modal-body pedidosventas-factura-body">
          <div className="pedidosventas-factura-seccion">
            <h3 className="pedidosventas-factura-titulo">Información</h3>
            <DetalleGrid>
              <DetalleItem label="Cliente" value={verDetalle.cliente} />
              <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
              <DetalleItem label="Tipo de pago" value={verDetalle.tipo_pago === 'cuotas' ? `Cuotas (${verDetalle.num_cuotas})` : 'Completo'} />
              <DetalleItem label="Estado" value={<span className={`pedidosventas-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>} />
              {verDetalle.direccion_entrega && (
                <DetalleItem label="Dirección de entrega" value={verDetalle.direccion_entrega} full />
              )}
            </DetalleGrid>
          </div>

          <div className="pedidosventas-factura-seccion">
            <h3 className="pedidosventas-factura-titulo">Productos</h3>
            {(verDetalle.items || []).map((item, i) => {
              const variante = [item.color_nombre, item.talla ? `Talla ${item.talla}` : null].filter(Boolean).join(" · ");
              return (
                <div key={i} className="pedidosventas-detalle-item-linea">
                  <span>{item.producto} {variante ? `(${variante})` : ""} × {item.cantidad}</span>
                  <span>{fmt(item.subtotal)}</span>
                </div>
              );
            })}
          </div>

          <div className="pedidosventas-factura-seccion">
            <h3 className="pedidosventas-factura-titulo">Pago</h3>
            <DetalleGrid>
              <DetalleItem label="Total" value={fmt(verDetalle.total)} />
              <DetalleItem label="Abonado" value={fmt(verDetalle.total_pagado || 0)} />
              <DetalleItem label="Saldo" value={fmt(verDetalle.total - (verDetalle.total_pagado || 0))} />
              {Number(verDetalle.descuento) > 0 && (
                <DetalleItem label="Descuento" value={fmt(verDetalle.descuento)} />
              )}
              {verDetalle.motivo_descuento && (
                <DetalleItem label="Motivo del descuento" value={verDetalle.motivo_descuento} full />
              )}
            </DetalleGrid>
          </div>

          {verDetalle.abonos?.length > 0 && (
            <div className="pedidosventas-factura-seccion">
              <h3 className="pedidosventas-factura-titulo">Historial de abonos</h3>
              {verDetalle.abonos.map((a, i) => (
                <div key={i} className="pedidosventas-detalle-item-linea">
                  <span>{a.num_cuota ? `Cuota ${a.num_cuota}` : `Abono ${i + 1}`}</span>
                  <span>{fmt(a.monto)} · {a.estado}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pedidosventas-modal-footer">
          <button className="pedidosventas-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
