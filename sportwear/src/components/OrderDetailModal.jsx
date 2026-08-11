// src/components/OrderDetailModal.jsx
import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import "./OrderDetailModal.css";

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
const IconBolt = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconPackage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dvna-muted)" strokeWidth="1.8">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dvna-muted)" strokeWidth="1.8">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconHistory = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dvna-muted)" strokeWidth="1.8">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);
const IconInfo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--dvna-muted)" strokeWidth="1.8">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="8.01" />
    <path d="M12 11v5" />
  </svg>
);

const getBadgeClass = (estado) => {
  switch (estado) {
    case "Pagado":
    case "Confirmado":
    case "Abonado": return "badge-success";
    case "Pendiente": return "badge-warning";
    // ── CORREGIDO: el valor real de Ventas.estado cuando se anula una
    // venta es "Anulado", no "Cancelado" — se dejan los dos por seguridad. ──
    case "Cancelado":
    case "Anulado": return "badge-danger";
    default:          return "badge-secondary";
  }
};

export default function OrderDetailModal({ pedido, onClose }) {
  const totalPagado = Number(pedido.total_pagado || 0);
  const totalPedido = Number(pedido.total || 0);
  const progreso = totalPedido > 0 ? Math.min((totalPagado / totalPedido) * 100, 100) : 0;
  const esCuotas = pedido.tipo_pago === "cuotas";
  const [descargando, setDescargando] = useState(false);
  const showToast = useToast();

  const descargarComprobante = async () => {
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

  const cuotasPagadas   = pedido.abonos?.filter((a) => a.estado === "Confirmado") || [];
  const cuotasPendientes = pedido.abonos?.filter((a) => a.estado === "Pendiente") || [];

  // ── CORREGIDO: sin { timeZone: "UTC" }, una fecha guardada como "solo
  // fecha" (medianoche UTC) se interpretaba en la zona horaria local del
  // navegador — en Colombia (UTC-5) eso puede correr la fecha mostrada un
  // día hacia atrás. Forzar UTC aquí hace que la fecha mostrada siempre
  // coincida con la que realmente se guardó. ──
  const formatFecha = (f) =>
    f ? new Date(f).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

  return createPortal(
    <div className="od-overlay">
      <div className="od-modal" onClick={(e) => e.stopPropagation()}>
        <div className="od-accent" />

        {/* Header */}
        <div className="od-header">
          <div>
            <h2 className="od-title">Pedido #{pedido.id_venta}</h2>
            <p className="od-subtitle">{formatFecha(pedido.fecha)}</p>
          </div>
          <div className="od-header-right">
            <span className={`badge ${getBadgeClass(pedido.estado)}`}>{pedido.estado}</span>
            <button className="od-close" onClick={onClose}><IconX /></button>
          </div>
        </div>

        {/* Barra de progreso de pago */}
        <div className="od-progress-section">
          <div className="od-progress-labels">
            <span>Progreso de pago</span>
            <span>{Math.round(progreso)}%</span>
          </div>
          <div className="od-progress-track">
            <div
              className={`od-progress-fill ${progreso >= 100 ? "complete" : ""}`}
              style={{ width: `${progreso}%` }}
            />
          </div>
          <div className="od-progress-amounts">
            <span>{fmt(totalPagado)} pagado</span>
            <span>{fmt(Math.max(0, totalPedido - totalPagado))} pendiente</span>
          </div>
        </div>

        <div className="od-body">

          {/* ── Sección 1: Información del pedido ── */}
          <div className="od-section">
            <h3 className="od-section-title"><IconInfo /> Información general</h3>
            <div className="od-info-grid">
              <div className="od-info-item">
                <span className="od-info-label">Total pedido</span>
                <span className="od-info-value od-value-main">{fmt(totalPedido)}</span>
              </div>
              <div className="od-info-item">
                <span className="od-info-label">Total pagado</span>
                <span className="od-info-value od-value-paid">{fmt(totalPagado)}</span>
              </div>
              <div className="od-info-item">
                <span className="od-info-label">Saldo restante</span>
                <span className="od-info-value od-value-debt">
                  {fmt(Math.max(0, totalPedido - totalPagado))}
                </span>
              </div>
              <div className="od-info-item">
                <span className="od-info-label">Tipo de pago</span>
                <span className="od-info-value">
                  {esCuotas ? `Cuotas (${pedido.num_cuotas})` : "Pago completo"}
                </span>
              </div>
              {pedido.observaciones && (
                <div className="od-info-item od-info-item--full">
                  <span className="od-info-label">Observaciones</span>
                  <span className="od-info-value">{pedido.observaciones}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Sección 2: Productos — rediseñada con miniaturas más
              prominentes y filas más limpias, mismo lenguaje visual que el
              detalle de producto del admin (imagen + info estructurada). ── */}
          <div className="od-section">
            <h3 className="od-section-title"><IconPackage /> Productos</h3>
            {pedido.items?.length > 0 ? (
              <div className="od-products">
                {pedido.items.map((item, idx) => (
                  <div key={idx} className="od-product-row">
                    <div className="od-product-thumb">
                      {item.producto_imagen ? (
                        <img src={item.producto_imagen} alt={item.producto} />
                      ) : (
                        <IconPackage />
                      )}
                    </div>
                    <div className="od-product-info">
                      <span className="od-product-name">{item.producto}</span>
                      <div className="od-product-meta">
                        {item.producto_codigo && <span className="od-tag od-tag-ref">{item.producto_codigo}</span>}
                        {item.color_nombre && <span className="od-tag">{item.color_nombre}</span>}
                        {item.talla && <span className="od-tag">Talla {item.talla}</span>}
                      </div>
                    </div>
                    <div className="od-product-right">
                      <span className="od-product-price">{fmt(item.precio_unitario)}</span>
                      <span className="od-product-cant">× {item.cantidad}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="od-empty">Sin productos registrados</p>
            )}
          </div>

          {/* ── Sección 3: Historial de pagos ── */}
          {cuotasPagadas.length > 0 && (
            <div className="od-section">
              <h3 className="od-section-title"><IconHistory /> Historial de pagos</h3>
              <div className="od-timeline">
                {cuotasPagadas.map((abono) => (
                  <div key={abono.id_pago} className="od-timeline-item od-timeline-item--done">
                    <div className="od-timeline-dot od-timeline-dot--done" />
                    <div className="od-timeline-content">
                      <div className="od-timeline-header">
                        <span className="od-timeline-title">Cuota {abono.num_cuota} — Pagada</span>
                        <span className="od-timeline-amount od-value-paid">{fmt(abono.monto)}</span>
                      </div>
                      {abono.fecha_pago && (
                        <span className="od-timeline-date">{formatFecha(abono.fecha_pago)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Sección 4: Calendario de cuotas pendientes ── */}
          {esCuotas && cuotasPendientes.length > 0 && (
            <div className="od-section">
              <h3 className="od-section-title"><IconCalendar /> Calendario de cuotas pendientes</h3>
              <div className="od-calendar">
                {cuotasPendientes.map((abono, idx) => {
                  const esProxima = idx === 0;
                  const vencida = abono.fecha_vencimiento
                    ? new Date(abono.fecha_vencimiento) < new Date()
                    : false;

                  return (
                    <div
                      key={abono.id_pago}
                      className={`od-cuota-row ${esProxima ? "od-cuota-row--next" : ""} ${vencida ? "od-cuota-row--vencida" : ""}`}
                    >
                      <div className="od-cuota-number">
                        <span>{abono.num_cuota}</span>
                      </div>
                      <div className="od-cuota-info">
                        <span className="od-cuota-label">
                          {esProxima ? <><IconBolt /> Próxima a pagar</> : `Cuota ${abono.num_cuota}`}
                        </span>
                        <span className="od-cuota-date">
                          Vence: {formatFecha(abono.fecha_vencimiento)}
                          {vencida && <span className="od-overdue-tag">Vencida</span>}
                        </span>
                      </div>
                      <span className="od-cuota-monto">{fmt(abono.monto)}</span>
                    </div>
                  );
                })}
                <div className="od-cuota-total">
                  <span>Total pendiente</span>
                  <strong>
                    {fmt(cuotasPendientes.reduce((s, a) => s + Number(a.monto || 0), 0))}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Pedido pagado completamente */}
          {progreso >= 100 && (
            <div className="od-paid-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Este pedido está completamente pagado
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="od-footer">
          <button className="od-btn-close" onClick={descargarComprobante} disabled={descargando}>
            {descargando ? "Generando..." : "Descargar comprobante"}
          </button>
          <button className="od-btn-close" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}