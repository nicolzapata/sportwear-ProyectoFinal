import { IconDollar, IconEye } from "../../../../shared/components/Icons";
import EstadoDropdownVenta from "./EstadoDropdownVenta";
import { fmt } from "../../utils/pedidosVentasHelpers";

export default function VentasTable({
  datos, cargando, tienePerm,
  filaAbierta, setFilaAbierta, cambiandoEstado, cambiarEstado,
  setVerDetalle, setAbonosModal,
  totalPaginas, pagina, setPagina, total,
}) {
  return (
    <div className="tbl-container pedidosventas-tbl-container" style={{ opacity: cargando ? 0.6 : 1, transition: "opacity 0.15s" }}>
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Cliente</th>
            <th className="tbl-th">Producto</th>
            <th className="tbl-th">Total</th>
            <th className="tbl-th">Tipo</th>
            <th className="tbl-th">Pago</th>
            <th className="tbl-th">Fecha</th>
            <th className="tbl-th">Estado</th>
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {datos.map((v) => {
            const cantTotal = v.items?.reduce((sum, i) => sum + i.cantidad, 0) || 0;
            const saldo = v.total - (v.total_pagado || 0);
            const pct = v.total > 0 ? Math.min(100, Math.round(((v.total_pagado || 0) / v.total) * 100)) : 0;
            return (
            <tr key={v.id_venta} className="tbl-row">
              <td className="tbl-td"><span className="pedidosventas-cliente-name">{v.cliente}</span></td>
              <td className="tbl-td pedidosventas-producto-cell">
                {v.items?.map(i => i.producto).filter(Boolean).join(', ') || '-'}
                {cantTotal > 0 && <span className="pedidosventas-producto-cant"> · {cantTotal} uds</span>}
              </td>
              <td className="tbl-td pedidosventas-total-cell">{fmt(v.total)}</td>
              <td className="tbl-td">
                {v.tipo_pago === 'cuotas'
                  ? <span className="pedidosventas-badge pedidosventas-badge-info">Cuotas ({v.num_cuotas})</span>
                  : <span className="pedidosventas-badge">Completo</span>}
              </td>
              <td className="tbl-td">
                <button className="pedidosventas-pago-cell" onClick={() => setAbonosModal(v)} title="Ver abonos">
                  <div className="pedidosventas-pago-bar-track">
                    <div className="pedidosventas-pago-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="pedidosventas-pago-textos">
                    <span className="pedidosventas-pago-abonado">{fmt(v.total_pagado || 0)}</span>
                    <span className="pedidosventas-pago-saldo">{saldo > 0 ? `Saldo ${fmt(saldo)}` : 'Sin saldo'}</span>
                  </div>
                </button>
              </td>
              <td className="tbl-td pedidosventas-fecha-cell">{v.fecha?.toString().split("T")[0]}</td>
              <td className="tbl-td">
                <EstadoDropdownVenta
                  venta={v}
                  abierto={filaAbierta === v.id_venta}
                  onToggle={setFilaAbierta}
                  onCambiar={cambiarEstado}
                  cambiando={cambiandoEstado}
                  tienePerm={tienePerm}
                />
              </td>
              <td className="tbl-td">
                <div className="pedidosventas-action-cell">
                  <button className="pedidosventas-action-btn pedidosventas-view-btn" onClick={() => setVerDetalle(v)}><IconEye /></button>
                </div>
              </td>
            </tr>
            );
          })}
          {datos.length === 0 && (
            <tr><td colSpan={8} style={{ padding: 0 }}>
              <div className="pedidosventas-empty-state"><IconDollar /><p>No hay ventas registradas.</p></div>
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
  );
}
