import ExportButtons from "../../../../shared/components/ExportButtons";
import RangoTexto from "./RangoTexto";
import { formatCurrency, getBadgeClass, MUTED } from "../../utils/dashboardHelpers";

export default function UltimasVentasCard({
  reporte, ventasRecientes,
  ventasRecientesPagina, setVentasRecientesPagina, ventasRecientesPorPagina,
}) {
  const totalPaginasVentasRecientes = Math.ceil(ventasRecientes.length / ventasRecientesPorPagina) || 1;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Últimas ventas</h3>
          {reporte && <p className="chart-subtitle"><RangoTexto reporte={reporte} /></p>}
        </div>
      </div>
      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Cliente</th>
              <th className="tbl-th">Producto</th>
              <th className="tbl-th">Total</th>
              <th className="tbl-th">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ventasRecientes.length === 0 ? (
              <tr><td className="tbl-td" colSpan={4} style={{ textAlign: "center", color: MUTED, fontStyle: "italic" }}>Sin ventas registradas aún.</td></tr>
            ) : ventasRecientes
                .slice((ventasRecientesPagina - 1) * ventasRecientesPorPagina, ventasRecientesPagina * ventasRecientesPorPagina)
                .map((venta) => (
              <tr key={`${venta.id_venta}-${venta.producto}`} className="tbl-row">
                <td className="tbl-td">{venta.cliente}</td>
                <td className="tbl-td">{venta.producto}</td>
                <td className="tbl-td">{formatCurrency(venta.total)}</td>
                <td className="tbl-td">
                  <span className={`tabla-badge ${getBadgeClass(venta.estado)}`}>{venta.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── NUEVO: solo aparece cuando hay más de una página (ej. un
            rango con muchas ventas) — sin filtro, sigue siendo un
            preview corto de 10 sin paginador, como siempre. ── */}
        {totalPaginasVentasRecientes > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setVentasRecientesPagina(p => Math.max(p - 1, 1))} disabled={ventasRecientesPagina === 1}>‹</button>
            {Array.from({ length: totalPaginasVentasRecientes }, (_, i) => i + 1).map(n => (
              <button key={n} className={`paginador-btn ${n === ventasRecientesPagina ? "paginador-btn-active" : ""}`} onClick={() => setVentasRecientesPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setVentasRecientesPagina(p => Math.min(p + 1, totalPaginasVentasRecientes))} disabled={ventasRecientesPagina === totalPaginasVentasRecientes}>›</button>
            <span className="paginador-info">Página {ventasRecientesPagina} de {totalPaginasVentasRecientes} · {ventasRecientes.length} ventas</span>
          </div>
        )}

        <div className="print-button-container">
          <ExportButtons
            datos={ventasRecientes}
            columnas={[
              { header: "Cliente", key: "cliente" },
              { header: "Producto", key: "producto" },
              { header: "Total", value: (v) => formatCurrency(v.total) },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="ultimas_ventas"
            titulo="Últimas ventas"
          />
        </div>
      </div>
    </div>
  );
}
