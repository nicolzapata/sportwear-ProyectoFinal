import DetallePanel from "../../../../shared/components/DetallePanel";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { fmt } from "../../../../shared/utils/publicNavbarHelpers";
import { IconEdit, IconBox, IconHome, IconClock } from "../../../../shared/components/Icons";
import { IconCheckSm } from "./icons";
import EstadoDropdown from "./EstadoDropdown";
import {
  ESTADOS_ORDEN, getPagoBadge, getPagoTexto, tiempoRelativo, origenTexto, ESTADOS_EDITABLES,
} from "../../utils/pedidosHelpers";

// Panel acoplado (mismo criterio que Usuarios/Proveedores/Compras): "Ver
// detalle" de un pedido ya no es un modal centrado — es este panel, usado
// tanto en la vista de tarjetas (siempre visible) como en la de tabla
// (aparece al lado al hacer click en "Ver detalle").
export default function PedidoDetalleModal({
  verDetalle, setVerDetalle, cargandoDetalle,
  cambiarEstado, cambiando, tienePerm,
  filaAbierta, setFilaAbierta,
  abrirEditar,
}) {
  if (!verDetalle) return null;

  const esCancelado = verDetalle.estado_pedido === 'Cancelado';
  const idxActual = ESTADOS_ORDEN.indexOf(verDetalle.estado_pedido);
  const puedeEditarPedido = tienePerm('Pedidos.editar') && ESTADOS_EDITABLES.includes(verDetalle.estado_pedido);

  return (
    <DetallePanel
      iniciales={`P${String(verDetalle.id_pedido).padStart(2, '0')}`}
      avatarColor={getAvatarColor(verDetalle.id_pedido)}
      nombre="Inspección de despacho"
      subtitulo={`${origenTexto(verDetalle.origen)} · P-${String(verDetalle.id_pedido).padStart(3, "0")}`}
      onClose={() => setVerDetalle(null)}
      footer={
        <>
          <button className="detalle-panel-btn-secundario" onClick={() => setVerDetalle(null)}>Cerrar</button>
          {puedeEditarPedido && (
            <button className="detalle-panel-btn-primario" onClick={() => abrirEditar(verDetalle)}>
              <IconEdit /> Editar pedido
            </button>
          )}
        </>
      }
    >
      {cargandoDetalle ? (
        <div className="role-back-loading"><div className="role-back-spinner" /><span>Cargando pedido...</span></div>
      ) : (
        <>
          <div className="pedidos-factura-seccion">
            <h3 className="pedidos-factura-titulo">Estado</h3>
            {esCancelado ? (
              <span className="pedidos-badge pedidos-badge-inactive">Cancelado</span>
            ) : (
              <div className="ped-stepper">
                {ESTADOS_ORDEN.map((estado, i) => (
                  <div key={estado} className={`ped-stepper-item${i < idxActual ? ' done' : ''}${i === idxActual ? ' current' : ''}`}>
                    <span className="ped-stepper-dot">{i <= idxActual ? <IconCheckSm /> : null}</span>
                    <span className="ped-stepper-label">{estado}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="ped-estado-cambiar-row">
              <span className="ped-tiempo-transcurrido"><IconClock /> {tiempoRelativo(verDetalle.fecha_actualizacion)}</span>
              <EstadoDropdown
                pedido={verDetalle}
                abierto={filaAbierta === verDetalle.id_pedido}
                onToggle={setFilaAbierta}
                onCambiar={cambiarEstado}
                cambiando={cambiando}
                tienePerm={tienePerm}
              />
            </div>
          </div>

          <div className="pedidos-factura-seccion">
            <h3 className="pedidos-factura-titulo">Comprador y pago</h3>
            <div className="ped-comprador-row">
              <span className="ped-comprador-avatar" style={{ background: getAvatarColor(verDetalle.id_pedido) }}>{getInitials(verDetalle.cliente)}</span>
              <div className="ped-comprador-info">
                <span className="ped-comprador-nombre">{verDetalle.cliente}</span>
                <span className="ped-comprador-doc">{verDetalle.cliente_documento}{verDetalle.cliente_email ? ` · ${verDetalle.cliente_email}` : ''}</span>
              </div>
            </div>
            <div className="ped-pago-row">
              <span>{verDetalle.metodo_pago || 'Método de pago no registrado'}</span>
              <span className={`pedidos-badge ${getPagoBadge(verDetalle.estado_venta)}`}>{getPagoTexto(verDetalle.estado_venta)}</span>
              <span className="ped-pago-total">{fmt(verDetalle.total)}</span>
            </div>
          </div>

          <div className="pedidos-factura-seccion">
            <h3 className="pedidos-factura-titulo">Prendas ({verDetalle.items?.length || 0})</h3>
            {(verDetalle.items || []).map((item, i) => (
              <div key={i} className="pedidos-detalle-producto-row">
                <div className="pedidos-detalle-producto-thumb">
                  {item.producto_imagen ? <img src={item.producto_imagen} alt={item.producto} /> : <IconBox />}
                </div>
                <div className="pedidos-detalle-producto-info">
                  <span className="pedidos-detalle-producto-nombre">{item.producto}</span>
                  <div className="pedidos-detalle-producto-tags">
                    {item.producto_codigo && <span className="pedidos-detalle-tag pedidos-detalle-tag-ref">{item.producto_codigo}</span>}
                    {item.talla && <span className="pedidos-detalle-tag">Talla: {item.talla}</span>}
                    {item.color_nombre && <span className="pedidos-detalle-tag">{item.color_nombre}</span>}
                  </div>
                </div>
                <span className="pedidos-detalle-producto-cant">Cant: {item.cantidad}</span>
              </div>
            ))}
          </div>

          <div className="pedidos-factura-seccion">
            <h3 className="pedidos-factura-titulo"><IconHome /> Destino</h3>
            <p className="ped-destino-direccion">{verDetalle.direccion_entrega || 'Sin dirección registrada.'}</p>
          </div>

          {verDetalle.historial?.length > 0 && (
            <div className="pedidos-factura-seccion">
              <h3 className="pedidos-factura-titulo">Historial de estados</h3>
              {verDetalle.historial.map((h, i) => (
                <div key={i} className="pedidos-detalle-item-linea">
                  <span>{h.estado}</span>
                  <span>{h.fecha?.toString().split("T")[0]} {h.usuario ? `· ${h.usuario}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DetallePanel>
  );
}
