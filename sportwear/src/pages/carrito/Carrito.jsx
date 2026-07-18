// src/pages/carrito/Carrito.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "./Carrito.css";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

export default function Carrito() {
  const { items, total, totalItems, actualizarCantidad, eliminarItem, vaciarCarrito } = useCart();
  const { usuario } = useAuth();
  const navigate    = useNavigate();
  const yendoACheckout = useRef(false);
  const [permisoCuotas, setPermisoCuotas] = useState(true);
  const [tipoPago, setTipoPago] = useState("completo");
  const [numCuotas, setNumCuotas] = useState(2);

  // Cargar permiso de cuotas
  useEffect(() => {
    if (!usuario) return;
    api.get("/clientes/mi-perfil")
      .then(({ data }) => setPermisoCuotas(data.permiso_cuotas !== false))
      .catch(() => setPermisoCuotas(true));
  }, [usuario]);

  // Calcular valor de cada cuota
  const valorCuota = tipoPago === "cuotas" ? Math.ceil(total / numCuotas) : null;

  // ── Pantalla: no autenticado ───────────────────────────────────────────
  if (!usuario) {
    return (
      <div className="carrito-vacio">
        <div className="carrito-vacio-icono">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <h2 className="carrito-vacio-titulo">Inicia sesión para ver tu carrito</h2>
        <p className="carrito-vacio-texto">Para acceder a tu carrito debes iniciar sesión.</p>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>
          Iniciar sesión
        </button>
      </div>
    );
  }

  // ── Pantalla: carrito vacío ────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="carrito-vacio">
        <div className="carrito-vacio-icono">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        <h2 className="carrito-vacio-titulo">Tu carrito está vacío</h2>
        <p className="carrito-vacio-texto">Agrega productos desde el catálogo para comenzar.</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => navigate("/catalogo")}>
            Ir al catálogo
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
            Mis pedidos
          </button>
        </div>
      </div>
    );
  }

  // ── Ir a checkout ─────────────────────────────────────────────────────
  const irACheckout = () => {
    yendoACheckout.current = true;
    // Guardar tipo de pago en sessionStorage para pasarlo al checkout
    sessionStorage.setItem("tipoPago", tipoPago);
    sessionStorage.setItem("numCuotas", numCuotas);
    navigate("/checkout");
  };

  // ── Vista principal ───────────────────────────────────────────────────
  return (
    <div className="carrito-page">
      <div className="carrito-header">
        <div className="carrito-header-left">
          <span className="carrito-contador">
            {totalItems} {totalItems === 1 ? "producto" : "productos"}
          </span>
        </div>
        <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
          Mis pedidos
        </button>
      </div>

      <div className="carrito-layout">
        {/* Lista de productos */}
        <div className="carrito-lista">
          {items.map((item) => (
            <div key={item.id_variante ?? item.id} className="carrito-item">
              <div className="carrito-item-img">
                {item.imagen ? (
                  <img src={item.imagen} alt={item.nombre} />
                ) : (
                  <div className="carrito-item-img-placeholder">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="m9 9 6 6m0-6-6 6"/>
                    </svg>
                  </div>
                )}
              </div>

              <div className="carrito-item-info">
                <div className="carrito-item-cat">{item.categoria}</div>
                <div className="carrito-item-nombre">{item.nombre}</div>
                {item.talla && <div className="carrito-item-detalle">Talla: {item.talla}</div>}
                {item.color && <div className="carrito-item-detalle">Color: {item.color}</div>}
              </div>

              <div className="carrito-item-cantidad">
                <button
                  className="carrito-qty-btn"
                  onClick={() => actualizarCantidad(item.id_variante ?? item.id, item.cantidad - 1)}
                >−</button>
                <span className="carrito-qty-num">{item.cantidad}</span>
                <button
                  className="carrito-qty-btn"
                  onClick={() => actualizarCantidad(item.id_variante ?? item.id, item.cantidad + 1)}
                  disabled={item.cantidad >= (item.stock ?? 99)}
                >+</button>
              </div>

              <div className="carrito-item-precio">
                {fmt(item.precio * item.cantidad)}
              </div>

              <button
                className="carrito-item-eliminar"
                onClick={() => eliminarItem(item.id_variante ?? item.id)}
                title="Eliminar producto"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}

          <button className="btn" style={{ background: 'transparent', border: 'none', color: 'var(--muted)', textDecoration: 'underline' }} onClick={vaciarCarrito}>
            Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div className="carrito-resumen">
          <h2 className="carrito-resumen-titulo">Resumen del pedido</h2>

          <div className="carrito-resumen-lineas">
            {items.map((item) => (
              <div key={item.id_variante ?? item.id} className="carrito-resumen-linea">
                <span>{item.nombre} × {item.cantidad}</span>
                <span>{fmt(item.precio * item.cantidad)}</span>
              </div>
            ))}
          </div>

          <div className="carrito-resumen-divider" />

          <div className="carrito-resumen-total">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>

          {permisoCuotas && (
            <div className="carrito-opcion-pago" style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 500, marginBottom: '8px', display: 'block' }}>Opción de pago:</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="tipoPago" value="completo" checked={tipoPago === "completo"} onChange={() => setTipoPago("completo")} />
                Pago completo
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '5px' }}>
                <input type="radio" name="tipoPago" value="cuotas" checked={tipoPago === "cuotas"} onChange={() => setTipoPago("cuotas")} />
                Pagar en cuotas
              </label>
              {tipoPago === "cuotas" && (
                <div style={{ marginTop: '10px', paddingLeft: '24px' }}>
                  <label style={{ fontSize: '14px' }}>Número de cuotas:</label>
                  <select value={numCuotas} onChange={(e) => setNumCuotas(Number(e.target.value))} style={{ marginLeft: '10px', padding: '4px' }}>
                    <option value={2}>2 cuotas de {fmt(Math.ceil(total / 2))}</option>
                    <option value={3}>3 cuotas de {fmt(Math.ceil(total / 3))}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '10px' }}
            onClick={irACheckout}
          >
            Finalizar compra →
          </button>

          <button
            className="btn btn-outline"
            style={{ width: '100%' }}
            onClick={() => navigate("/catalogo")}
          >
            Seguir comprando
          </button>
        </div>
      </div>
    </div>
  );
}