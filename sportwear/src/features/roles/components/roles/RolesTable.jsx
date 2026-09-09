import { PALETAS, esRolProtegido, getRoleIcon, formatFecha } from "../../utils/rolesHelpers";
import { IconEdit } from "../../../../shared/components/Icons";

export default function RolesTable({ roles, onEditar, onCambiarEstado, puedeEditar, puedeEstado, busqueda }) {
  return (
    <>
      <thead className="tbl-header">
        <tr>
          <th className="tbl-th">Rol</th>
          <th className="tbl-th">Estado</th>
          <th className="tbl-th">Usuarios</th>
          <th className="tbl-th">Creado</th>
          <th className="tbl-th">Acciones</th>
        </tr>
      </thead>
      <tbody className="tbl-body">
        {roles.length === 0 ? (
          <tr><td colSpan="100%" className="tbl-td roles-tabla-empty">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay roles para mostrar."}</td></tr>
        ) : roles.map((r, i) => {
          const color = PALETAS[i % PALETAS.length];
          const protegido = esRolProtegido(r.nombre);
          const activo = r.estado === 'Activo';
          const mostrarAcciones = puedeEditar || puedeEstado;
          return (
            <tr key={r.id_rol} className="tbl-row">
              <td className="tbl-td">
                <div className="roles-tabla-rol">
                  <span className="roles-tabla-icon" style={{ background: color }}>{getRoleIcon(r.nombre)}</span>
                  <span className="roles-tabla-nombre">{r.nombre}</span>
                  {protegido && <span className="roles-tabla-protegido">protegido</span>}
                </div>
              </td>
              <td className="tbl-td">
                <span className={`roles-tabla-estado ${activo ? 'estado-activo' : 'estado-inactivo'}`}>
                  <svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
                  {r.estado}
                </span>
              </td>
              <td className="tbl-td">{r.usuarios_activos ?? 0}</td>
              <td className="tbl-td">{formatFecha(r.fecha_creacion)}</td>
              <td className="tbl-td">
                {mostrarAcciones ? (
                  <div className="roles-tabla-acciones">
                    {puedeEditar && (
                      <button
                        className={`roles-tabla-btn${protegido ? ' roles-tabla-btn-disabled' : ''}`}
                        onClick={() => !protegido && onEditar(r)}
                        disabled={protegido}
                        title={protegido ? 'Rol protegido — no editable' : 'Editar'}
                      ><IconEdit /></button>
                    )}
                    {puedeEstado && (
                      <button
                        className={`roles-tabla-btn ${protegido ? 'roles-tabla-btn-disabled' : (activo ? 'roles-tabla-btn-danger' : 'roles-tabla-btn-success')}`}
                        onClick={() => !protegido && onCambiarEstado(r)}
                        disabled={protegido}
                        title={protegido ? 'Rol protegido — no editable' : (activo ? 'Desactivar' : 'Activar')}
                      >
                        {activo ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="roles-tabla-sin-acciones">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </>
  );
}
