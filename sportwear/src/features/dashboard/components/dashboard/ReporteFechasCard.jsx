import ExportButtons from "../../../../shared/components/ExportButtons";
import { hoyISO, formatCurrency } from "../../utils/dashboardHelpers";

// ── Reporte de ventas por rango de fechas ──
export default function ReporteFechasCard({
  reporteDesde, setReporteDesde, reporteHasta, setReporteHasta,
  generarReporte, cargandoReporte, reporte, quitarFiltro, errorReporte,
}) {
  return (
    <div className="chart-card dashboard-reporte-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Reporte por fechas</h3>
          <p className="chart-subtitle">Consulta las ventas de un rango específico y exporta el resultado</p>
        </div>
      </div>

      <div className="reporte-filtros">
        <div className="reporte-filtro-campo">
          <label>Desde</label>
          <input
            type="date"
            className="reporte-input"
            value={reporteDesde}
            max={reporteHasta || hoyISO()}
            onChange={(e) => setReporteDesde(e.target.value)}
          />
        </div>
        <div className="reporte-filtro-campo">
          <label>Hasta</label>
          <input
            type="date"
            className="reporte-input"
            value={reporteHasta}
            min={reporteDesde || undefined}
            // ── NUEVO: "Hasta" no puede ser una fecha futura — antes no
            // tenía ningún límite superior y dejaba, por ejemplo, generar
            // un reporte hasta el año 2027. ──
            max={hoyISO()}
            onChange={(e) => setReporteHasta(e.target.value)}
          />
        </div>
        <button className="btn-generar-reporte" onClick={generarReporte} disabled={cargandoReporte}>
          {cargandoReporte ? "Consultando..." : "Generar reporte"}
        </button>
        {/* ── NUEVO: solo aparece con un filtro activo — quita el rango y
            devuelve todo el dashboard a su modo normal. ── */}
        {reporte && (
          <button
            onClick={quitarFiltro}
            disabled={cargandoReporte}
            style={{
              fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.06em", color: "var(--dvna-charcoal)",
              background: "var(--dvna-white)", border: "0.5px solid var(--dvna-border)",
              borderRadius: 8, padding: "9px 18px", cursor: cargandoReporte ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Quitar filtro
          </button>
        )}
      </div>

      {errorReporte && <p className="reporte-error">{errorReporte}</p>}

      {/* ── CORREGIDO: antes esta tarjeta generaba su PROPIA tabla de
          resultados (con totales y filas), separada de todo lo demás —
          eso era contenido nuevo empujando el resto del dashboard hacia
          abajo. Los resultados del rango ya se ven en su lugar de
          siempre: las tarjetas de KPI, "Top productos" y "Últimas
          ventas" (junto a "Balance") — esta tarjeta ya no necesita
          mostrar nada más que el botón para exportar el rango completo. ── */}
      {reporte && reporte.ventas.length > 0 && (
        <div className="print-button-container">
          <ExportButtons
            datos={reporte.ventas}
            columnas={[
              { header: "Fecha", value: (v) => new Date(v.fecha).toLocaleDateString("es-CO", { timeZone: "UTC" }) },
              { header: "Cliente", key: "cliente" },
              { header: "Método de pago", value: (v) => v.metodo_pago || "—" },
              { header: "Total", value: (v) => formatCurrency(v.total) },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo={`reporte_ventas_${reporte.desde}_a_${reporte.hasta}`}
            titulo={`Reporte de ventas — ${reporte.desde} a ${reporte.hasta}`}
          />
        </div>
      )}
    </div>
  );
}
