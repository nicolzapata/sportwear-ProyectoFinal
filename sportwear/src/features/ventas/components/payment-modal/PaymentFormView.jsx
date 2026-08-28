import { useState } from "react";
import api from "../../../../shared/services/api";
import AceptarTerminos from "../../../../shared/components/AceptarTerminos";
import { fmt, formatCardNumber, formatExpiry, detectarMarca } from "../../utils/paymentModalHelpers";
import { IconX, IconCard, IconCalendar, IconAlert, IconCheckCircle, IconLock, IconCheckSm } from "./paymentModalIcons";

/* ══════════════════════════════════════════════
   VISTA: FORMULARIO DE PAGO
══════════════════════════════════════════════ */
export default function PaymentFormView({ pedido, cliente, onClose, onPagoConfirmado, setPagoRealizado }) {
  const [tipoPago, setTipoPago]     = useState("total");
  const [card, setCard]             = useState({ numero: "", nombre: "", expiry: "", cvv: "" });
  const [errores, setErrores]       = useState({});
  const [procesando, setProcesando] = useState(false);
  // ── NUEVO: el cliente debe aceptar los términos y condiciones antes de
  // poder confirmar el pago. ──
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  // ── NUEVO: la tarjeta se voltea mientras el CVV está enfocado ──
  const [cvvFocus, setCvvFocus]     = useState(false);
  const marca = detectarMarca(card.numero);

  const abonosConfirmados = pedido.abonos?.filter((a) => a.estado === "Confirmado") || [];
  const totalPagado      = Number(pedido.total_pagado || abonosConfirmados.reduce((acc, a) => acc + Number(a.monto), 0));
  const totalPedido      = Number(pedido.total || 0);
  const restante         = totalPedido - totalPagado;

  const cuotasPendientes = pedido.abonos?.filter((a) => a.estado === "Pendiente") || [];
  const proximaCuota    = cuotasPendientes[0] || null;

  const montoPagar = tipoPago === "total" ? restante : Number(proximaCuota?.monto || 0);

  const validar = () => {
    const e = {};
    if (card.numero.replace(/\s/g, "").length < 16) e.numero = "Número de tarjeta inválido";
    if (!card.nombre.trim())    e.nombre = "Ingresa el nombre del titular";
    if (card.expiry.length < 5) e.expiry = "Fecha inválida (MM/AA)";
    if (card.cvv.length < 3)    e.cvv    = "CVV inválido";
    if (montoPagar <= 0)        e.monto  = "No hay monto pendiente";
    if (!aceptaTerminos)        e.terminos = "Debes aceptar los términos y condiciones para continuar.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handlePagar = async () => {
    if (!validar()) return;
    setProcesando(true);

    try {
      let response;
      if (tipoPago === "cuota" && proximaCuota) {
        response = await api.post(`/pagos/cuota/${proximaCuota.id_pago}`, {
          metodo: "Tarjeta",
          referencia_pago: "PAY-" + Date.now().toString(36).toUpperCase()
        });
      } else {
        response = await api.post(`/pagos/venta/${pedido.id_venta}/total`, {
          metodo: "Tarjeta",
          referencia_pago: "PAY-" + Date.now().toString(36).toUpperCase()
        });
      }

      const nuevoPagado = tipoPago === "cuota"
        ? totalPagado + Number(proximaCuota.monto)
        : totalPedido;
      const estaCompleto = nuevoPagado >= totalPedido;

      const resultado = {
        montoPagado:      montoPagar,
        nuevoTotalPagado: nuevoPagado,
        restante:         Math.max(0, totalPedido - nuevoPagado),
        estaCompleto,
        tipoPago,
        cuotaPagada:      tipoPago === "cuota" ? proximaCuota : null,
        timestamp:        new Date(),
        referencia:       response.data.referencia_pago || "PAY-" + Date.now().toString(36).toUpperCase(),
      };

      if (onPagoConfirmado) {
        onPagoConfirmado({
          id_venta:         pedido.id_venta,
          montoPagado:      montoPagar,
          cuotaId:          tipoPago === "cuota" ? proximaCuota?.id_pago : null,
          estaCompleto,
          nuevoTotalPagado: nuevoPagado,
        });
      }

      setPagoRealizado(resultado);
    } catch (err) {
      console.error("Error al procesar pago:", err);
      setErrores({ monto: err.response?.data?.message || "Error al procesar el pago" });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <div className="pm-accent" />

      {/* Header */}
      <div className="pm-header">
        <div>
          <h2 className="pm-title">Realizar pago</h2>
          <p className="pm-subtitle">Pedido #{pedido.id_venta}</p>
        </div>
        <button className="pm-close" onClick={onClose}><IconX /></button>
      </div>

      {/* Resumen saldo */}
      <div className="pm-summary">
        <div className="pm-summary-row">
          <span>Total del pedido</span>
          <strong>{fmt(totalPedido)}</strong>
        </div>
        <div className="pm-summary-row">
          <span>Ya pagado</span>
          <strong className="pm-paid">{fmt(totalPagado)}</strong>
        </div>
        <div className="pm-summary-row pm-summary-row--highlight">
          <span>Saldo pendiente</span>
          <strong className="pm-debt">{fmt(restante)}</strong>
        </div>
      </div>

      {restante <= 0 ? (
        <div className="pm-already-paid">
          <IconCheckCircle />
          <p>Este pedido ya está completamente pagado.</p>
        </div>
      ) : (
        <>
          {/* Tipo de pago */}
          <div className="pm-section">
            <label className="pm-section-label">¿Qué deseas pagar?</label>
            <div className="pm-tipo-grid">
              <button
                className={`pm-tipo-btn${tipoPago === "total" ? " active" : ""}`}
                onClick={() => setTipoPago("total")}
              >
                {tipoPago === "total" && <span className="pm-tipo-check"><IconCheckSm /></span>}
                <span className="pm-tipo-icon"><IconCard /></span>
                <span className="pm-tipo-title">Total completo</span>
                <span className="pm-tipo-amount">{fmt(restante)}</span>
                <span className="pm-tipo-desc">Salda toda la deuda</span>
              </button>

              {cliente?.permiso_cuotas !== false && (
                proximaCuota ? (
                  <button
                    className={`pm-tipo-btn${tipoPago === "cuota" ? " active" : ""}`}
                    onClick={() => setTipoPago("cuota")}
                  >
                    {tipoPago === "cuota" && <span className="pm-tipo-check"><IconCheckSm /></span>}
                    <span className="pm-tipo-icon"><IconCalendar /></span>
                    <span className="pm-tipo-title">Cuota {proximaCuota.num_cuota}</span>
                    <span className="pm-tipo-amount">{fmt(proximaCuota.monto)}</span>
                    <span className="pm-tipo-desc">Siguiente cuota pendiente</span>
                  </button>
                ) : (
                  <div className="pm-tipo-btn pm-tipo-btn--disabled">
                    <span className="pm-tipo-icon"><IconCalendar /></span>
                    <span className="pm-tipo-title">Pago por cuota</span>
                    <span className="pm-tipo-desc">No hay cuotas pendientes</span>
                  </div>
                )
              )}
            </div>
            {errores.monto && <p className="pm-error"><IconAlert /> {errores.monto}</p>}
          </div>

          {/* Tarjeta de crédito */}
          <div className="pm-section">
            <div className="pm-section-label-row">
              <label className="pm-section-label"><IconCard /> Datos de tarjeta</label>
              <span className="pm-secure-badge"><IconLock /> Pago seguro y encriptado</span>
            </div>

            {/* Preview visual — se voltea al enfocar el CVV */}
            <div className="pm-card-3d">
              <div className={`pm-card-flipper${cvvFocus ? " pm-card-flipper--flipped" : ""}`}>
                <div className="pm-card-face pm-card-front">
                  <div className="pm-card-top-row">
                    <div className="pm-card-chip" />
                    {marca && (
                      <span className={`pm-card-brand pm-card-brand--${marca}`}>
                        {marca === "visa" ? "VISA" : marca === "mastercard" ? "mastercard" : "AMEX"}
                      </span>
                    )}
                  </div>
                  <div className="pm-card-number">
                    {card.numero || "•••• •••• •••• ••••"}
                  </div>
                  <div className="pm-card-bottom">
                    <div>
                      <div className="pm-card-field-label">Titular</div>
                      <div className="pm-card-field-value">
                        {card.nombre.toUpperCase() || "NOMBRE APELLIDO"}
                      </div>
                    </div>
                    <div>
                      <div className="pm-card-field-label">Vence</div>
                      <div className="pm-card-field-value">{card.expiry || "MM/AA"}</div>
                    </div>
                  </div>
                </div>
                <div className="pm-card-face pm-card-back">
                  <div className="pm-card-stripe" />
                  <div className="pm-card-signature-row">
                    <span className="pm-card-signature-label">Firma autorizada</span>
                    <div className="pm-card-cvv-box">
                      <span className="pm-card-cvv-value">{card.cvv || "•••"}</span>
                    </div>
                  </div>
                  {marca && (
                    <span className={`pm-card-brand pm-card-brand--${marca} pm-card-brand--back`}>
                      {marca === "visa" ? "VISA" : marca === "mastercard" ? "mastercard" : "AMEX"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="pm-form">
              <div className="pm-field pm-field--full">
                <label>Número de tarjeta</label>
                <input
                  className={errores.numero ? "error" : ""}
                  placeholder="1234 5678 9012 3456"
                  value={card.numero}
                  onChange={(e) => setCard({ ...card, numero: formatCardNumber(e.target.value) })}
                  maxLength={19}
                />
                {errores.numero && <span className="pm-field-error">{errores.numero}</span>}
              </div>
              <div className="pm-field pm-field--full">
                <label>Nombre del titular</label>
                <input
                  className={errores.nombre ? "error" : ""}
                  placeholder="Como aparece en la tarjeta"
                  value={card.nombre}
                  onChange={(e) => setCard({ ...card, nombre: e.target.value })}
                />
                {errores.nombre && <span className="pm-field-error">{errores.nombre}</span>}
              </div>
              <div className="pm-field">
                <label>Fecha de vencimiento</label>
                <input
                  className={errores.expiry ? "error" : ""}
                  placeholder="MM/AA"
                  value={card.expiry}
                  onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                  maxLength={5}
                />
                {errores.expiry && <span className="pm-field-error">{errores.expiry}</span>}
              </div>
              <div className="pm-field">
                <label>CVV</label>
                <input
                  className={errores.cvv ? "error" : ""}
                  type="password"
                  placeholder="•••"
                  value={card.cvv}
                  onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                  onFocus={() => setCvvFocus(true)}
                  onBlur={() => setCvvFocus(false)}
                  maxLength={4}
                />
                {errores.cvv && <span className="pm-field-error">{errores.cvv}</span>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pm-footer">
            <div className="pm-monto-pagar">
              <span>Monto a pagar:</span>
              <strong>{fmt(montoPagar)}</strong>
            </div>
            <AceptarTerminos
              aceptado={aceptaTerminos}
              setAceptado={(val) => {
                setAceptaTerminos(val);
                if (errores.terminos) setErrores((prev) => ({ ...prev, terminos: val ? "" : prev.terminos }));
              }}
              error={errores.terminos}
            />
            <div className="pm-footer-btns">
              <button className="pm-btn-secondary" onClick={onClose} disabled={procesando}>
                Cancelar
              </button>
              <button
                className="pm-btn-primary"
                onClick={handlePagar}
                disabled={procesando || montoPagar <= 0}
              >
                {procesando ? (
                  <><span className="pm-spinner" /> Procesando...</>
                ) : (
                  `Pagar ${fmt(montoPagar)}`
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
