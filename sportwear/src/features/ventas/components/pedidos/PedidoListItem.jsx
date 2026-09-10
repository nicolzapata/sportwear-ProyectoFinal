import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { fmt } from "../../../../shared/utils/publicNavbarHelpers";
import { getPagoBadge, getPagoTexto, getEstadoPago, getEstadoBadge, tiempoRelativo } from "../../utils/pedidosHelpers";
import { IconChevronRight } from "../../../../shared/components/Icons";

export default function PedidoListItem({ pedido, seleccionado, onSeleccionar }) {
  const nPrendas = pedido.items?.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0) || 0;
  const resumenProductos = pedido.items?.map((i) => i.producto).filter(Boolean).join(', ') || '—';

  return (
    <button
      type="button"
      className={`ped-item${seleccionado ? ' seleccionado' : ''}`}
      onClick={() => onSeleccionar(pedido.id_pedido)}
    >
      <div className="ped-item-top">
        <span className="ped-item-avatar" style={{ background: getAvatarColor(pedido.id_pedido) }}>{getInitials(pedido.cliente)}</span>
        <div className="ped-item-info">
          <div className="ped-item-nombre-row">
            <span className="ped-item-nombre">{pedido.cliente}</span>
            <span className={`pedidos-badge ${getEstadoBadge(pedido.estado_pedido)}`}>{pedido.estado_pedido}</span>
          </div>
          <p className="ped-item-desc" title={resumenProductos}>{resumenProductos} · {nPrendas} prenda{nPrendas !== 1 ? 's' : ''}</p>
        </div>
        <div className="ped-item-total-col">
          <span className="ped-item-total">{fmt(pedido.total)}</span>
          <span className="ped-item-ver">
            {seleccionado ? 'Viendo detalle' : 'Ver detalle'}
            <IconChevronRight />
          </span>
        </div>
      </div>
      <div className="ped-item-bottom">
        <span className={`pedidos-badge ${getPagoBadge(getEstadoPago(pedido))}`}>{getPagoTexto(getEstadoPago(pedido))}</span>
        <span className="ped-item-direccion" title={pedido.direccion_entrega}>{pedido.direccion_entrega || '—'}</span>
        <span className="ped-item-tiempo">{tiempoRelativo(pedido.fecha_actualizacion)}</span>
      </div>
    </button>
  );
}
