import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { IconChevronRight } from "../../../../shared/components/Icons";

export default function UsuarioListItem({ usuario, getRoleName, seleccionado, onSeleccionar }) {
  const activo = usuario.estado === 'Activo';

  return (
    <button
      type="button"
      className={`usr-item${seleccionado ? ' seleccionado' : ''}`}
      onClick={() => onSeleccionar(usuario.id_usuario)}
    >
      <div className="usr-item-top">
        <span className="usr-item-avatar" style={{ background: getAvatarColor(usuario.id_usuario) }}>{getInitials(usuario.nombre)}</span>
        <div className="usr-item-info">
          <span className="usr-item-nombre">{usuario.nombre}</span>
          <p className="usr-item-desc">{usuario.email}</p>
        </div>
        <span className="usr-item-ver">
          {seleccionado ? 'Viendo detalle' : 'Ver detalle'}
          <IconChevronRight />
        </span>
      </div>
      <div className="usr-item-bottom">
        <span className={`usr-item-estado ${activo ? 'estado-activo' : 'estado-inactivo'}`}>
          <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>
          {usuario.estado}
        </span>
        <span className="usr-item-doc">{usuario.documento ? `${usuario.tipo_doc} ${usuario.documento}` : '—'}</span>
        <span className="usr-item-rol">{usuario.rol || getRoleName(usuario.id_rol)}</span>
      </div>
    </button>
  );
}
