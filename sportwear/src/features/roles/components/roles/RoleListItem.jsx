import { PALETAS, esRolProtegido, getRoleIcon } from "../../utils/rolesHelpers";
import { IconChevronRight } from "../../../../shared/components/Icons";

export default function RoleListItem({ rol, index, seleccionado, totalPermisos, onSeleccionar }) {
  const color = PALETAS[index % PALETAS.length];
  const protegido = esRolProtegido(rol.nombre);
  const activo = rol.estado === 'Activo';
  const permisosOtorgados = Number(rol.permisos_count) || 0;

  return (
    <button
      type="button"
      className={`role-item${seleccionado ? ' seleccionado' : ''}`}
      onClick={() => onSeleccionar(rol.id_rol)}
    >
      <div className="role-item-top">
        <span className="role-item-icon" style={{ background: color }}>{getRoleIcon(rol.nombre)}</span>
        <div className="role-item-info">
          <div className="role-item-nombre-row">
            <span className="role-item-nombre">{rol.nombre}</span>
            {protegido && <span className="role-item-badge">Protegido</span>}
          </div>
          {rol.descripcion && <p className="role-item-desc">{rol.descripcion}</p>}
        </div>
        <span className="role-item-ver">
          {seleccionado ? 'Viendo detalle' : 'Ver detalle'}
          <IconChevronRight />
        </span>
      </div>
      <div className="role-item-bottom">
        <span className={`role-item-estado ${activo ? 'estado-activo' : 'estado-inactivo'}`}>
          <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor" /></svg>
          {rol.estado}
        </span>
        <span className="role-item-usuarios">
          {rol.usuarios_activos ?? 0} usuario{Number(rol.usuarios_activos) !== 1 ? 's' : ''} asignado{Number(rol.usuarios_activos) !== 1 ? 's' : ''}
        </span>
        <span className="role-item-permisos">{permisosOtorgados}/{totalPermisos} permisos</span>
      </div>
    </button>
  );
}
