import { PALETAS, inicialesProveedor } from "../../utils/proveedoresHelpers";
import { fmt } from "../../../../shared/utils/publicNavbarHelpers";
import { IconEdit, IconPhone, IconClock } from "../../../../shared/components/Icons";

const COLOR_ESTADO_ORDEN = {
  Pendiente: 'var(--warning)', 'En Tránsito': '#1976d2', Confirmado: '#1976d2',
  Recibido: 'var(--success)', Pagado: 'var(--success)', Anulado: 'var(--danger)',
};

export default function ProveedorDetailPanel({
  proveedor, index, ordenes, cargandoOrdenes, puedeVerOrdenes,
  onEditar, onCambiarEstado, puedeEditar, puedeEstado,
}) {
  if (!proveedor) return null;

  const color = PALETAS[index % PALETAS.length];
  const activo = proveedor.estado === 'Activo';
  const esJuridica = proveedor.tipo_doc === 'NIT';
  const tieneCondiciones = proveedor.banco || proveedor.numero_cuenta || proveedor.condiciones;

  return (
    <div className="prov-detalle-panel">
      <div className="prov-detalle-header">
        <span className="prov-detalle-icon" style={{ background: color }}>{inicialesProveedor(proveedor)}</span>
        <div className="prov-detalle-titulo">
          <div className="prov-detalle-nombre-row">
            <span className="prov-detalle-nombre">{proveedor.razon_social}</span>
            <span className="prov-detalle-tipo">{esJuridica ? 'Jurídica' : 'Natural'}</span>
          </div>
          <span className="prov-detalle-id">{proveedor.tipo_doc} {proveedor.numero_doc}</span>
        </div>
      </div>

      {proveedor.nombre_comercial && <p className="prov-detalle-desc">{proveedor.nombre_comercial}</p>}

      <div className="prov-detalle-stats">
        <div className="prov-detalle-stat">
          <span className="prov-detalle-stat-label">Órdenes de compra</span>
          <span className="prov-detalle-stat-valor">{Number(proveedor.total_compras) || 0}</span>
          <span className="prov-detalle-stat-hint">{activo ? 'Proveedor activo' : 'Proveedor inactivo'}</span>
        </div>
        <div className="prov-detalle-stat">
          <span className="prov-detalle-stat-label">Plazo de pago</span>
          <span className="prov-detalle-stat-valor">{proveedor.plazo_pago_dias ? `${proveedor.plazo_pago_dias}d` : '—'}</span>
        </div>
      </div>

      <div className="prov-detalle-seccion">
        <div className="prov-detalle-seccion-header"><span>Contacto</span></div>
        <div className="prov-detalle-contacto-grid">
          <div className="prov-detalle-campo">
            <span className="prov-detalle-campo-label">Persona de contacto</span>
            <span className="prov-detalle-campo-valor">{proveedor.nombre_contacto || '—'}{proveedor.cargo_contacto ? ` · ${proveedor.cargo_contacto}` : ''}</span>
          </div>
          <div className="prov-detalle-campo">
            <span className="prov-detalle-campo-label">Teléfono</span>
            <span className="prov-detalle-campo-valor">{proveedor.telefono_celular || '—'}</span>
          </div>
          <div className="prov-detalle-campo full">
            <span className="prov-detalle-campo-label">Correo</span>
            <span className="prov-detalle-campo-valor">{proveedor.email_contacto || '—'}</span>
          </div>
          <div className="prov-detalle-campo full">
            <span className="prov-detalle-campo-label">Dirección</span>
            <span className="prov-detalle-campo-valor">
              {[proveedor.direccion, proveedor.ciudad, proveedor.departamento].filter(Boolean).join(', ') || '—'}
            </span>
          </div>
        </div>
      </div>

      {tieneCondiciones && (
        <div className="prov-detalle-seccion">
          <div className="prov-detalle-seccion-header"><span>Condiciones comerciales</span></div>
          <div className="prov-detalle-contacto-grid">
            {proveedor.banco && (
              <div className="prov-detalle-campo">
                <span className="prov-detalle-campo-label">Banco</span>
                <span className="prov-detalle-campo-valor">{proveedor.banco}{proveedor.tipo_cuenta ? ` · ${proveedor.tipo_cuenta}` : ''}</span>
              </div>
            )}
            {proveedor.numero_cuenta && (
              <div className="prov-detalle-campo">
                <span className="prov-detalle-campo-label">Cuenta</span>
                <span className="prov-detalle-campo-valor">{proveedor.numero_cuenta}</span>
              </div>
            )}
            {proveedor.condiciones && (
              <div className="prov-detalle-campo full">
                <span className="prov-detalle-campo-label">Condiciones</span>
                <span className="prov-detalle-campo-valor">{proveedor.condiciones}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {puedeVerOrdenes && (
        <div className="prov-detalle-seccion">
          <div className="prov-detalle-seccion-header"><span>Últimas órdenes de compra</span></div>
          {cargandoOrdenes ? (
            <div className="prov-back-loading"><div className="prov-back-spinner" /><span>Cargando órdenes...</span></div>
          ) : ordenes.length === 0 ? (
            <p className="prov-back-empty">Sin órdenes de compra registradas.</p>
          ) : (
            <div className="prov-detalle-ordenes">
              {ordenes.slice(0, 5).map((o) => (
                <div key={o.id_compra} className="prov-orden-row">
                  <span className="prov-orden-dot" style={{ background: COLOR_ESTADO_ORDEN[o.estado] || 'var(--dvna-mid)' }} />
                  <div className="prov-orden-info">
                    <span className="prov-orden-numero">{o.numero_orden || `Orden #${o.id_compra}`}</span>
                    <span className="prov-orden-meta"><IconClock /> {o.fecha ? new Date(o.fecha).toLocaleDateString('es-CO') : '—'} · {o.estado}</span>
                  </div>
                  <span className="prov-orden-total">{fmt(o.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="prov-detalle-actions">
        {puedeEditar && (
          <button className="prov-detalle-btn-primary" onClick={() => onEditar(proveedor)}>
            <IconEdit /> Editar proveedor
          </button>
        )}
        {proveedor.telefono_celular && (
          <a className="prov-detalle-btn-secondary" href={`tel:${proveedor.telefono_celular}`}>
            <IconPhone /> Llamar
          </a>
        )}
        {puedeEstado && (
          <button className="prov-detalle-btn-secondary" onClick={() => onCambiarEstado(proveedor)}>
            {activo ? 'Desactivar proveedor' : 'Activar proveedor'}
          </button>
        )}
      </div>
    </div>
  );
}
