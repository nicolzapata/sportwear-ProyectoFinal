import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconEyeOpen } from "../../../../shared/components/Icons";

export default function UsuariosTable({
  usuarios, tienePerm, esRolAdmin, getRoleName, usuarioActual,
  toggleEstadoUsuario, abrirDetalle, abrirEditar, busqueda,
}) {
  return (
    <>
      <thead className="tbl-header">
        <tr>
          <th className="tbl-th">Documento</th>
          <th className="tbl-th">Usuario</th>
          <th className="tbl-th">Email</th>
          <th className="tbl-th">Rol</th>
          {tienePerm('Usuarios.estado') && <th className="tbl-th">Estado</th>}
          <th className="tbl-th">Acciones</th>
        </tr>
      </thead>
      <tbody className="tbl-body">
        {usuarios.length === 0 ? (
          <tr><td colSpan="100%" className="tbl-td usuarios-empty-row">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay registros para mostrar."}</td></tr>
        ) : usuarios.map(u => (
          <tr key={u.id_usuario} className="tbl-row">
            <td className="tbl-td">{u.documento ? <span className="clientes-doc-badge">{u.tipo_doc} {u.documento}</span> : "—"}</td>
            <td className="tbl-td"><div className="usuarios-user-info"><div className="usuarios-user-name">{u.nombre}</div></div></td>
            <td className="tbl-td usuarios-email-cell">{u.email}</td>
            <td className="tbl-td"><span className="tabla-rol">{u.rol || getRoleName(u.id_rol)}</span></td>
            {tienePerm('Usuarios.estado') && (
              <td className="tbl-td">
                <StatusToggle
                  id={u.id_usuario}
                  estado={u.estado}
                  onToggle={toggleEstadoUsuario}
                  showConfirmation={true}
                  disabled={esRolAdmin(u.id_rol)}
                  disabledReason="Un administrador siempre permanece activo"
                  nombreRegistro={u.nombre}
                />
              </td>
            )}
            <td className="tbl-td">
              <div className="usuarios-action-cell">
                <button className="usuarios-action-btn usuarios-view-btn" onClick={() => abrirDetalle(u)} title="Ver detalles"><IconEyeOpen /></button>
                {tienePerm('Usuarios.editar') && u.id_usuario !== usuarioActual?.id_usuario && (
                  <button className="usuarios-action-btn usuarios-edit-btn" onClick={() => abrirEditar(u)} title="Editar"><IconEdit /></button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
}
