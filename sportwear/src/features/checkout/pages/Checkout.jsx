// src/pages/checkout/Checkout.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useCart } from "../../../shared/contexts/CartContext";
import api from "../../../shared/services/api";
import PaymentModal from "../../ventas/components/PaymentModal";
// Checkout.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import "./Checkout.layout.css";
import "./Checkout.cuotas.css";
import ProductosList from "../components/checkout/ProductosList";
import CheckoutPanel from "../components/checkout/CheckoutPanel";
import { MONTO_MINIMO_ABONO, getFechasCuotas } from "../utils/checkoutHelpers";

export default function Checkout() {
  const { usuario }                                    = useAuth();
  const { items, total, vaciarCarrito, eliminarItem, cambiarVariante } = useCart();
  const navigate                                       = useNavigate();

  const [direccion,     setDireccion]     = useState(() => {
    const s = sessionStorage.getItem("direccion");
    return s ?? "";
  });
  // ── NUEVO (Carrito/Finalizar compra): Ciudad y Barrio ya no se piden en el
  // registro — se preguntan aquí. Ciudad es fija (solo hacemos domicilios en
  // Medellín, se avisa en el formulario); Barrio sí se elige de una lista real. ──
  const [idBarrio,      setIdBarrio]      = useState("");
  const [barrios,       setBarrios]       = useState([]);
  const [cargandoBarrios, setCargandoBarrios] = useState(true);
  const [metodo,        setMetodo]        = useState("");
  const [enviando,      setEnviando]      = useState(false);
  const [exito,         setExito]         = useState(false);
  const [error,         setError]         = useState("");
  // ── NUEVO (HU 04.3.4): cuando el backend rechaza por falta de stock, trae
  // sugerencias de otras tallas/colores del mismo producto que sí alcanzan. ──
  const [errorStock,    setErrorStock]    = useState(null);
  const [permisoCuotas, setPermisoCuotas] = useState(true);
  // ── NUEVO: métodos de pago habilitados por el admin — si no está activo
  // aquí, no debe poder elegirse en el checkout. ──
  const [metodosPago,   setMetodosPago]   = useState([]);
  const [cargandoMetodos, setCargandoMetodos] = useState(true);
  const [tipoPago,      setTipoPago]      = useState(() => {
    const s = sessionStorage.getItem("tipoPago");
    return s && s !== "cuotas" ? s : "completo";
  });
  const [numCuotas,     setNumCuotas]     = useState(() => {
    const s = sessionStorage.getItem("numCuotas");
    return s ? Number(s) : 2;
  });
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
  // ── Errores de validación del panel único (antes vivían repartidos entre los 4 pasos del modal) ──
  const [erroresPaso, setErroresPaso] = useState({});

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;
    api.get("/clientes/mi-perfil")
      .then(({ data }) => {
        if (cancelado || !data) return;
        setDireccion(data.direccion ?? "");
        setPermisoCuotas(data.permiso_cuotas !== false);
      })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [usuario]);

  // ── NUEVO: carga la lista de barrios (para el dropdown de la dirección de
  // entrega). Público, se puede pedir siempre. ──
  useEffect(() => {
    let cancelado = false;
    api.get("/barrios")
      .then(({ data }) => { if (!cancelado) setBarrios(data || []); })
      .catch(() => setBarrios([]))
      .finally(() => { if (!cancelado) setCargandoBarrios(false); });
    return () => { cancelado = true; };
  }, []);

  // ── NUEVO: carga los métodos de pago activos y preselecciona el primero.
  // Público (no exige sesión), así que se puede pedir siempre, sin depender
  // de "usuario" como el efecto de arriba. ──
  useEffect(() => {
    let cancelado = false;
    api.get("/metodos-pago?activos=1")
      .then(({ data }) => {
        if (cancelado) return;
        setMetodosPago(data || []);
        setMetodo(prev => {
          if (prev && (data || []).some(m => m.nombre === prev)) return prev;
          return data?.[0]?.nombre ?? "";
        });
      })
      .catch(() => setMetodosPago([]))
      .finally(() => { if (!cancelado) setCargandoMetodos(false); });
    return () => { cancelado = true; };
  }, []);

  // ── NUEVO: solo se ofrecen las cuotas cuyo valor por cuota alcance el
  // mínimo permitido — si el total es tan bajo que ni 2 cuotas lo cumplen,
  // no se ofrece la opción de cuotas en absoluto (solo pago completo). ──
  const opcionesCuotas = [2, 3].filter((n) => Math.ceil(total / n) >= MONTO_MINIMO_ABONO);
  const tipoPagoActivo = ((!permisoCuotas || opcionesCuotas.length === 0) && tipoPago === "cuotas") ? "completo" : tipoPago;

  // Si el número de cuotas guardado ya no es una opción válida (p. ej. cambió
  // el contenido del carrito), se usa la primera opción disponible.
  const numCuotasActivo = opcionesCuotas.includes(numCuotas) ? numCuotas : (opcionesCuotas[0] || numCuotas);

  const fechasCuotas = tipoPagoActivo === "cuotas" ? getFechasCuotas(numCuotasActivo) : [];
  const valorCuota   = Math.ceil(total / numCuotasActivo);

  // ── Aplica la variante alternativa elegida al ítem del carrito que no tenía stock ──
  const elegirAlternativa = (alt) => {
    if (!errorStock) return;
    cambiarVariante(errorStock.id_variante_solicitada, {
      id_variante: alt.id_variante,
      talla:       alt.talla,
      color:       alt.color,
      stock:       alt.stock,
    });
    setErrorStock(null);
  };

  // ── Validación del panel único (antes repartida en validarPasoEntrega/validarPasoPago del modal) ──
  const validarFormulario = () => {
    const e = {};
    if (!direccion.trim()) e.direccion = "La dirección es obligatoria para continuar.";
    if (!idBarrio)         e.barrio    = "Selecciona el barrio para continuar.";
    if (!metodo.trim())    e.metodo    = "Selecciona un método de pago antes de continuar.";
    setErroresPaso(e);
    return Object.keys(e).length === 0;
  };

  // ── Carrito vacío ────────────────────────────────────────────────────────
  if (items.length === 0 && !exito) {
    return (
      <div className="checkout-vacio">
        <p>No tienes productos en el carrito.</p>
        <button className="btn btn-outline" onClick={() => navigate("/catalogo")}>
          Ir al catálogo
        </button>
      </div>
    );
  }

  // ── Confirmar pedido ──────────────────────────────────────────────────────
  const handleConfirmar = async () => {
    if (!usuario) { navigate("/login"); return; }
    if (!validarFormulario()) return;

    const itemsSinVariante = items.filter((i) => !i.id_variante);
    if (itemsSinVariante.length > 0) {
      itemsSinVariante.forEach(item => eliminarItem(item.id_variante ?? item.id));
      setError("Algunos productos sin variante fueron eliminados del carrito. Intenta de nuevo.");
      return;
    }

    setEnviando(true);
    setError("");
    setErrorStock(null);

    const tipoPagoFinal = ((!permisoCuotas || opcionesCuotas.length === 0) && tipoPago === "cuotas") ? "completo" : tipoPago;

    if (tipoPago === "cuotas" && !permisoCuotas) {
      setError("No tienes permiso para pagar por cuotas. Se cambiará a pago completo.");
    }

    const hoy = new Date().toISOString().split("T")[0];

    try {
      const { data: pedido } = await api.post("/ventas/mi-pedido", {
        total,
        estado:            "Confirmado",
        fecha:             hoy,
        direccion_entrega: direccion,
        id_barrio:         idBarrio ? Number(idBarrio) : null,
        metodo_pago:       metodo,
        tipo_pago:         tipoPagoFinal,
        num_cuotas:        tipoPagoFinal === "cuotas" ? numCuotasActivo : null,
        items: items.map((i) => ({
          id_producto: i.id,
          id_variante: i.id_variante,
          cantidad:    i.cantidad,
          precio:      i.precio,
        })),
      });

      setPedidoConfirmado(pedido);
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      // ── Si el error trae alternativas de stock, se muestran para elegir en vez
      // de solo un mensaje genérico de error. ──
      if (data?.alternativas) {
        setErrorStock(data);
        setError("");
      } else {
        setError(data?.message ?? "Hubo un error al procesar tu pedido. Intenta de nuevo.");
        setErrorStock(null);
      }
    } finally {
      setEnviando(false);
    }
  };

  const handlePagoConfirmado = () => {
    vaciarCarrito();
    setPedidoConfirmado(null);
    setExito(true);
  };

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (exito) {
    return (
      <div className="checkout-exito">
        <div className="checkout-exito-icono">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h2 className="checkout-exito-titulo">¡Pedido confirmado!</h2>
        <p className="checkout-exito-texto">
          Tu pedido fue registrado exitosamente. Pronto nos pondremos en contacto contigo.
        </p>
        <button className="checkout-btn-primary" onClick={() => navigate("/catalogo")}>
          Seguir comprando
        </button>
      </div>
    );
  }

  // ── Vista principal — un solo panel, sin modal de pasos ─────────────────────
  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <h1 className="checkout-titulo">Confirmar pedido</h1>
      </div>

      <div className="checkout-layout">
        <ProductosList items={items} />

        <CheckoutPanel
          usuario={usuario} items={items}
          direccion={direccion} setDireccion={setDireccion} erroresPaso={erroresPaso} setErroresPaso={setErroresPaso}
          cargandoBarrios={cargandoBarrios} barrios={barrios} idBarrio={idBarrio} setIdBarrio={setIdBarrio}
          cargandoMetodos={cargandoMetodos} metodosPago={metodosPago} metodo={metodo} setMetodo={setMetodo}
          permisoCuotas={permisoCuotas} tipoPago={tipoPago} setTipoPago={setTipoPago} opcionesCuotas={opcionesCuotas}
          tipoPagoActivo={tipoPagoActivo} numCuotasActivo={numCuotasActivo} setNumCuotas={setNumCuotas}
          total={total} valorCuota={valorCuota} fechasCuotas={fechasCuotas}
          error={error} errorStock={errorStock} elegirAlternativa={elegirAlternativa}
          enviando={enviando} handleConfirmar={handleConfirmar} navigate={navigate}
        />
      </div>

      {/* ── Modal de Pago (después de confirmar pedido) ── */}
      {pedidoConfirmado && (
        <PaymentModal
          pedido={pedidoConfirmado}
          cliente={{ ...usuario, permiso_cuotas: permisoCuotas }}
          onClose={() => setPedidoConfirmado(null)}
          onPagoConfirmado={handlePagoConfirmado}
        />
      )}
    </div>
  );
}
