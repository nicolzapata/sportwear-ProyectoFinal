import { IconShoppingCart } from "../../../../shared/components/Icons";
import PedidoCard from "./PedidoCard";
import { PEDIDOS_VISIBLES_INLINE } from "../../utils/miCuentaHelpers";

// ── Pedidos — solo los últimos 3 aquí; el resto vive en la ventana
// "Ver todos mis pedidos", para no volver esta página un scroll
// interminable con clientes que tienen muchos pedidos. ──
export default function PedidosSection({ pedidos, setPagoModal, cargarDetallePedido, onVerTodos }) {
  const pedidosVisibles = pedidos.slice(0, PEDIDOS_VISIBLES_INLINE);
  const hayMasPedidos = pedidos.length > PEDIDOS_VISIBLES_INLINE;

  return (
    <div className="mc-card">
      <div className="mc-card-header-row">
        <div>
          <h3 className="mc-card-title">Tus pedidos</h3>
          <p className="mc-card-subtitle">Historial de compras</p>
        </div>
        {hayMasPedidos && (
          <button className="mc-btn-secondary mc-btn-ver-todos" onClick={onVerTodos}>
            Ver todos mis pedidos ({pedidos.length})
          </button>
        )}
      </div>

      {pedidos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IconShoppingCart /></div>
          <h4 className="empty-state-title">Aún no tienes pedidos</h4>
          <p className="empty-state-text">Explora nuestro catálogo y encuentra lo que buscas</p>
          <a href="/catalogo" className="btn-primary">Ver catálogo</a>
        </div>
      ) : (
        <div className="mc-pedidos-lista">
          {pedidosVisibles.map((pedido) => (
            <PedidoCard key={pedido.id_venta} pedido={pedido} setPagoModal={setPagoModal} cargarDetallePedido={cargarDetallePedido} />
          ))}
        </div>
      )}
    </div>
  );
}
