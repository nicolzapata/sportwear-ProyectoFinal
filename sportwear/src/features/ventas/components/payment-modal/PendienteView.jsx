import { fmt, CUENTA_BANCARIA, WHATSAPP_CONFIRMACION } from "../../utils/paymentModalHelpers";
import { IconX, IconCheckLg, IconWhatsAppSm, IconMail, IconArrowRight } from "./paymentModalIcons";

/* ══════════════════════════════════════════════
   VISTA: PEDIDO PENDIENTE (Efectivo / Transferencia — sin pedir tarjeta)
══════════════════════════════════════════════ */
// ── El $ que devuelve toLocaleString("es-CO", {style:"currency"}) trae un
// espacio (nbsp) antes del número — acá se quiere pegado ("$319.900"), solo
// en esta vista, sin tocar el fmt() compartido que ya se usa en todo el resto. ──
const fmtTight = (n) => fmt(n).replace(/^(\D+)\s+/, "$1");

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
      <div className="pm-header">
        <div>
          <div className="pm-title-row">
            <h2 className="pm-title">Pedido registrado</h2>
            <span className="pm-badge-recibido"><span className="pm-badge-recibido-dot" />Recibido</span>
          </div>
          <p className="pm-subtitle">ORDEN #{pedido.id_venta} · Hoy, SportWear Boutique</p>
        </div>
        <button className="pm-close" onClick={onClose}><IconX /></button>
      </div>

      <div className="pm-pendiente-body">
        <div className="pm-pendiente-icono"><IconCheckLg /></div>
        <p className="pm-pendiente-titulo">
          {esEfectivo ? "Pagarás en efectivo al recibir tu pedido" : "Falta confirmar tu transferencia"}
        </p>
        <p className="pm-pendiente-texto">
          {esEfectivo
            ? "Tu compra quedó registrada exitosamente. Nuestro equipo se contactará vía WhatsApp o llamada para coordinar la entrega y el cobro en tu domicilio."
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
          <div>
            <span className="pm-pendiente-monto-label">Total a pagar</span>
            <span className="pm-pendiente-monto-sub">
              {esEfectivo ? "Efectivo contra entrega · Envío prioritario" : "Transferencia bancaria · Envío prioritario"}
            </span>
          </div>
          <div className="pm-pendiente-monto-precio">
            {fmtTight(pedido.total)} <span className="pm-pendiente-monto-moneda">COP</span>
          </div>
        </div>

        <div className="pm-pendiente-info-row">
          <div className="pm-pendiente-info-box">
            <span className="pm-pendiente-info-icon"><IconMail /></span>
            <span>Comprobante enviado al correo</span>
          </div>
          <div className="pm-pendiente-info-box pm-pendiente-info-box--whatsapp">
            <span className="pm-pendiente-info-icon pm-pendiente-info-icon--whatsapp"><IconWhatsAppSm /></span>
            <span>Seguimiento por WhatsApp activo</span>
          </div>
        </div>
      </div>

      <div className="pm-footer pm-footer--pendiente">
        <a
          href={linkWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="pm-footer-link"
        >
          ¿Necesitas cambiar la dirección? Escríbenos
        </a>
        <button
          className="pm-btn-primary"
          onClick={() => {
            if (onPagoConfirmado) onPagoConfirmado();
            onClose();
          }}
        >
          Entendido <IconArrowRight />
        </button>
      </div>
    </>
  );
}
