import { useState, useEffect } from "react";
import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconX } from "../../../../shared/components/Icons";
import api from "../../../../shared/services/api";
import { fmt } from "../../utils/pagosAbonosHelpers";

const formatFecha = (f) =>
  f ? new Date(f).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

// ── NUEVO: calendario completo de la venta — todas sus cuotas, pasadas y
// futuras, con su estado, en formato timeline en vez de una tabla plana.
// Solo tiene sentido para ventas a cuotas (más de una fila con num_cuota). ──
function CalendarioVenta({ id_venta }) {
  const [cuotas, setCuotas] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelado = false;
    api.get(`/pagos/venta/${id_venta}/todas`)
      .then(({ data }) => { if (!cancelado) setCuotas((data || []).filter((c) => c.num_cuota)); })
      .catch(() => { if (!cancelado) setError(true); });
    return () => { cancelado = true; };
  }, [id_venta]);

  if (error || (cuotas && cuotas.length === 0)) return null;
  if (!cuotas) return <p className="pagosabonos-calendario-cargando">Cargando calendario...</p>;

  const hoy = new Date();

  return (
    <div className="pagosabonos-calendario-venta">
      {cuotas.map((c) => {
        const vencida = c.estado === "Pendiente" && c.fecha_vencimiento && new Date(c.fecha_vencimiento) < hoy;
        const estadoClase =
          c.estado === "Confirmado" ? "confirmado" :
          c.estado === "Anulado"    ? "anulado" :
          vencida                   ? "vencida" : "pendiente";
        return (
          <div key={c.id_pago} className={`pagosabonos-timeline-item pagosabonos-timeline-${estadoClase}`}>
            <div className="pagosabonos-timeline-dot" />
            <div className="pagosabonos-timeline-content">
              <div className="pagosabonos-timeline-header">
                <span className="pagosabonos-timeline-titulo">Cuota {c.num_cuota}</span>
                <span className="pagosabonos-timeline-monto">{fmt(c.monto)}</span>
              </div>
              <div className="pagosabonos-timeline-sub">
                <span className={`pagosabonos-timeline-badge pagosabonos-timeline-badge-${estadoClase}`}>
                  {vencida ? "Vencida" : c.estado}
                </span>
                <span className="pagosabonos-timeline-fecha">
                  {c.estado === "Confirmado" ? `Pagada: ${formatFecha(c.fecha)}` : `Vence: ${formatFecha(c.fecha_vencimiento)}`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function PagoDetalleModal({ verDetalle, setVerDetalle }) {
  if (!verDetalle) return null;

  return (
    <div className="pagosabonos-modal-overlay" onClick={() => setVerDetalle(null)}>
      <div className="pagosabonos-modal pagosabonos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="pagosabonos-modal-header">
          <div>
            <h2 className="pagosabonos-modal-title">Pago P-{String(verDetalle.id_pago).padStart(3, "0")}</h2>
            <p className="pagosabonos-modal-subtitulo">Detalle del pago</p>
          </div>
          <button className="pagosabonos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
        </div>

        <div className="pagosabonos-modal-body pagosabonos-factura-body">
          <div className="pagosabonos-factura-seccion">
            <h3 className="pagosabonos-factura-titulo">Información</h3>
            <DetalleGrid>
              <DetalleItem label="ID" value={`P-${String(verDetalle.id_pago).padStart(3, "0")}`} />
              <DetalleItem label="Venta" value={`V-${String(verDetalle.id_venta).padStart(3, "0")}`} />
              <DetalleItem label="Cliente" value={verDetalle.cliente} />
              <DetalleItem label="Tipo" value={verDetalle.tipo} />
              <DetalleItem label="Método" value={verDetalle.metodo} />
              <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
            </DetalleGrid>
          </div>

          <div className="pagosabonos-factura-seccion">
            <h3 className="pagosabonos-factura-titulo">Pago</h3>
            <DetalleGrid>
              <DetalleItem label="Monto" value={fmt(verDetalle.monto)} />
              <DetalleItem label="Estado" value={
                <span className={`pagosabonos-estado-badge-static pagosabonos-estado-${
                  verDetalle.estado === 'Confirmado' ? 'exito' : verDetalle.estado === 'Anulado' ? 'error' : 'pendiente'
                }`}>{verDetalle.estado}</span>
              } />
            </DetalleGrid>
          </div>

          <div className="pagosabonos-factura-seccion">
            <h3 className="pagosabonos-factura-titulo">Calendario de cuotas de la venta</h3>
            <CalendarioVenta id_venta={verDetalle.id_venta} />
          </div>
        </div>

        <div className="pagosabonos-modal-footer">
          <button className="pagosabonos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
