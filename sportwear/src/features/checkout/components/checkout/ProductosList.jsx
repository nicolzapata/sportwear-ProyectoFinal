import { fmt } from "../../utils/checkoutHelpers";

export default function ProductosList({ items }) {
  return (
    <div className="checkout-productos">
      <h2 className="checkout-section-titulo">Productos</h2>
      {items.map((item) => (
        <div key={item.id_variante ?? item.id} className="checkout-item">
          <div className="checkout-item-img">
            {item.imagen ? (
              <img src={item.imagen} alt={item.nombre} />
            ) : (
              <div className="checkout-item-img-placeholder">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="m9 9 6 6m0-6-6 6"/>
                </svg>
              </div>
            )}
          </div>
          <div className="checkout-item-info">
            <span className="checkout-item-nombre">{item.nombre}</span>
            {item.talla && <span className="checkout-item-detalle">Talla: {item.talla}</span>}
            {item.color && <span className="checkout-item-detalle">Color: {item.color}</span>}
          </div>
          <div className="checkout-item-cant">× {item.cantidad}</div>
          <div className="checkout-item-precio">{fmt(item.precio * item.cantidad)}</div>
        </div>
      ))}
    </div>
  );
}
