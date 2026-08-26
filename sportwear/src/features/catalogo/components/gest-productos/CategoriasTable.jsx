import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconEye, IconTag } from "../../../../shared/components/Icons";

export default function CategoriasTable({
  categoriasPagina, tienePerm,
  ordenCategorias, setOrdenCategorias,
  abrirDetalleCategoria, abrirEditarCategoria, cambiarEstadoCategoria,
  totalPaginasCategorias, paginaCategorias, setPaginaCategorias, totalCategorias,
}) {
  return (
    <div className="gestproductos-table-container">
      <div className="gestproductos-orden-bar">
        <select id="ordenCategorias" className="gestproductos-form-select gestproductos-orden-select" value={ordenCategorias} onChange={e => setOrdenCategorias(e.target.value)}>
          <option value="nombre">Nombre (A-Z)</option>
          <option value="fecha">Más recientes primero</option>
        </select>
      </div>
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Nombre</th>
            <th className="tbl-th">Productos</th>
            {tienePerm('Categorias.estado') && <th className="tbl-th">Estado</th>}
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {categoriasPagina.length === 0 ? (
            <tr><td colSpan={4} className="gestproductos-empty-row">No se encontraron categorías.</td></tr>
          ) : categoriasPagina.map((c) => (
            <tr key={c.id_categoria} className="tbl-row">
              <td className="tbl-td">
                <div className="catproductos-categoria-cell">
                  <div className="catproductos-categoria-avatar"><IconTag /></div>
                  <span className="catproductos-categoria-name">{c.nombre}</span>
                </div>
              </td>
              <td className="tbl-td">{c.total_productos ?? 0}</td>
              {tienePerm('Categorias.estado') && (
                <td className="tbl-td">
                  <StatusToggle id={c.id_categoria} estado={c.estado} onToggle={cambiarEstadoCategoria} showConfirmation={true} nombreRegistro={c.nombre} />
                </td>
              )}
              <td className="tbl-td">
                <div className="catproductos-action-cell">
                  <button className="catproductos-action-btn catproductos-view-btn" onClick={() => abrirDetalleCategoria(c)} title="Ver detalle"><IconEye /></button>
                  {tienePerm('Categorias.editar') && (
                    <button className="catproductos-action-btn catproductos-edit-btn" onClick={() => abrirEditarCategoria(c)} title="Editar"><IconEdit /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPaginasCategorias > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPaginaCategorias(p => Math.max(p - 1, 1))} disabled={paginaCategorias === 1}>‹</button>
          {Array.from({ length: totalPaginasCategorias }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === paginaCategorias ? "paginador-btn-active" : ""}`} onClick={() => setPaginaCategorias(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPaginaCategorias(p => Math.min(p + 1, totalPaginasCategorias))} disabled={paginaCategorias === totalPaginasCategorias}>›</button>
          <span className="paginador-info">Página {paginaCategorias} de {totalPaginasCategorias} · {totalCategorias} registros</span>
        </div>
      )}
    </div>
  );
}
