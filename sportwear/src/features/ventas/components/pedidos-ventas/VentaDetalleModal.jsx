import DetallePanel from "../../../../shared/components/DetallePanel";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { IconBox, IconDollar } from "../../../../shared/components/Icons";
import { fmt, getEstadoBadge } from "../../utils/pedidosVentasHelpers";

// Panel acoplado (mismo criterio que Usuarios/Proveedores/Compras/Pedidos):
// "Ver detalle" de una venta ya no es un modal centrado — es este panel,
// con el cronograma real de cuotas (GET /ventas/:id/pagos, ver
// useVentasListado.abrirDetalle) en vez del historial vacío que tenía antes.
export default function VentaDetalleModal({ verDetalle, setVerDetalle, cargandoDetalle, tienePerm, setAbonosModal }) {
  if (!verDetalle) return null;

  const saldo = verDetalle.total - (verDetalle.total_pagado || 0);
  const esCuotas = verDetalle.tipo_pago === 'cuotas';
  const cuotas = (verDetalle.abonos || []).filter((a) => a.num_cuota != null);
  const idxProximaPendiente = cuotas.findIndex((c) => c.estado === 'Pendiente');
  const puedeGestionarPago = tienePerm('Ventas.crear') && verDetalle.estado !== 'Pagado' && verDetalle.estado !== 'Anulado';

  return (
    <DetallePanel
      iniciales={getInitials(verDetalle.cliente)}
      avatarColor={getAvatarColor(verDetalle.id_venta)}
      nombre={verDetalle.cliente}
      subtitulo={`V-${String(verDetalle.id_venta).padStart(3, "0")} · ${verDetalle.fecha?.toString().split("T")[0] || ''}`}
      onClose={() => setVerDetalle(null)}
      footer={
        <>
          <button className="detalle-panel-btn-secundario" onClick={() => setVerDetalle(null)}>Cerrar</button>
          {puedeGestionarPago && (
            <button className="detalle-panel-btn-primario" onClick={() => setAbonosModal(verDetalle)}>
              <IconDollar /> {esCuotas ? 'Gestionar abonos' : 'Registrar pago'}
            </button>
          )}
        </>
      }
    >
      {cargandoDetalle ? (
        <div className="role-back-loading"><div className="role-back-spinner" /><span>Cargando venta...</span></div>
      ) : (
        <>
          <div className="pedidosventas-factura-seccion">
            <h3 className="pedidosventas-factura-titulo">Cliente y pago</h3>
            <div className="vta-cliente-info">
              {verDetalle.cliente_documento && <span>CC {verDetalle.cliente_documento}</span>}
              {verDetalle.cliente_email && <span>{verDetalle.cliente_email}</span>}
            </div>
            <div className="vta-pago-row">
              <span>{esCuotas ? `Cuotas (${verDetalle.num_cuotas})` : 'Pago completo'}</span>
              <span className={`pedidosventas-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>
            </div>
          </div>

          <div className="pedidosventas-factura-seccion">
            <h3 className="pedidosventas-factura-titulo">Artículos</h3>
            {(verDetalle.items || []).map((item, i) => {
              const variante = [item.color_nombre, item.talla ? `Talla ${item.talla}` : null].filter(Boolean).join(" · ");
              return (
                <div key={i} className="pedidos-detalle-producto-row">
                  <div className="pedidos-detalle-producto-thumb">
                    {item.producto_imagen ? <img src={item.producto_imagen} alt={item.producto} /> : <IconBox />}
                  </div>
                  <div className="pedidos-detalle-producto-info">
                    <span className="pedidos-detalle-producto-nombre">{item.producto}</span>
                    <div className="pedidos-detalle-producto-tags">
                      {item.producto_codigo && <span className="pedidos-detalle-tag pedidos-detalle-tag-ref">{item.producto_codigo}</span>}
                      {variante && <span className="pedidos-detalle-tag">{variante}</span>}
                    </div>
                  </div>
                  <span className="pedidos-detalle-producto-cant">{fmt(item.subtotal)}</span>
                </div>
              );
            })}
          </div>

          <div className="pedidosventas-factura-seccion">
            <h3 className="pedidosventas-factura-titulo">Pago</h3>
            <div className="vta-total-resumen">
              <span>Subtotal: {fmt(verDetalle.subtotal)}</span>
              {Number(verDetalle.descuento) > 0 && <span>Descuento: {fmt(verDetalle.descuento)}</span>}
              {Number(verDetalle.impuesto) > 0 && <span>Impuesto: {fmt(verDetalle.impuesto)}</span>}
              <span className="vta-total-final">Total: {fmt(verDetalle.total)}</span>
              <span>Abonado: {fmt(verDetalle.total_pagado || 0)}</span>
              <span className={saldo > 0 ? 'vta-saldo-pendiente' : ''}>Saldo: {fmt(saldo)}</span>
            </div>
          </div>

          {esCuotas && cuotas.length > 0 && (
            <div className="pedidosventas-factura-seccion">
              <h3 className="pedidosventas-factura-titulo">Cronograma de cartera</h3>
              <div className="pedidosventas-pago-bar-track vta-cronograma-track">
                <div className="pedidosventas-pago-bar-fill" style={{ width: `${verDetalle.total > 0 ? Math.min(100, Math.round(((verDetalle.total_pagado || 0) / verDetalle.total) * 100)) : 0}%` }} />
              </div>
              <div className="vta-cuotas-lista">
                {cuotas.map((c, i) => {
                  const esProxima = i === idxProximaPendiente;
                  const label = c.estado === 'Confirmado' ? 'Pagada' : c.estado === 'Anulado' ? 'Anulada' : (esProxima ? 'Pendiente' : 'Programada');
                  return (
                    <div key={c.id_pago} className={`vta-cuota-row${esProxima ? ' proxima' : ''}`}>
                      <span className="vta-cuota-num">{i + 1}</span>
                      <div className="vta-cuota-info">
                        <span className="vta-cuota-titulo">Cuota {i + 1}/{cuotas.length}{i === 0 ? ' (inicial)' : ''}</span>
                        <span className="vta-cuota-fecha">
                          {c.estado === 'Confirmado'
                            ? `Pagada el ${c.fecha?.toString().split("T")[0]} · Recibo #REC-${c.id_pago}`
                            : `Vence: ${c.fecha_vencimiento || '—'}`}
                        </span>
                      </div>
                      <div className="vta-cuota-monto-col">
                        <span className="vta-cuota-monto">{fmt(c.monto)}</span>
                        <span className={`pedidosventas-badge ${c.estado === 'Confirmado' ? 'pedidosventas-badge-active' : c.estado === 'Anulado' ? 'pedidosventas-badge-inactive' : 'pedidosventas-badge-pending'}`}>{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {puedeGestionarPago && idxProximaPendiente !== -1 && (
                <button className="detalle-panel-btn-primario vta-cuota-btn-abono" onClick={() => setAbonosModal(verDetalle)}>
                  <IconDollar /> Registrar abono a cuota {idxProximaPendiente + 1}/{cuotas.length}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </DetallePanel>
  );
}
