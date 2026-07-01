// src/pages/checkout/Checkout.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import api from "../../services/api";
import ModalSteps from "../../components/ModalSteps";
import PaymentModal from "../../components/PaymentModal";
import "./Checkout.css";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS  = ['D','L','M','X','J','V','S'];

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
  const { items, total, vaciarCarrito, eliminarItem }  = useCart();
  const navigate                                       = useNavigate();

  const [direccion,     setDireccion]     = useState(() => {
    const s = sessionStorage.getItem("direccion");
    return s ?? "";
  });
  const [metodo,        setMetodo]        = useState("Transferencia");
  const [enviando,      setEnviando]      = useState(false);
  const [exito,         setExito]         = useState(false);
  const [error,         setError]         = useState("");
  const [permisoCuotas, setPermisoCuotas] = useState(true);
  const [tipoPago,      setTipoPago]      = useState(() => {
    const s = sessionStorage.getItem("tipoPago");
    return s && s !== "cuotas" ? s : "completo";
  });
  const [numCuotas,     setNumCuotas]     = useState(() => {
    const s = sessionStorage.getItem("numCuotas");
    return s ? Number(s) : 2;
  });
const [stepModal,     setStepModal]     = useState(() => true);
const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

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

  const tipoPagoActivo = (!permisoCuotas && tipoPago === "cuotas") ? "completo" : tipoPago;

  const fechasCuotas = tipoPagoActivo === "cuotas" ? getFechasCuotas(numCuotas) : [];
  const valorCuota   = Math.ceil(total / numCuotas);

  // ── Paso 1: Productos ─────────────────────────────────────────────────────
  const PasoProductos = (
    <div className="checkout-productos-modal">
      <h3>Productos a comprar</h3>
      {items.map((item) => (
        <div key={item.id_variante ?? item.id} className="checkout-item-modal">
          <span>{item.nombre} × {item.cantidad}</span>
          <span>{fmt(item.precio * item.cantidad)}</span>
        </div>
      ))}
      <div className="checkout-total-modal">
        <span>Total pedido:</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  );

  // ── Paso 2: Entrega ───────────────────────────────────────────────────────
  const PasoEntrega = (
    <div className="checkout-campos-modal">
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
            if (erroresPaso.direccion) setErroresPaso(prev => ({ ...prev, direccion: "" }));
          }}
          placeholder="Cra 70 # 48-15 Apto 201, Medellín"
        />
        {erroresPaso.direccion && <div className="checkout-error-message">{erroresPaso.direccion}</div>}
      </div>
    </div>
  );

  // ── Paso 3: Pago ──────────────────────────────────────────────────────────
  const PasoPago = (
    <div className="checkout-campos-modal">
      <div className="checkout-campo">
        <label className="checkout-label">Método de pago</label>
        <select
          className={`form-control${erroresPaso.metodo ? " input-error" : ""}`}
          value={metodo}
          onChange={(e) => {
            setMetodo(e.target.value);
            if (erroresPaso.metodo) setErroresPaso(prev => ({ ...prev, metodo: "" }));
          }}
        >
          <option value="Transferencia">Tarjeta débito</option>
          <option value="Tarjeta">Tarjeta crédito</option>
        </select>
        {erroresPaso.metodo && <div className="checkout-error-message">{erroresPaso.metodo}</div>}
      </div>

      {permisoCuotas && (
        <div className="checkout-campo" style={{ marginTop: 15 }}>
          <label className="checkout-label">Opción de pago</label>
          <label className="tipo-pago-option">
            <input type="radio" name="tipoPago" value="completo" checked={tipoPago === "completo"} onChange={() => setTipoPago("completo")} />
            <span className="tipo-pago-custom" />
            Pago completo
          </label>
          <label className="tipo-pago-option">
            <input type="radio" name="tipoPago" value="cuotas" checked={tipoPago === "cuotas"} onChange={() => setTipoPago("cuotas")} />
            <span className="tipo-pago-custom" />
            Pagar en cuotas
          </label>
          {tipoPagoActivo === "cuotas" && (
            <div style={{ marginTop: 10, paddingLeft: 26 }}>
              <label className="checkout-label">Número de cuotas</label>
              <select value={numCuotas} onChange={(e) => setNumCuotas(Number(e.target.value))} className="form-control" style={{ marginTop: 4 }}>
                <option value={2}>2 cuotas de {fmt(Math.ceil(total / 2))}</option>
                <option value={3}>3 cuotas de {fmt(Math.ceil(total / 3))}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {!metodo && (
        <div className="checkout-error-message">Selecciona un método de pago antes de continuar.</div>
      )}
    </div>
  );

  // ── Paso 4: Resumen / Total cuota ─────────────────────────────────────────
  const PasoResumen = (
    <div className="checkout-campos-modal">
      {/* Total */}
      {tipoPagoActivo === "cuotas" ? (
        <>
          <div className="checkout-total">
            <span>Total cuota (1/{numCuotas})</span>
            <span>{fmt(valorCuota)}</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
            Total del pedido: {fmt(total)} en {numCuotas} cuotas de {fmt(valorCuota)}
          </p>
          {/* Calendarios de cuotas */}
          <label className="checkout-label" style={{ marginBottom: 8 }}>Fechas de pago</label>
          <div className="cal-cuotas-wrap">
            {fechasCuotas.map((fecha, i) => (
              <MiniCalendario key={i} fecha={fecha} cuota={i + 1} monto={valorCuota} />
            ))}
          </div>
        </>
      ) : (
        <div className="checkout-total">
          <span>Total a pagar</span>
          <span>{fmt(total)}</span>
        </div>
      )}

      {error && <p className="checkout-error">{error}</p>}
    </div>
  );

  const validarPasoEntrega = () => {
    if (!direccion.trim()) {
      setErroresPaso(prev => ({ ...prev, direccion: "La dirección es obligatoria para continuar." }));
      return false;
    }
    setErroresPaso(prev => ({ ...prev, direccion: "" }));
    return true;
  };

  const validarPasoPago = () => {
    if (!metodo.trim()) {
      setErroresPaso(prev => ({ ...prev, metodo: "Selecciona un método de pago antes de continuar." }));
      return false;
    }
    setErroresPaso(prev => ({ ...prev, metodo: "" }));
    return true;
  };

  const confirmarDesdeModal = async () => {
    console.log("Confirmando pedido...", { usuario, items, direccion, metodo });
    try {
      await handleConfirmar();
      setStepModal(false);
    } catch (err) {
      console.error("Error en confirmarDesdeModal:", err);
    }
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

    const itemsSinVariante = items.filter((i) => !i.id_variante);
    if (itemsSinVariante.length > 0) {
      itemsSinVariante.forEach(item => eliminarItem(item.id_variante ?? item.id));
      setError("Algunos productos sin variante fueron eliminados del carrito. Intenta de nuevo.");
      return;
    }

    setEnviando(true);
    setError("");

    const tipoPagoFinal = (!permisoCuotas && tipoPago === "cuotas") ? "completo" : tipoPago;

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
        metodo_pago:       metodo,
        tipo_pago:         tipoPagoFinal,
        num_cuotas:        tipoPagoFinal === "cuotas" ? numCuotas : null,
        items: items.map((i) => ({
          id_producto: i.id,
          id_variante: i.id_variante,
          cantidad:    i.cantidad,
          precio:      i.precio,
        })),
      });
      
      setStepModal(false);
      setPedidoConfirmado(pedido);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message ?? "Hubo un error al procesar tu pedido. Intenta de nuevo.");
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

  // ── Vista principal ───────────────────────────────────────────────────────
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

        {/* Panel derecho */}
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
            <input type="text" className="form-control" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Cra 70 # 48-15 Apto 201, Medellín" />
          </div>
          <div className="checkout-campo">
            <label className="checkout-label">Método de pago</label>
            <select className="form-control" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="Transferencia">Transferencia bancaria</option>
              <option value="Tarjeta">Tarjeta débito / crédito</option>
            </select>
          </div>

          {permisoCuotas && (
            <div className="checkout-campo" style={{ marginTop: 15 }}>
              <label className="checkout-label">Opción de pago</label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 5 }}>
                <input type="radio" name="tipoPago2" value="completo" checked={tipoPago === "completo"} onChange={() => setTipoPago("completo")} />
                Pago completo
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 5 }}>
                <input type="radio" name="tipoPago2" value="cuotas" checked={tipoPago === "cuotas"} onChange={() => setTipoPago("cuotas")} />
                Pagar en cuotas
              </label>
              {tipoPagoActivo === "cuotas" && (
                <div style={{ marginTop: 10, paddingLeft: 24 }}>
                  <label className="checkout-label">Número de cuotas</label>
                  <select value={numCuotas} onChange={(e) => setNumCuotas(Number(e.target.value))} className="form-control" style={{ marginTop: 4 }}>
                    <option value={2}>2 cuotas de {fmt(Math.ceil(total / 2))}</option>
                    <option value={3}>3 cuotas de {fmt(Math.ceil(total / 3))}</option>
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
            <span>{tipoPagoActivo === "cuotas" ? `Total cuota (1/${numCuotas})` : "Total a pagar"}</span>
            <span>{fmt(tipoPagoActivo === "cuotas" ? valorCuota : total)}</span>
          </div>

          {tipoPagoActivo === "cuotas" && (
            <>
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
                Total del pedido: {fmt(total)} en {numCuotas} cuotas de {fmt(valorCuota)}
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

          <button className="btn btn-outline" style={{ width: "100%", marginTop: 16 }} onClick={() => navigate("/carrito")}>
            Volver al carrito
          </button>
        </div>
      </div>

      {/* ── Modal con 4 pasos ── */}
      {stepModal && (
        <ModalSteps
          titulo="Confirmar pedido"
          pasos={["Productos", "Entrega", "Pago", "Resumen"]}
          onClose={() => setStepModal(false)}
          onGuardar={confirmarDesdeModal}
          validaciones={[() => true, validarPasoEntrega, validarPasoPago, () => true]}
          labelGuardar="Confirmar pedido"
          guardando={enviando}
        >
          {PasoProductos}
          {PasoEntrega}
          {PasoPago}
          {PasoResumen}
        </ModalSteps>
      )}

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