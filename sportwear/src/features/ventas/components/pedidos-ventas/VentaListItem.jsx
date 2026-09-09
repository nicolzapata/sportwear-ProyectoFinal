import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { fmt, getEstadoBadge } from "../../utils/pedidosVentasHelpers";

export default function VentaListItem({ venta, seleccionado, onSeleccionar }) {
  const cantTotal = venta.items?.reduce((s, i) => s + (Number(i.cantidad) || 0), 0) || 0;
  const resumen = venta.items?.map((i) => i.producto).filter(Boolean).join(', ') || '—';
  const saldo = venta.total - (venta.total_pagado || 0);
  const pct = venta.total > 0 ? Math.min(100, Math.round(((venta.total_pagado || 0) / venta.total) * 100)) : 0;

  return (
    <button
      type="button"
      className={`vta-item${seleccionado ? ' seleccionado' : ''}`}
      onClick={() => onSeleccionar(venta.id_venta)}
    >
      <div className="vta-item-top">
        <span className="vta-item-avatar" style={{ background: getAvatarColor(venta.id_venta) }}>{getInitials(venta.cliente)}</span>
        <div className="vta-item-info">
          <div className="vta-item-nombre-row">
            <span className="vta-item-id">V-{String(venta.id_venta).padStart(3, "0")}</span>
            {venta.tipo_pago === 'cuotas' && <span className="pedidosventas-badge pedidosventas-badge-info">Cuotas {venta.num_cuotas}x</span>}
          </div>
          <span className="vta-item-nombre">{venta.cliente}</span>
          <p className="vta-item-desc" title={resumen}>{resumen}{cantTotal > 0 ? ` · ${cantTotal} uds` : ''}</p>
        </div>
        <div className="vta-item-total-col">
          <span className="vta-item-total">{fmt(venta.total)}</span>
          <span className={`pedidosventas-badge ${getEstadoBadge(venta.estado)}`}>{venta.estado}</span>
        </div>
      </div>
      <div className="vta-item-bottom">
        <div className="pedidosventas-pago-bar-track vta-item-pago-track">
          <div className="pedidosventas-pago-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="vta-item-pago-texto">{saldo > 0 ? `Saldo ${fmt(saldo)}` : 'Sin saldo'}</span>
        <span className="vta-item-fecha">{venta.fecha?.toString().split("T")[0]}</span>
      </div>
    </button>
  );
}
