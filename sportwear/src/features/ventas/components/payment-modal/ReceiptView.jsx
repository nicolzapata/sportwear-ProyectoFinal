import { useState } from "react";
import api from "../../../../shared/services/api";
import { useToast } from "../../../../shared/contexts/ToastContext";
import { fmt } from "../../utils/paymentModalHelpers";
import { IconX, IconPrint, IconCheckCircle } from "./paymentModalIcons";

/* ══════════════════════════════════════════════
   VISTA: RECIBO DE PAGO
══════════════════════════════════════════════ */
export default function ReceiptView({ pedido, cliente, pago, onClose }) {
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
