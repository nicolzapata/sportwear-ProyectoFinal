import { fmt } from "../../utils/checkoutHelpers";
import { IconShield, IconClock } from "../../checkoutIcons";

export default function ProductosList({ items }) {
  const totalUnidades = items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <div className="checkout-productos">
      <div className="checkout-productos-header">
        <div>
          <h2 className="checkout-section-titulo">Productos en tu orden</h2>
          <p className="checkout-productos-sub">Revisa la cantidad y variantes antes de procesar el pago</p>
        </div>
        <span className="checkout-productos-badge">
          {items.length} {items.length === 1 ? "artículo" : "artículos"} ({totalUnidades} {totalUnidades === 1 ? "unidad" : "unidades"})
        </span>
      </div>

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
            <div className="checkout-item-tags">
              {item.talla && <span className="checkout-item-tag">Talla: <strong>{item.talla}</strong></span>}
              {item.color && <span className="checkout-item-tag">Color: <strong>{item.color}</strong></span>}
              <span className="checkout-item-tag">Cant: <strong>{item.cantidad}</strong></span>
            </div>
            <span className="checkout-item-unitario">Precio unitario: {fmt(item.precio)}</span>
          </div>
          <div className="checkout-item-derecha">
            <span className="checkout-item-cant">Subtotal (× {item.cantidad})</span>
            <span className="checkout-item-precio">{fmt(item.precio * item.cantidad)}</span>
          </div>
        </div>
      ))}

      <div className="checkout-beneficios">
        <div className="checkout-beneficio">
          <span className="checkout-beneficio-icono"><IconShield /></span>
          <div>
            <div className="checkout-beneficio-titulo">Garantía SportWear</div>
            <div className="checkout-beneficio-texto">Cambios y devoluciones ágiles hasta por 30 días.</div>
          </div>
        </div>
        <div className="checkout-beneficio">
          <span className="checkout-beneficio-icono"><IconClock /></span>
          <div>
            <div className="checkout-beneficio-titulo">Entrega rápida</div>
            <div className="checkout-beneficio-texto">Envíos en Medellín entre 24 y 48 horas hábiles.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
