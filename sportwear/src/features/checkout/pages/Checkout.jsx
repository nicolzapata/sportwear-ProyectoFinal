// src/pages/checkout/Checkout.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useCart } from "../../../shared/contexts/CartContext";
import api from "../../../shared/services/api";
import PaymentModal from "../../ventas/components/PaymentModal";
import "./Checkout.css";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

// ── NUEVO: monto mínimo permitido para un abono/cuota — evita que una
// cuota termine siendo de $1 o cualquier valor sin sentido frente al
// precio real de los productos. ──
const MONTO_MINIMO_ABONO = 20000;

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['D','L','M','X','J','V','S'];

// ── Etiquetas más descriptivas para los métodos de pago conocidos — si el
// admin agrega uno nuevo que no esté aquí, se usa su nombre tal cual. ──
const ETIQUETAS_METODO = {
  Efectivo: "Efectivo (contra entrega)",
  Transferencia: "Transferencia bancaria",
};

// ── Mini calendario por cuota ─────────────────────────────────────────────
function MiniCalendario({ fecha, cuota, monto }) {
  const anio      = fecha.getFullYear();
  const mes       = fecha.getMonth();
  const diaPago   = fecha.getDate();
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const hoy       = new Date();

  return (
    <div className="cal-cuota">
      <div className="cal-cuota-header">
        <span className="cal-cuota-badge">Cuota {cuota}</span>
        <p className="cal-cuota-mes">{MESES[mes]} {anio}</p>
      </div>
      <div className="cal-cuota-grid">
        {DIAS.map(d => (
          <div key={d} className="cal-dia-nombre">{d}</div>
        ))}
        {Array.from({ length: primerDia }).map((_, e) => <div key={`e${e}`} />)}
        {Array.from({ length: diasEnMes }, (_, idx) => {
          const d = idx + 1;
          const esHoy  = hoy.getFullYear() === anio && hoy.getMonth() === mes && hoy.getDate() === d;
          const esPago = d === diaPago;
          return (
            <div key={d} className={`cal-dia${esPago ? " cal-dia--pago" : esHoy ? " cal-dia--hoy" : ""}`}>
              {d}
            </div>
          );
        })}
      </div>
      <p className="cal-cuota-monto">{fmt(monto)}</p>
      <p className="cal-cuota-fecha">
        {fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}

// ── Calcular fechas de cuotas (retorna objetos Date) ──────────────────────
function getFechasCuotas(numCuotas) {
  const fechasDate = [];
  const hoy = new Date();
  const dia = hoy.getDate();
  for (let i = 0; i < numCuotas; i++) {
    let fecha;
    if (i === 0) {
      fecha = dia < 15
        ? new Date(hoy.getFullYear(), hoy.getMonth(), 15)
        : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    } else {
      const ant = fechasDate[i - 1];
      fecha = ant.getDate() === 15
        ? new Date(ant.getFullYear(), ant.getMonth() + 1, 0)
        : new Date(ant.getFullYear(), ant.getMonth() + 1, 15);
    }
    fechasDate.push(fecha);
  }
  return fechasDate;
}

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

  // ── Bloque reutilizable de la alerta de stock + sugerencias ──
  const AlertaStock = errorStock && (
    <div className="checkout-stock-alerta">
      <p className="checkout-stock-alerta-titulo">
        Sin stock suficiente de "{errorStock.producto}" — pediste {errorStock.solicitado}, hay {errorStock.disponible} disponibles.
      </p>
      {errorStock.alternativas?.length > 0 ? (
        <>
          <p className="checkout-stock-alerta-sub">Elige otra opción disponible para reemplazarla:</p>
          <div className="checkout-stock-alternativas">
            {errorStock.alternativas.map((alt) => (
              <button
                key={alt.id_variante}
                type="button"
                className="checkout-stock-alt-btn"
                onClick={() => elegirAlternativa(alt)}
              >
                {alt.talla}{alt.color ? ` · ${alt.color}` : ""}
                <span className="checkout-stock-alt-stock">{alt.stock} disp.</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="checkout-stock-alerta-sub">
          No hay otras tallas o colores disponibles para este producto ahora mismo. Ajusta la cantidad o quítalo del carrito e inténtalo de nuevo.
        </p>
      )}
    </div>
  );

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
        {/* Lista de productos */}
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

        {/* Panel derecho — todos los datos y la confirmación en un solo lugar */}
        <div className="checkout-panel">
          <h2 className="checkout-section-titulo">Datos del pedido</h2>

          <div className="checkout-campo">
            <label className="checkout-label">Cliente</label>
            <div className="checkout-valor">{usuario?.nombre}</div>
          </div>
          <div className="checkout-campo">
            <label className="checkout-label">Correo</label>
            <div className="checkout-valor">{usuario?.email ?? usuario?.correo ?? "—"}</div>
          </div>
          <div className="checkout-campo">
            <label className="checkout-label">Dirección de entrega</label>
            <input
              type="text"
              className={`form-control${erroresPaso.direccion ? " input-error" : ""}`}
              value={direccion}
              onChange={(e) => {
                setDireccion(e.target.value);
                if (erroresPaso.direccion) setErroresPaso((prev) => ({ ...prev, direccion: "" }));
              }}
              placeholder="Cra 70 # 48-15 Apto 201, Medellín"
            />
            {erroresPaso.direccion && <div className="checkout-error-message">{erroresPaso.direccion}</div>}
          </div>

          {/* ── NUEVO: Ciudad fija + Barrio (antes vivían en el registro) ── */}
          <div className="checkout-campo">
            <label className="checkout-label">Ciudad</label>
            <div className="checkout-valor">Medellín</div>
            <p className="checkout-aviso-domicilios">Por ahora solo hacemos domicilios en Medellín.</p>
          </div>
          <div className="checkout-campo">
            <label className="checkout-label">Barrio</label>
            {cargandoBarrios ? (
              <div className="checkout-valor">Cargando barrios...</div>
            ) : (
              <select
                className={`form-control${erroresPaso.barrio ? " input-error" : ""}`}
                value={idBarrio}
                onChange={(e) => {
                  setIdBarrio(e.target.value);
                  if (erroresPaso.barrio) setErroresPaso((prev) => ({ ...prev, barrio: "" }));
                }}
              >
                <option value="">Selecciona tu barrio...</option>
                {barrios.map((b) => (
                  <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>
                ))}
              </select>
            )}
            {erroresPaso.barrio && <div className="checkout-error-message">{erroresPaso.barrio}</div>}
          </div>
          <div className="checkout-campo">
            <label className="checkout-label">Método de pago</label>
            {cargandoMetodos ? (
              <div className="checkout-valor">Cargando métodos de pago...</div>
            ) : metodosPago.length === 0 ? (
              <p className="checkout-error-message">No hay métodos de pago habilitados en este momento. Contáctanos para completar tu pedido.</p>
            ) : (
              <select
                className={`form-control${erroresPaso.metodo ? " input-error" : ""}`}
                value={metodo}
                onChange={(e) => {
                  setMetodo(e.target.value);
                  if (erroresPaso.metodo) setErroresPaso((prev) => ({ ...prev, metodo: "" }));
                }}
              >
                {metodosPago.map((m) => (
                  <option key={m.id_metodo} value={m.nombre}>
                    {ETIQUETAS_METODO[m.nombre] || m.nombre}
                  </option>
                ))}
              </select>
            )}
            {erroresPaso.metodo && <div className="checkout-error-message">{erroresPaso.metodo}</div>}
          </div>

          {permisoCuotas && (
            <div className="checkout-campo" style={{ marginTop: 15 }}>
              <label className="checkout-label">Opción de pago</label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 5 }}>
                <input type="radio" name="tipoPago2" value="completo" checked={tipoPago === "completo"} onChange={() => setTipoPago("completo")} />
                Pago completo
              </label>
              {opcionesCuotas.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 5 }}>
                  <input type="radio" name="tipoPago2" value="cuotas" checked={tipoPago === "cuotas"} onChange={() => setTipoPago("cuotas")} />
                  Pagar en cuotas
                </label>
              )}
              {tipoPagoActivo === "cuotas" && (
                <div style={{ marginTop: 10, paddingLeft: 24 }}>
                  <label className="checkout-label">Número de cuotas</label>
                  <select value={numCuotasActivo} onChange={(e) => setNumCuotas(Number(e.target.value))} className="form-control" style={{ marginTop: 4 }}>
                    {opcionesCuotas.map((n) => (
                      <option key={n} value={n}>{n} cuotas de {fmt(Math.ceil(total / n))}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="checkout-divider" />

          <div className="checkout-resumen-lineas">
            {items.map((item) => (
              <div key={item.id_variante ?? item.id} className="checkout-resumen-linea">
                <span>{item.nombre} × {item.cantidad}</span>
                <span>{fmt(item.precio * item.cantidad)}</span>
              </div>
            ))}
          </div>

          <div className="checkout-divider" />

          <div className="checkout-total">
            <span>{tipoPagoActivo === "cuotas" ? `Total cuota (1/${numCuotasActivo})` : "Total a pagar"}</span>
            <span>{fmt(tipoPagoActivo === "cuotas" ? valorCuota : total)}</span>
          </div>

          {tipoPagoActivo === "cuotas" && (
            <>
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
                Total del pedido: {fmt(total)} en {numCuotasActivo} cuotas de {fmt(valorCuota)}
              </p>
              <label className="checkout-label" style={{ marginBottom: 8 }}>Fechas de pago</label>
              <div className="cal-cuotas-wrap">
                {fechasCuotas.map((fecha, i) => (
                  <MiniCalendario key={i} fecha={fecha} cuota={i + 1} monto={valorCuota} />
                ))}
              </div>
            </>
          )}

          {error && <p className="checkout-error">{error}</p>}
          {AlertaStock}

          <button
            className="checkout-btn-primary"
            style={{ width: "100%", marginTop: 16 }}
            onClick={handleConfirmar}
            disabled={enviando || metodosPago.length === 0}
          >
            {enviando ? "Procesando..." : "Confirmar pedido"}
          </button>

          <button className="btn btn-outline" style={{ width: "100%", marginTop: 10 }} onClick={() => navigate("/carrito")} disabled={enviando}>
            Volver al carrito
          </button>
        </div>
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