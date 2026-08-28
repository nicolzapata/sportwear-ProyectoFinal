import { IconCreditCard } from "../../../../shared/components/Icons";
import { IconImagenVacia } from "./miCuentaIcons";
import { fmt, getBadgeClass, getBadgeTexto, getEnvioBadgeClass, getEnvioTexto } from "../../utils/miCuentaHelpers";

// ── Tarjeta de un pedido — se reutiliza tanto en la vista compacta de la
// página como dentro de la ventana "Ver todos mis pedidos". ──
export default function PedidoCard({ pedido, setPagoModal, cargarDetallePedido }) {
  const abonosConfirmados = pedido.abonos?.filter((a) => a.estado === "Confirmado").length || 0;
  const esCuotas   = pedido.tipo_pago === "cuotas";
  const restante   = Number(pedido.total || 0) - Number(pedido.total_pagado || 0);
  const puedePagar = restante > 0 && pedido.estado !== "Cancelado";
  const textoTipo  = esCuotas ? `${abonosConfirmados}/${pedido.num_cuotas} cuotas` : "Pago completo";

  return (
    <div className={`mc-pedido-card${(pedido.estado === "Cancelado" || pedido.estado === "Anulado") ? " mc-pedido-card-cancelado" : ""}`}>
      <div className="mc-pedido-card-header">
        <div className="mc-pedido-card-info">
          {/* ── NUEVO: el código real de la venta se muestra junto al número
              de pedido del cliente — el número sigue siendo el conteo propio
              del cliente (no revela el total de ventas de la tienda), y el
              código sirve como referencia exacta para soporte. ── */}
          <span className="mc-pedido-card-id">
            Pedido #{pedido.numeroPedido}
            <span className="mc-pedido-card-codigo">V-{String(pedido.id_venta).padStart(3, "0")}</span>
          </span>
          <span className="mc-pedido-card-fecha">{new Date(pedido.fecha).toLocaleDateString("es-CO", { timeZone: "UTC" })}</span>
        </div>
        <div className="mc-pedido-card-badges">
          <span className={`badge ${getBadgeClass(pedido.estado)}`} title="Estado del pago">{getBadgeTexto(pedido.estado)}</span>
          <span className={`badge ${getEnvioBadgeClass(pedido.estado_envio)}`} title="Estado del envío">{getEnvioTexto(pedido.estado_envio)}</span>
        </div>
      </div>

      <div className="mc-pedido-card-items">
        {(pedido.items || []).map((item, i) => (
          <div key={i} className="mc-pedido-item-thumb" title={`${item.producto}${item.talla ? " · " + item.talla : ""}`}>
            {item.producto_imagen ? (
              <img src={item.producto_imagen} alt={item.producto} />
            ) : (
              <IconImagenVacia />
            )}
            {item.cantidad > 1 && <span className="mc-pedido-item-cant">×{item.cantidad}</span>}
          </div>
        ))}
      </div>

      <div className="mc-pedido-card-footer">
        <div className="mc-pedido-card-totales">
          <span className="mc-pedido-card-tipo">{textoTipo}</span>
          <span className="mc-pedido-card-total">{fmt(pedido.total)}</span>
          {Number(pedido.total_pagado || 0) > 0 && Number(pedido.total_pagado) < Number(pedido.total) && (
            <span className="mc-pedido-card-pagado">Pagado: {fmt(pedido.total_pagado)}</span>
          )}
        </div>
        <div className="mc-pedido-card-acciones">
          {puedePagar && (
            <button className="tbl-action-btn tbl-action-btn--pay" onClick={() => setPagoModal(pedido)}>
              <IconCreditCard /> Pagar
            </button>
          )}
          <button className="tbl-action-btn tbl-action-btn--view" onClick={() => cargarDetallePedido(pedido)}>
            Ver detalle
          </button>
        </div>
      </div>
    </div>
  );
}
