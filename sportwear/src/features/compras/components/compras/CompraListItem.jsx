import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { fmt, getEstadoBadge } from "../../utils/comprasHelpers";

export default function CompraListItem({ compra, seleccionado, onSeleccionar }) {
  const cantTotal = compra.items?.reduce((s, i) => s + (Number(i.cantidad) || 0), 0) || 0;
  const resumen = compra.items?.map((i) => i.producto).filter(Boolean).join(', ') || '—';

  return (
    <button
      type="button"
      className={`cpr-item${seleccionado ? ' seleccionado' : ''}`}
      onClick={() => onSeleccionar(compra.id_compra)}
    >
      <div className="cpr-item-top">
        <span className="cpr-item-avatar" style={{ background: getAvatarColor(compra.id_compra) }}>{getInitials(compra.proveedor)}</span>
        <div className="cpr-item-info">
          <div className="cpr-item-nombre-row">
            <span className="cpr-item-id">C-{String(compra.id_compra).padStart(3, "0")}</span>
            {compra.numero_orden && <span className="cpr-item-orden">Orden {compra.numero_orden}</span>}
          </div>
          <span className="cpr-item-nombre">{compra.proveedor}</span>
          <p className="cpr-item-desc" title={resumen}>{resumen}{cantTotal > 0 ? ` · ${cantTotal} uds` : ''}</p>
        </div>
        <div className="cpr-item-total-col">
          <span className="cpr-item-total">{fmt(compra.total)}</span>
          <span className={`compras-badge ${getEstadoBadge(compra.estado)}`}>{compra.estado}</span>
        </div>
      </div>
      <div className="cpr-item-bottom">
        <span className="cpr-item-fecha">{compra.fecha?.toString().split("T")[0]}</span>
      </div>
    </button>
  );
}
