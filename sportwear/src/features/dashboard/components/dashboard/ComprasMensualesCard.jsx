import SalesBarChart from "./SalesBarChart";
import RangoTexto from "./RangoTexto";

export default function ComprasMensualesCard({ reporte, periodoCompras, setPeriodoCompras, comprasData }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Compras mensuales</h3>
          <p className="chart-subtitle">
            {reporte
              ? <RangoTexto reporte={reporte} />
              : <>Acumulado por mes {periodoCompras === "actual" ? "— año actual" : "— año anterior"}</>}
          </p>
        </div>
        {!reporte && (
          <button className="period-badge" onClick={() => setPeriodoCompras(p => p === "actual" ? "anterior" : "actual")}>
            {periodoCompras === "actual"
              ? (reporte ? "Ver mismo rango, año anterior" : "Ver año anterior")
              : (reporte ? "Ver rango actual" : "Ver año actual")}
          </button>
        )}
      </div>
      <SalesBarChart
        key={`compras-${periodoCompras}`}
        labels={comprasData.labels}
        values={periodoCompras === "actual" ? comprasData.current : comprasData.previous}
        seriesLabel={periodoCompras === "actual" ? "Este año" : "Año anterior"}
      />
    </div>
  );
}
