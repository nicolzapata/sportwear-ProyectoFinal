// src/components/PaymentModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import "./PaymentModal.css";

/* ── Helpers ── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

const IconX = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <path d="M2 10h20" />
  </svg>
);
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const IconCheckCircle = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

function formatCardNumber(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v) {
  const clean = v.replace(/\D/g, "").slice(0, 4);
  return clean.length > 2 ? clean.slice(0, 2) + "/" + clean.slice(2) : clean;
}

// ── NUEVO: detecta la marca de la tarjeta por el prefijo del número, para
// mostrar el logo correspondiente en la vista previa mientras se escribe. ──
function detectarMarca(numero) {
  const digits = numero.replace(/\s/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return null;
}

const IconLock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconCheckSm = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ══════════════════════════════════════════════
   VISTA: RECIBO DE PAGO
══════════════════════════════════════════════ */
function ReceiptView({ pedido, cliente, pago, onClose }) {
  const productos = pedido.items?.map((i) => i.producto).join(", ") || "Sin productos";
  const fechaFormateada = pago.timestamp.toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const [descargando, setDescargando] = useState(false);
  const showToast = useToast();

  const descargarPDF = async () => {
    setDescargando(true);
    try {
      const res = await api.get(`/ventas/${pedido.id_venta}/comprobante`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `comprobante-venta-${pedido.id_venta}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("error", "No se pudo descargar el comprobante en PDF.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <>
      <div className={`pm-accent ${pago.estaCompleto ? "pm-accent--success" : "pm-accent--partial"}`} />

      {/* Header */}
      <div className="pm-header">
        <div>
          <h2 className="pm-title">
            {pago.estaCompleto ? "¡Pago completado!" : "Abono registrado"}
          </h2>
          <p className="pm-subtitle">Ref: {pago.referencia}</p>
        </div>
        <button className="pm-close" onClick={onClose}><IconX /></button>
      </div>

      {/* Badge estado */}
      <div className={`receipt-status-badge ${pago.estaCompleto ? "success" : "partial"}`}>
        <IconCheckCircle />
        <span>
          {pago.estaCompleto
            ? "Pedido completamente pagado"
            : pago.tipoPago === "cuota"
              ? `Cuota ${pago.cuotaPagada?.num_cuota || ""} pagada exitosamente`
              : "Abono registrado exitosamente"}
        </span>
      </div>

      {/* Cuerpo factura */}
      <div className="receipt-body">

        {/* Marca */}
        <div className="receipt-brand">
          <span className="receipt-brand-name">DVNA Colección</span>
          <span className="receipt-brand-tag">Comprobante de pago</span>
        </div>

        <div className="receipt-divider" />

        {/* Cliente */}
        <div className="receipt-section">
          <h4 className="receipt-section-title">Datos del cliente</h4>
          <div className="receipt-row">
            <span>Nombre</span>
            <strong>{cliente?.nombre || "—"}</strong>
          </div>
          <div className="receipt-row">
            <span>Cédula</span>
            <strong>{cliente?.documento ? `CC ${cliente.documento}` : "—"}</strong>
          </div>
        </div>

        <div className="receipt-divider receipt-divider--dashed" />

        {/* Pedido */}
        <div className="receipt-section">
          <h4 className="receipt-section-title">Pedido #{pedido.id_venta}</h4>
          <div className="receipt-row">
            <span>Producto(s)</span>
            <strong className="receipt-products">{productos}</strong>
          </div>
          <div className="receipt-row">
            <span>Fecha de pago</span>
            <strong>{fechaFormateada}</strong>
          </div>
          {pago.tipoPago === "cuota" && pago.cuotaPagada && (
            <div className="receipt-row">
              <span>Cuota pagada</span>
              <strong>Cuota {pago.cuotaPagada.num_cuota} de {pedido.num_cuotas}</strong>
            </div>
          )}
        </div>

        <div className="receipt-divider receipt-divider--dashed" />

        {/* Resumen financiero */}
        <div className="receipt-section">
          <h4 className="receipt-section-title">Resumen financiero</h4>
          <div className="receipt-row">
            <span>Total del pedido</span>
            <strong>{fmt(pedido.total)}</strong>
          </div>
          <div className="receipt-row receipt-row--highlight">
            <span>Valor abonado ahora</span>
            <strong className="receipt-amount-paid">{fmt(pago.montoPagado)}</strong>
          </div>
          <div className="receipt-row">
            <span>Total pagado acumulado</span>
            <strong>{fmt(pago.nuevoTotalPagado)}</strong>
          </div>
          {pago.estaCompleto ? (
            <div className="receipt-row receipt-row--total">
              <span>✅ Saldo restante</span>
              <strong>$0</strong>
            </div>
          ) : (
            <div className="receipt-row receipt-row--debt">
              <span>⏳ Saldo por pagar</span>
              <strong className="receipt-debt">{fmt(pago.restante)}</strong>
            </div>
          )}
        </div>

        {/* Próximas cuotas */}
        {!pago.estaCompleto &&
          pedido.abonos?.filter((a) => a.estado === "Pendiente" && a.id_pago !== pago.cuotaPagada?.id_pago).length > 0 && (
          <>
            <div className="receipt-divider receipt-divider--dashed" />
            <div className="receipt-section">
              <h4 className="receipt-section-title">Próximas cuotas</h4>
              {pedido.abonos
                .filter((a) => a.estado === "Pendiente" && a.id_pago !== pago.cuotaPagada?.id_pago)
                .slice(0, 3)
                .map((a) => (
                  <div key={a.id_pago} className="receipt-row">
                    <span>Cuota {a.num_cuota}</span>
                    <strong>{fmt(a.monto)}</strong>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pm-footer">
        <button className="pm-btn-secondary" onClick={() => window.print()}>
          <IconPrint /> Imprimir
        </button>
        <button className="pm-btn-secondary" onClick={descargarPDF} disabled={descargando}>
          {descargando ? "Generando..." : "Descargar PDF"}
        </button>
        <button className="pm-btn-primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   VISTA: PEDIDO PENDIENTE (Efectivo / Transferencia — sin pedir tarjeta)
══════════════════════════════════════════════ */
/* ── DATOS DE PRUEBA — reemplazar por los datos reales del negocio cuando los tengan ── */
const CUENTA_BANCARIA = {
  banco: "Banco X",
  tipo: "Ahorros",
  numero: "000-000000-00",
  titular: "DVNA SportWear S.A.S. — NIT 000.000.000-0",
  nota: "Envía el comprobante de la transferencia al WhatsApp 300 000 0000 para agilizar la confirmación.",
};

function PendienteView({ pedido, onClose, onPagoConfirmado }) {
  const esEfectivo = pedido.metodo_pago === "Efectivo";
  return (
    <>
      <div className="pm-accent pm-accent--partial" />
      <div className="pm-header">
        <div>
          <h2 className="pm-title">Pedido registrado</h2>
          <p className="pm-subtitle">Pedido #{pedido.id_venta}</p>
        </div>
        <button className="pm-close" onClick={onClose}><IconX /></button>
      </div>

      <div className="pm-pendiente-body">
        <div className="pm-pendiente-icono"><IconCheckCircle /></div>
        <p className="pm-pendiente-titulo">
          {esEfectivo ? "Pagarás en efectivo al recibir tu pedido" : "Falta confirmar tu transferencia"}
        </p>
        <p className="pm-pendiente-texto">
          {esEfectivo
            ? "Tu pedido quedó registrado. Nuestro equipo se pondrá en contacto para coordinar la entrega y el pago."
            : "Tu pedido quedó registrado como pendiente. Realiza la transferencia a la siguiente cuenta y confirmaremos tu pedido en cuanto la recibamos."}
        </p>

        {!esEfectivo && (
          <div className="pm-cuenta-box">
            <div className="pm-cuenta-row"><span>Banco</span><strong>{CUENTA_BANCARIA.banco}</strong></div>
            <div className="pm-cuenta-row"><span>Tipo de cuenta</span><strong>{CUENTA_BANCARIA.tipo}</strong></div>
            <div className="pm-cuenta-row"><span>Número de cuenta</span><strong>{CUENTA_BANCARIA.numero}</strong></div>
            <div className="pm-cuenta-row"><span>Titular</span><strong>{CUENTA_BANCARIA.titular}</strong></div>
            <p className="pm-cuenta-nota">{CUENTA_BANCARIA.nota}</p>
          </div>
        )}

        <div className="pm-pendiente-monto">
          <span>Total a pagar</span>
          <strong>{fmt(pedido.total)}</strong>
        </div>
      </div>

      <div className="pm-footer">
        <button
          className="pm-btn-primary"
          style={{ flex: 1 }}
          onClick={() => {
            if (onPagoConfirmado) onPagoConfirmado();
            onClose();
          }}
        >
          Entendido
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   VISTA: FORMULARIO DE PAGO
══════════════════════════════════════════════ */
function PaymentFormView({ pedido, cliente, onClose, onPagoConfirmado, setPagoRealizado }) {
  const [tipoPago, setTipoPago]     = useState("total");
  const [card, setCard]             = useState({ numero: "", nombre: "", expiry: "", cvv: "" });
  const [errores, setErrores]       = useState({});
  const [procesando, setProcesando] = useState(false);
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

/* ══════════════════════════════════════════════
   COMPONENTE PRINCIPAL — único portal
══════════════════════════════════════════════ */
export default function PaymentModal({ pedido, cliente, onClose, onPagoConfirmado }) {
  const [pagoRealizado, setPagoRealizado] = useState(null);
  // ── NUEVO: solo se pide tarjeta si el cliente eligió pagar con tarjeta.
  // Efectivo/Transferencia no tienen por qué pasar por un formulario de tarjeta. ──
  const requiereTarjeta = pedido.metodo_pago === "Tarjeta";

  return createPortal(
    <div className="pm-overlay">
      <div
        className={`pm-modal ${pagoRealizado ? "pm-modal--receipt" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {pagoRealizado ? (
          <ReceiptView
            pedido={pedido}
            cliente={cliente}
            pago={pagoRealizado}
            onClose={onClose}
          />
        ) : requiereTarjeta ? (
          <PaymentFormView
            pedido={pedido}
            cliente={cliente}
            onClose={onClose}
            onPagoConfirmado={onPagoConfirmado}
            setPagoRealizado={setPagoRealizado}
          />
        ) : (
          <PendienteView
            pedido={pedido}
            onClose={onClose}
            onPagoConfirmado={onPagoConfirmado}
          />
        )}
      </div>
    </div>,
    document.body
  );
}