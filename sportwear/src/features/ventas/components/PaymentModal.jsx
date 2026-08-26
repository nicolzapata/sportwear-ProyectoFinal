// src/components/PaymentModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
// PaymentModal.css se dividió por sección para facilitar el mantenimiento;
// el orden de los imports preserva la cascada del archivo original.
import "./PaymentModal.base.css";
import "./PaymentModal.card.css";
import "./PaymentModal.receipt.css";
import ReceiptView from "./payment-modal/ReceiptView";
import PendienteView from "./payment-modal/PendienteView";
import PaymentFormView from "./payment-modal/PaymentFormView";

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
