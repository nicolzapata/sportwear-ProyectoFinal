import { createPortal } from "react-dom";
import PedidoCard from "./PedidoCard";
import { IconXModal } from "./miCuentaIcons";

// ── Ventana "Ver todos mis pedidos" — lista completa con su propio
// scroll interno, sin alargar la página.
// NUEVO: va en un portal a document.body — así evita quedar atrapada
// dentro de ".mi-cuenta" (que deja un transform "fantasma" pegado por
// su animación de entrada, lo cual rompe position:fixed si el modal
// vive adentro). ──
export default function TodosPedidosModal({ pedidos, onClose, setPagoModal, cargarDetallePedido }) {
  return createPortal(
    <div className="mc-modal-overlay" onClick={onClose}>
      <div className="mc-modal-box mc-modal-todos-pedidos" onClick={(e) => e.stopPropagation()}>
        <div className="mc-modal-header">
          <h2 className="mc-modal-title">Mis pedidos ({pedidos.length})</h2>
          <button className="mc-modal-close" onClick={onClose}><IconXModal /></button>
        </div>
        <div className="mc-modal-body mc-modal-todos-pedidos-body">
          <div className="mc-pedidos-lista">
            {pedidos.map((pedido) => (
              <PedidoCard key={pedido.id_venta} pedido={pedido} setPagoModal={setPagoModal} cargarDetallePedido={cargarDetallePedido} />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
