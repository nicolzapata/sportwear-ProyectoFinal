import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconTrash } from "../../../../shared/components/Icons";

export default function ColoresTable({
  datosLista, tienePerm, toggleEstado, abrirEditar, eliminarColor,
  totalPaginas, pagina, setPagina, totalColores,
}) {
  return (
    <div className="tbl-frame">
    <div className="tbl-container">
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Nombre</th>
            <th className="tbl-th">HEX</th>
            {tienePerm('Colores.estado') && <th className="tbl-th">Estado</th>}
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {datosLista.map((c) => (
            <tr key={c.id_color} className="tbl-row">
              <td className="tbl-td">
                <div className="colores-name-cell">
                  <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: c.codigo_hex, border: "1px solid rgba(0,0,0,0.1)", marginRight: 8, flexShrink: 0 }} />
                  <span className="colores-name-text">{c.nombre}</span>
                </div>
              </td>
              <td className="tbl-td"><code className="colores-hex-code">{c.codigo_hex}</code></td>
              {tienePerm('Colores.estado') && (
                <td className="tbl-td"><StatusToggle id={c.id_color} estado={c.estado} onToggle={toggleEstado} nombreRegistro={c.nombre} /></td>
              )}
              <td className="tbl-td">
                <div className="colores-action-cell">
                  {tienePerm('Colores.editar') && (
                    <button className="colores-action-btn colores-edit-btn" onClick={() => abrirEditar(c)} title="Editar"><IconEdit /></button>
                  )}
                  {tienePerm('Colores.eliminar') && (
                    <button className="colores-action-btn colores-deactivate-btn" onClick={() => eliminarColor(c.id_color)} title="Eliminar"><IconTrash /></button>
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
          <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalColores} registros</span>
        </div>
      )}
    </div>
    </div>
  );
}
