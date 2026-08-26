import { IconEdit, IconEye, IconSearch } from "../../../../shared/components/Icons";
import EstadoDropdownCompra from "./EstadoDropdownCompra";
import { fmt } from "../../utils/comprasHelpers";

export default function ComprasTable({
  compras, tienePerm,
  filaAbierta, setFilaAbierta, cambiandoEstadoTabla, cambiarEstadoDesdeTabla,
  abrirDetalle, abrirEdicion,
  totalPaginas, pagina, setPagina, totalCompras,
}) {
  return (
    <div className="tbl-container compras-tbl-container">
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Proveedor</th>
            <th className="tbl-th">N° Orden</th>
            <th className="tbl-th">Productos</th>
            <th className="tbl-th">Total</th>
            <th className="tbl-th">Fecha</th>
            <th className="tbl-th">Estado</th>
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {compras.map((c) => (
            <tr key={c.id_compra} className="tbl-row">
              <td className="tbl-td"><span className="compras-proveedor-name">{c.proveedor}</span></td>
              <td className="tbl-td">{c.numero_orden || "—"}</td>
              <td className="tbl-td">{c.items?.length || 0} producto{c.items?.length !== 1 ? 's' : ''}</td>
              <td className="tbl-td compras-total-cell">{fmt(c.total)}</td>
              <td className="tbl-td compras-fecha-cell">{c.fecha?.toString().split("T")[0]}</td>
              <td className="tbl-td">
                <EstadoDropdownCompra
                  compra={c}
                  abierto={filaAbierta === c.id_compra}
                  onToggle={setFilaAbierta}
                  onCambiar={cambiarEstadoDesdeTabla}
                  cambiando={cambiandoEstadoTabla}
                  tienePerm={tienePerm}
                />
              </td>
              <td className="tbl-td">
                <div className="compras-action-cell">
                  <button className="compras-action-btn compras-view-btn" onClick={() => abrirDetalle(c)} title="Ver detalles">
                    <IconEye />
                  </button>
                  {tienePerm('Compras.editar') && c.estado !== "Anulado" ? (
                    <button className="compras-action-btn compras-edit-btn" onClick={() => abrirEdicion(c)} title="Editar estado">
                      <IconEdit />
                    </button>
                  ) : tienePerm('Compras.editar') && (
                    // ── NUEVO: en vez de desaparecer y dejar un hueco en blanco,
                    // el botón se muestra deshabilitado — la columna Acciones
                    // se ve consistente en todas las filas. ──
                    <button className="compras-action-btn compras-edit-btn" disabled title="No se puede editar una compra anulada">
                      <IconEdit />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {compras.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 0 }}>
                <div className="compras-empty-state"><IconSearch /><p>No hay compras que coincidan con la búsqueda.</p></div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPagina((p) => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
          <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalCompras} registros</span>
        </div>
      )}
    </div>
  );
}
