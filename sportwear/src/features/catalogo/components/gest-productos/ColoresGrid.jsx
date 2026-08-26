import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconTrash } from "../../../../shared/components/Icons";

export default function ColoresGrid({
  coloresPagina, tienePerm,
  cambiarEstadoColor, abrirEditarColor, setEliminarColorId,
  totalPaginasColores, paginaColores, setPaginaColores, totalColores,
}) {
  return (
    <div className="gestproductos-table-container">
      {coloresPagina.length === 0 ? (
        <p style={{ color: "var(--dvna-muted)", fontSize: 13, padding: 24 }}>No se encontraron colores.</p>
      ) : (
        <div className="gestproductos-colores-grid">
          {coloresPagina.map((c) => (
            <div key={c.id_color} className="gestproductos-colores-card">
              <div className="gestproductos-colores-swatch" style={{ backgroundColor: c.codigo_hex }} />
              <div className="gestproductos-colores-info">
                <div className="gestproductos-colores-name">{c.nombre}</div>
                <div className="gestproductos-colores-hex">{c.codigo_hex}</div>
                <div className="gestproductos-colores-actions">
                  {tienePerm('Colores.estado') ? (
                    <StatusToggle id={c.id_color} estado={c.estado} onToggle={cambiarEstadoColor} showConfirmation={true} size="sm" nombreRegistro={c.nombre} />
                  ) : (
                    <span className={`tabla-status ${c.estado === "Activo" ? "activo" : "inactivo"}`}>{c.estado}</span>
                  )}
                  <div className="gestproductos-colores-actions-btns">
                    {tienePerm('Colores.editar') && (
                      <button className="catproductos-action-btn catproductos-edit-btn" style={{ width: 28, height: 28 }} onClick={() => abrirEditarColor(c)} title="Editar"><IconEdit /></button>
                    )}
                    {tienePerm('Colores.eliminar') && (
                      <button className="catproductos-action-btn catproductos-deactivate-btn" style={{ width: 28, height: 28 }} onClick={() => setEliminarColorId(c.id_color)} title="Eliminar"><IconTrash /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPaginasColores > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPaginaColores(p => Math.max(p - 1, 1))} disabled={paginaColores === 1}>‹</button>
          {Array.from({ length: totalPaginasColores }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === paginaColores ? "paginador-btn-active" : ""}`} onClick={() => setPaginaColores(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPaginaColores(p => Math.min(p + 1, totalPaginasColores))} disabled={paginaColores === totalPaginasColores}>›</button>
          <span className="paginador-info">Página {paginaColores} de {totalPaginasColores} · {totalColores} registros</span>
        </div>
      )}
    </div>
  );
}
