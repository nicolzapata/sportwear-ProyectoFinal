import { IconEye } from "../../../../shared/components/Icons";
import EstadoDropdownPago from "./EstadoDropdownPago";
import { fmt, getMetodoIcon, getTipoLabel, esAccionablePorOrden } from "../../utils/pagosAbonosHelpers";

export default function PagosTable({
  datos, cargando, tienePerm,
  filaAbierta, setFilaAbierta, cambiandoEstado, cambiarEstadoPago,
  setVerDetalle,
  totalPaginas, pagina, setPagina, totalPagos,
}) {
  return (
    <div className="tbl-frame">
    <div className="tbl-container" style={{ opacity: cargando ? 0.6 : 1, transition: "opacity 0.15s" }}>
      <table className="tbl">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th">Venta</th>
            <th className="tbl-th">Cliente</th>
            <th className="tbl-th">Monto</th>
            <th className="tbl-th">Tipo</th>
            <th className="tbl-th">Método</th>
            <th className="tbl-th">Fecha</th>
            <th className="tbl-th">Estado</th>
            <th className="tbl-th">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {datos.map((p) => (
            <tr key={p.id_pago} className="tbl-row">
              <td className="tbl-td"><span className="pagosabonos-venta-badge">V-{String(p.id_venta).padStart(3, "0")}</span></td>
              <td className="tbl-td"><span className="pagosabonos-cliente-name">{p.cliente}</span></td>
              <td className="tbl-td pagosabonos-monto-cell">{fmt(p.monto)}</td>
              <td className="tbl-td pagosabonos-tipo-cell">{getTipoLabel(p)}</td>
              <td className="tbl-td">
                <span className="pagosabonos-metodo">
                  <span className="pagosabonos-metodo-icon">{getMetodoIcon(p.metodo)}</span>
                  {p.metodo}
                </span>
              </td>
              <td className="tbl-td pagosabonos-fecha-cell">{p.fecha?.toString().split("T")[0]}</td>
              <td className="tbl-td">
                <EstadoDropdownPago
                  pago={p}
                  abierto={filaAbierta === p.id_pago}
                  onToggle={setFilaAbierta}
                  onCambiar={cambiarEstadoPago}
                  cambiando={cambiandoEstado}
                  tienePerm={tienePerm}
                  accionable={esAccionablePorOrden(p, datos)}
                  proximasCuotas={
                    p.num_cuota
                      ? datos
                          .filter((otro) => otro.id_venta === p.id_venta && otro.num_cuota > p.num_cuota && otro.estado === "Pendiente")
                          .sort((a, b) => a.num_cuota - b.num_cuota)
                          .slice(0, 3)
                      : []
                  }
                />
              </td>
              <td className="tbl-td">
                <div className="pagosabonos-action-cell">
                  <button className="pagosabonos-action-btn pagosabonos-view-btn" onClick={() => setVerDetalle(p)}><IconEye /></button>
                </div>
              </td>
            </tr>
          ))}
          {datos.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay pagos que coincidan con la búsqueda.</td></tr>
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
          <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalPagos} registros</span>
        </div>
      )}
    </div>
    </div>
  );
}
