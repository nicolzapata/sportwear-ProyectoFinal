// src/components/PaymentReceipt.jsx
import { createPortal } from "react-dom";
import "./PaymentModal.base.css";
import "./PaymentModal.card.css";
import "./PaymentModal.receipt.css";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

const IconCheckCircle = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconX = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconPrint = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

export default function PaymentReceipt({ pedido, cliente, pago, onClose }) {
  const productos = pedido.items?.map((i) => i.producto).join(", ") || "Sin productos";
  const fechaFormateada = pago.timestamp.toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return createPortal(
    <div className="pm-overlay">
      <div className="pm-modal pm-modal--receipt" onClick={(e) => e.stopPropagation()}>
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

        {/* Badge de estado */}
        <div className={`receipt-status-badge ${pago.estaCompleto ? "success" : "partial"}`}>
          <IconCheckCircle />
          <span>
            {pago.estaCompleto
              ? "Pedido completamente pagado"
              : `Cuota ${pago.cuotaPagada?.num_cuota || ""} pagada exitosamente`}
          </span>
        </div>

        {/* Cuerpo de la factura */}
        <div className="receipt-body">

          {/* Logo / marca */}
          <div className="receipt-brand">
            <span className="receipt-brand-name">DVNA Colección</span>
            <span className="receipt-brand-tag">Comprobante de pago</span>
          </div>

          <div className="receipt-divider" />

          {/* Info cliente */}
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

          {/* Info pedido */}
          <div className="receipt-section">
            <h4 className="receipt-section-title">Detalle del pedido #{pedido.id_venta}</h4>
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

          {/* Cuotas restantes si aplica */}
          {!pago.estaCompleto && pedido.abonos?.filter(a => a.estado === "Pendiente").length > 1 && (
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
          <button
            className="pm-btn-secondary"
            onClick={() => window.print()}
          >
            <IconPrint /> Imprimir
          </button>
          <button className="pm-btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}