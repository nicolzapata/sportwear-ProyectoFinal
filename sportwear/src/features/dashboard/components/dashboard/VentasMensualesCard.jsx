import SalesBarChart from "./SalesBarChart";
import RangoTexto from "./RangoTexto";
import { CHARCOAL, MUTED } from "../../utils/dashboardHelpers";

export default function VentasMensualesCard({ reporte, periodoVentas, setPeriodoVentas, ventasData }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Ventas mensuales</h3>
          <p className="chart-subtitle">
            {reporte
              ? <RangoTexto reporte={reporte} />
              : <>Acumulado por mes {periodoVentas === "actual" ? "— año actual" : "— año anterior"}</>}
          </p>
        </div>
        {/* ── NUEVO: con un rango activo no hay serie de "año anterior"
            que comparar, así que el botón se oculta en vez de mostrar
            un toggle que no haría nada. ── */}
        {!reporte && (
          <button className="period-badge" onClick={() => setPeriodoVentas(p => p === "actual" ? "anterior" : "actual")}>
            {periodoVentas === "actual"
              ? (reporte ? "Ver mismo rango, año anterior" : "Ver año anterior")
              : (reporte ? "Ver rango actual" : "Ver año actual")}
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 10, color: MUTED, fontFamily: "'Jost', sans-serif" }}>
        <span>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: CHARCOAL, marginRight: 5, verticalAlign: "middle" }} />
          {reporte ? "En el rango" : (periodoVentas === "actual" ? "Este año" : "Año anterior")}
        </span>
      </div>
      <SalesBarChart
        key={`ventas-${periodoVentas}`}
        labels={ventasData.labels}
        values={periodoVentas === "actual" ? ventasData.current : ventasData.previous}
        seriesLabel={periodoVentas === "actual" ? "Este año" : "Año anterior"}
      />
    </div>
  );
}
