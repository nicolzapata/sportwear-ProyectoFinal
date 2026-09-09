import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { IconChevronRight } from "../../../../shared/components/Icons";

export default function ClienteListItem({ cliente, seleccionado, onSeleccionar }) {
  const activo = cliente.estado === 'Activo';

  return (
    <button
      type="button"
      className={`usr-item${seleccionado ? ' seleccionado' : ''}`}
      onClick={() => onSeleccionar(cliente.id_cliente)}
    >
      <div className="usr-item-top">
        <span className="usr-item-avatar" style={{ background: getAvatarColor(cliente.id_cliente) }}>{getInitials(cliente.nombre)}</span>
        <div className="usr-item-info">
          <span className="usr-item-nombre">{cliente.nombre}</span>
          <p className="usr-item-desc">{cliente.email || cliente.telefono || '—'}</p>
        </div>
        <span className="usr-item-ver">
          {seleccionado ? 'Viendo detalle' : 'Ver detalle'}
          <IconChevronRight />
        </span>
      </div>
      <div className="usr-item-bottom">
        <span className={`usr-item-estado ${activo ? 'estado-activo' : 'estado-inactivo'}`}>
          <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>
          {cliente.estado}
        </span>
        <span className="usr-item-doc">{cliente.documento ? `${cliente.tipo_doc} ${cliente.documento}` : '—'}</span>
        <span className="usr-item-rol">{cliente.permiso_cuotas !== false ? 'Cuotas: Sí' : 'Cuotas: No'}</span>
      </div>
    </button>
  );
}
