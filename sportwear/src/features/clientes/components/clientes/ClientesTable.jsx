import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconEye } from "../../../../shared/components/Icons";

export default function ClientesTable({
  datos, tienePerm, toggleEstado, setVerDetalle, abrirEditar,
  totalPaginas, pagina, setPagina, totalClientes,
}) {
  return (
    <div className="tbl-container">
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Cliente</th>
            <th className="tbl-th">Documento</th>
            <th className="tbl-th">Teléfono</th>
            <th className="tbl-th">Compras</th>
            <th className="tbl-th">Total</th>
            {tienePerm('Clientes.estado') && <th className="tbl-th">Estado</th>}
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {datos.length === 0 ? (
            <tr><td colSpan="8" className="tbl-td">No hay clientes con compras registradas</td></tr>
          ) : datos.map((c) => (
            <tr key={c.id_cliente} className="tbl-row">
              <td className="tbl-td"><div className="clientes-user-info"><div className="clientes-user-name">{c.nombre}</div><div className="clientes-user-email">{c.email}</div></div></td>
              <td className="tbl-td"><span className="tabla-doc">{c.tipo_doc} {c.documento}</span></td>
              <td className="tbl-td clientes-phone-cell">{c.telefono || '—'}</td>
              <td className="tbl-td">{c.total_compras || 0}</td>
              <td className="tbl-td">${Number(c.total_gastado || 0).toLocaleString('es-CO')}</td>
              {tienePerm('Clientes.estado') && (
                <td className="tbl-td"><StatusToggle id={c.id_cliente} estado={c.estado} onToggle={toggleEstado} showConfirmation={true} nombreRegistro={c.nombre} /></td>
              )}
              <td className="tbl-td">
                <div className="clientes-action-cell">
                  <button className="clientes-action-btn clientes-view-btn" onClick={() => setVerDetalle(c)} title="Ver detalles"><IconEye /></button>
                  {tienePerm('Clientes.editar') && (
                    <button className="clientes-action-btn clientes-edit-btn" onClick={() => abrirEditar(c)} title="Editar"><IconEdit /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
          <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalClientes} registros</span>
        </div>
      )}
    </div>
  );
}
