import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconEyeOpen } from "../../../../shared/components/Icons";

export default function ClientesTable({
  clientes, tienePerm, toggleEstadoCliente, toggleClientePermisoCuotas,
  setClienteDetalle, abrirEditarCliente, busqueda,
}) {
  return (
    <>
      <thead className="tbl-header">
        <tr>
          <th className="tbl-th">Documento</th>
          <th className="tbl-th">Cliente</th>
          <th className="tbl-th">Teléfono</th>
          <th className="tbl-th">Cuotas</th>
          {tienePerm('Clientes.estado') && <th className="tbl-th">Estado</th>}
          <th className="tbl-th">Acciones</th>
        </tr>
      </thead>
      <tbody className="tbl-body">
        {clientes.length === 0 ? (
          <tr><td colSpan="100%" className="tbl-td usuarios-empty-row">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay registros para mostrar."}</td></tr>
        ) : clientes.map(c => (
          <tr key={c.id_cliente} className="tbl-row">
            <td className="tbl-td"><span className="clientes-doc-badge">{c.tipo_doc} {c.documento}</span></td>
            <td className="tbl-td"><div className="clientes-user-info"><div className="clientes-user-name">{c.nombre}</div><div className="clientes-user-email">{c.email}</div></div></td>
            <td className="tbl-td clientes-phone-cell">{c.telefono || '—'}</td>
            <td className="tbl-td">
              {tienePerm('Clientes.editar')
                ? <span className={`tabla-status ${c.permiso_cuotas !== false ? "activo" : "inactivo"}`} onClick={() => toggleClientePermisoCuotas(c.id_cliente)} style={{ cursor: 'pointer' }} title="Click para cambiar">{c.permiso_cuotas !== false ? "Sí" : "No"}</span>
                : <span className={`tabla-status ${c.permiso_cuotas !== false ? "activo" : "inactivo"}`}>{c.permiso_cuotas !== false ? "Sí" : "No"}</span>
              }
            </td>
            {tienePerm('Clientes.estado') && (
              <td className="tbl-td"><StatusToggle id={c.id_cliente} estado={c.estado} onToggle={toggleEstadoCliente} showConfirmation={true} nombreRegistro={c.nombre} /></td>
            )}
            <td className="tbl-td">
              <div className="clientes-action-cell">
                <button className="clientes-action-btn clientes-view-btn" onClick={() => setClienteDetalle(c)} title="Ver detalles"><IconEyeOpen /></button>
                {tienePerm('Clientes.editar') && (
                  <button className="clientes-action-btn clientes-edit-btn" onClick={() => abrirEditarCliente(c)} title="Editar"><IconEdit /></button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
}
