import DonutChart from "./DonutChart";
import RangoTexto from "./RangoTexto";
import { IconDollar, IconUsers, IconShoppingCart } from "../../../../shared/components/Icons";
import { formatCurrency } from "../../utils/dashboardHelpers";

export default function BalanceCard({ reporte, stats, pagado, pendiente, cancelado }) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3 className="chart-title">Balance</h3>
          <p className="chart-subtitle">{reporte ? <RangoTexto reporte={reporte} /> : "Distribución de ventas"}</p>
        </div>
      </div>
      <div className="balance-summary">
        <DonutChart pagado={pagado} pendiente={pendiente} cancelado={cancelado} />
        <div className="balance-stats">
          <div className="balance-stat">
            <span className="stat-mini-icon"><IconDollar /></span>
            <div>
              <span className="stat-mini-label">Ingresos totales</span>
              <span className="stat-mini-value">{formatCurrency(stats.ingresos_totales)}</span>
            </div>
          </div>
          <div className="balance-stat">
            <span className="stat-mini-icon"><IconUsers /></span>
            <div>
              <span className="stat-mini-label">Número de ventas</span>
              <span className="stat-mini-value">{stats.numero_ventas ?? 0}</span>
            </div>
          </div>
          <div className="balance-stat">
            <span className="stat-mini-icon"><IconShoppingCart /></span>
            <div>
              <span className="stat-mini-label">Ticket promedio</span>
              <span className="stat-mini-value">{formatCurrency(stats.ticket_promedio)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
