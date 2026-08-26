import { fmt, CUENTA_BANCARIA, WHATSAPP_CONFIRMACION } from "../../utils/paymentModalHelpers";
import { IconX, IconCheckCircle, IconWhatsAppSm } from "./paymentModalIcons";

/* ══════════════════════════════════════════════
   VISTA: PEDIDO PENDIENTE (Efectivo / Transferencia — sin pedir tarjeta)
══════════════════════════════════════════════ */
export default function PendienteView({ pedido, onClose, onPagoConfirmado }) {
  const esEfectivo = pedido.metodo_pago === "Efectivo";

  // ── NUEVO: enlace directo a WhatsApp, con un mensaje pre-armado que ya
  // incluye el número de pedido para que el cliente no tenga que escribirlo. ──
  const mensajeWhatsApp = encodeURIComponent(
    `Hola, quiero enviar el comprobante de mi transferencia para el pedido #${pedido.id_venta}.`
  );
  const linkWhatsApp = `https://wa.me/${WHATSAPP_CONFIRMACION}?text=${mensajeWhatsApp}`;

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
            : "Tu pedido quedó registrado como pendiente. Realiza la transferencia a la siguiente cuenta y envíanos el comprobante por WhatsApp para confirmarlo más rápido."}
        </p>

        {!esEfectivo && (
          <div className="pm-cuenta-box">
            <div className="pm-cuenta-row"><span>Banco</span><strong>{CUENTA_BANCARIA.banco}</strong></div>
            <div className="pm-cuenta-row"><span>Tipo de cuenta</span><strong>{CUENTA_BANCARIA.tipo}</strong></div>
            <div className="pm-cuenta-row"><span>Número de cuenta</span><strong>{CUENTA_BANCARIA.numero}</strong></div>
            <div className="pm-cuenta-row"><span>Titular</span><strong>{CUENTA_BANCARIA.titular}</strong></div>
            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="pm-whatsapp-btn"
            >
              <IconWhatsAppSm /> Enviar comprobante por WhatsApp
            </a>
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
