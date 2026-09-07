import { IconEye, IconBox, IconEdit } from "../../../../shared/components/Icons";
import { getPagoBadge, getPagoTexto, ESTADOS_EDITABLES } from "../../utils/pedidosHelpers";
import EstadoDropdown from "./EstadoDropdown";

export default function PedidosTable({
  datos, cargando, filaAbierta, setFilaAbierta, cambiarEstado, cambiando, tienePerm, abrirDetalle, abrirEditar,
  totalPaginas, pagina, setPagina, total,
}) {
  return (
    <div className="tbl-frame">
    <div className="tbl-container pedidos-tbl-container" style={{ opacity: cargando ? 0.6 : 1, transition: "opacity 0.15s" }}>
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Cliente</th>
            <th className="tbl-th">Documento</th>
            <th className="tbl-th">Productos</th>
            <th className="tbl-th">Dirección</th>
            <th className="tbl-th">Actualizado</th>
            <th className="tbl-th">Pago</th>
            <th className="tbl-th">Envío</th>
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {datos.map((p) => (
            <tr key={p.id_pedido} className="tbl-row">
              <td className="tbl-td pedidos-cliente-cell" title={p.cliente}>{p.cliente}</td>
              <td className="tbl-td">{p.cliente_documento || "—"}</td>
              <td className="tbl-td pedidos-producto-cell" title={p.items?.map(i => i.producto).filter(Boolean).join(', ')}>
                {p.items?.map(i => i.producto).filter(Boolean).join(', ') || '-'}
              </td>
              <td className="tbl-td pedidos-direccion-cell" title={p.direccion_entrega}>{p.direccion_entrega || "—"}</td>
              <td className="tbl-td">{p.fecha_actualizacion?.toString().split("T")[0]}</td>
              <td className="tbl-td">
                <span className={`pedidos-badge ${getPagoBadge(p.estado_venta)}`}>{getPagoTexto(p.estado_venta)}</span>
              </td>
              <td className="tbl-td">
                <EstadoDropdown
                  pedido={p}
                  abierto={filaAbierta === p.id_pedido}
                  onToggle={setFilaAbierta}
                  onCambiar={cambiarEstado}
                  cambiando={cambiando}
                  tienePerm={tienePerm}
                />
              </td>
              <td className="tbl-td">
                <div className="pedidos-action-cell">
                  <button className="pedidos-action-btn pedidos-view-btn" onClick={() => abrirDetalle(p)} title="Ver detalle">
                    <IconEye />
                  </button>
                  {tienePerm('Pedidos.editar') && (
                    <button
                      className="pedidos-action-btn pedidos-edit-btn"
                      onClick={() => abrirEditar(p)}
                      disabled={!ESTADOS_EDITABLES.includes(p.estado_pedido)}
                      title={ESTADOS_EDITABLES.includes(p.estado_pedido) ? "Editar pedido" : `No se puede editar un pedido "${p.estado_pedido}"`}
                    >
                      <IconEdit />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {datos.length === 0 && (
            <tr><td colSpan={8} style={{ padding: 0 }}>
              <div className="pedidos-empty-state"><IconBox /><p>No hay pedidos registrados.</p></div>
            </td></tr>
          )}
        </tbody>
      </table>

      {totalPaginas > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
          <span className="paginador-info">Página {pagina} de {totalPaginas} · {total} registros</span>
        </div>
      )}
    </div>
    </div>
  );
}
