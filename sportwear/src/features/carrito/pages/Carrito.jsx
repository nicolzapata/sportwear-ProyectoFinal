// src/pages/carrito/Carrito.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../../shared/contexts/CartContext";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useThemeScope } from "../../../shared/contexts/ThemeContext";
import api from "../../../shared/services/api";
import { opcionesCuotasDisponibles, calcularFechasVencimiento } from "../../../shared/utils/cuotas";
import CuotasCalendario from "../../checkout/components/checkout/CuotasCalendario";
import Select from "../../../shared/components/Select";
import { IconTrash, IconShield, IconRefresh, IconPin, IconArrowRight, IconReceipt, IconCheckSm } from "../carritoIcons";
import "../../checkout/pages/Checkout.cuotas.css";
import "./Carrito.css";

const BENEFICIOS = [
  { icono: <IconShield />,  titulo: "Garantía por costuras",  texto: "30 días de garantía sin preguntas." },
  { icono: <IconRefresh />, titulo: "Primer cambio gratis",   texto: "Si la talla no te queda perfecta, la cambiamos." },
  { icono: <IconPin />,     titulo: "Envíos en Medellín",     texto: "Entrega rápida a domicilio en Medellín y el Valle de Aburrá." },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

export default function Carrito() {
  useThemeScope("sw-scope-carrito");
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

  // ── NUEVO: opciones estándar (2,3,4,6,9,12,18,24,36) filtradas por lo que
  // el total permita — si ninguna calza, no se muestra la opción de cuotas. ──
  const opcionesCuotas = opcionesCuotasDisponibles(total);
  const numCuotasActivo = opcionesCuotas.includes(numCuotas) ? numCuotas : (opcionesCuotas[0] || numCuotas);
  const tipoPagoActivo = (opcionesCuotas.length === 0 && tipoPago === "cuotas") ? "completo" : tipoPago;

  // Calcular valor de cada cuota y sus fechas de vencimiento
  const valorCuota = tipoPagoActivo === "cuotas" ? Math.ceil(total / numCuotasActivo) : null;
  const fechasCuotas = tipoPagoActivo === "cuotas" ? calcularFechasVencimiento(new Date(), numCuotasActivo, total) : [];

  // ── CORREGIDO: antes esta página exigía sesión solo para VER el carrito,
  // lo cual es más estricto que la regla de negocio ("Exigir inicio de sesión
  // únicamente al momento de finalizar la compra"). El carrito ahora se puede
  // ver y armar sin sesión; el login se pide recién al hacer clic en
  // "Finalizar compra" (ver irACheckout más abajo). ──

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
          {usuario && (
            <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
              Mis pedidos
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Ir a checkout ─────────────────────────────────────────────────────
  const irACheckout = () => {
    // ── NUEVO: aquí es donde de verdad se exige iniciar sesión — no antes,
    // al solo ver o armar el carrito. ──
    if (!usuario) {
      navigate("/login");
      return;
    }
    yendoACheckout.current = true;
    // Guardar tipo de pago en sessionStorage para pasarlo al checkout
    sessionStorage.setItem("tipoPago", tipoPagoActivo);
    sessionStorage.setItem("numCuotas", numCuotasActivo);
    navigate("/checkout");
  };

  // ── Vista principal ───────────────────────────────────────────────────
  const referencias = items.length;

  return (
    <div className="carrito-page">
      <nav className="carrito-breadcrumb">
        <span onClick={() => navigate("/catalogo")}>Inicio</span>
        <span className="carrito-breadcrumb-sep">/</span>
        <span className="carrito-breadcrumb-actual">Bolsa de compra</span>
      </nav>

      <div className="carrito-header">
        <div className="carrito-header-left">
          <h1 className="carrito-titulo">Carrito de compras</h1>
          <span className="carrito-contador">
            {totalItems} {totalItems === 1 ? "producto" : "productos"}
          </span>
        </div>
        {usuario && (
          <button className="btn btn-outline carrito-btn-mis-pedidos" onClick={() => navigate("/dashboard")}>
            <IconReceipt /> Mis pedidos
          </button>
        )}
      </div>

      <div className="carrito-layout">
        {/* Lista de productos */}
        <div className="carrito-lista">
          {items.map((item) => {
            const agotado = (item.stock ?? 0) <= 0;
            return (
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
                  <div className="carrito-item-meta">
                    {item.categoria && <span className="carrito-item-cat">{item.categoria}</span>}
                    <span className={`carrito-item-stock${agotado ? " agotado" : ""}`}>
                      <span className="carrito-item-stock-dot" />
                      {agotado ? "Sin stock" : "En inventario"}
                    </span>
                  </div>
                  <div className="carrito-item-nombre">{item.nombre}</div>
                  <div className="carrito-item-detalles">
                    {item.talla && <span>Talla: <strong>{item.talla}</strong></span>}
                    {item.color && <span>Color: <strong>{item.color}</strong></span>}
                  </div>
                </div>

                <div className="carrito-item-derecha">
                  <button
                    className="carrito-item-eliminar"
                    onClick={() => eliminarItem(item.id_variante ?? item.id)}
                    title="Eliminar producto"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>

                  <div className="carrito-item-cantidad">
                    <button
                      className="carrito-qty-btn"
                      onClick={() => actualizarCantidad(item.id_variante ?? item.id, item.cantidad - 1)}
                    >−</button>
                    <span className="carrito-qty-num">{item.cantidad}</span>
                    <button
                      className="carrito-qty-btn"
                      onClick={() => actualizarCantidad(item.id_variante ?? item.id, item.cantidad + 1)}
                      disabled={item.cantidad >= (item.stock ?? 0)}
                    >+</button>
                  </div>

                  <div className="carrito-item-precio-wrap">
                    <span className="carrito-item-precio">{fmt(item.precio * item.cantidad)}</span>
                    <span className="carrito-item-precio-unit">({fmt(item.precio)} c/u)</span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="carrito-lista-footer">
            <button className="carrito-vaciar" onClick={vaciarCarrito}>
              <IconTrash /> Vaciar carrito por completo
            </button>
            <span className="carrito-nota-precios">Precios en pesos colombianos (COP), IVA incluido</span>
          </div>

          <div className="carrito-beneficios">
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className="carrito-beneficio">
                <span className="carrito-beneficio-icono">{b.icono}</span>
                <div>
                  <div className="carrito-beneficio-titulo">{b.titulo}</div>
                  <div className="carrito-beneficio-texto">{b.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen */}
        <div className="carrito-resumen">
          <div className="carrito-resumen-header">
            <h2 className="carrito-resumen-titulo">Resumen del pedido</h2>
            <span className="carrito-resumen-badge">
              {referencias} {referencias === 1 ? "Referencia" : "Referencias"}
            </span>
          </div>

          <div className="carrito-resumen-lineas">
            {items.map((item) => (
              <div key={item.id_variante ?? item.id} className="carrito-resumen-linea">
                <span>{item.nombre} × {item.cantidad}</span>
                <span>{fmt(item.precio * item.cantidad)}</span>
              </div>
            ))}
          </div>

          <div className="carrito-resumen-divider" />

          <div className="carrito-resumen-linea">
            <span>Subtotal general</span>
            <span>{fmt(total)}</span>
          </div>
          <div className="carrito-resumen-linea">
            <span>Envío a domicilio</span>
            <span className="carrito-envio-gratis">GRATIS</span>
          </div>

          <div className="carrito-resumen-divider" />

          <div className="carrito-resumen-total">
            <div>
              <span className="carrito-resumen-total-label">Total a pagar</span>
              <span className="carrito-resumen-total-nota">Impuestos incluidos</span>
            </div>
            <div className="carrito-resumen-total-precio">
              {fmt(total)} <span className="carrito-resumen-total-moneda">COP</span>
            </div>
          </div>

          {usuario && permisoCuotas && (
            <div className="carrito-opcion-pago">
              <label className="carrito-opcion-pago-label">Opción de pago preferida</label>

              <button
                type="button"
                className={`carrito-opcion-card${tipoPago === "completo" ? " selected" : ""}`}
                onClick={() => setTipoPago("completo")}
              >
                {tipoPago === "completo" && <span className="carrito-opcion-check"><IconCheckSm /></span>}
                <span className="carrito-opcion-radio" />
                <span className="carrito-opcion-info">
                  <span className="carrito-opcion-titulo">Pago completo</span>
                </span>
                <span className="carrito-opcion-badge">Inmediato</span>
              </button>

              {opcionesCuotas.length > 0 && (
                <button
                  type="button"
                  className={`carrito-opcion-card${tipoPago === "cuotas" ? " selected" : ""}`}
                  onClick={() => setTipoPago("cuotas")}
                >
                  {tipoPago === "cuotas" && <span className="carrito-opcion-check"><IconCheckSm /></span>}
                  <span className="carrito-opcion-radio" />
                  <span className="carrito-opcion-info">
                    <span className="carrito-opcion-titulo">Pagar en cuotas</span>
                    <span className="carrito-opcion-desc">Sin tarjeta, con fechas de pago fijas</span>
                  </span>
                  <span className="carrito-opcion-badge">0% interés*</span>
                </button>
              )}

              {tipoPagoActivo === "cuotas" && (
                <div className="carrito-cuotas-detalle">
                  <label className="carrito-cuotas-label">Número de cuotas:</label>
                  <Select value={numCuotasActivo} onChange={(e) => setNumCuotas(Number(e.target.value))}>
                    {opcionesCuotas.map((n) => (
                      <option key={n} value={n}>{n} cuotas de {fmt(Math.ceil(total / n))}</option>
                    ))}
                  </Select>
                  <div style={{ marginTop: '14px' }}>
                    <CuotasCalendario
                      tipoPagoActivo={tipoPagoActivo} total={total} numCuotasActivo={numCuotasActivo}
                      valorCuota={valorCuota} fechasCuotas={fechasCuotas}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <button className="btn btn-primary carrito-btn-full" onClick={irACheckout}>
            Finalizar compra <IconArrowRight />
          </button>

          <button className="btn btn-outline carrito-btn-full" onClick={() => navigate("/catalogo")}>
            Seguir comprando
          </button>
        </div>
      </div>
    </div>
  );
}