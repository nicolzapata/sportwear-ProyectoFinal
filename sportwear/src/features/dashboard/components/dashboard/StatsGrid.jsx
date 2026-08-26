import { IconDollar, IconShoppingCart, IconAlertTriangle, IconBox, IconTruck } from "../../../../shared/components/Icons";
import RangoTexto from "./RangoTexto";
import { formatCurrency, valueSizeClass } from "../../utils/dashboardHelpers";

export default function StatsGrid({ stats, reporte }) {
  return (
    <div className="stats-grid">
      <div className="stat-card-wrapper">
        <div className="stat-card">
          <div className="stat-card-accent" />
          <div className="stat-icon stat-icon-primary"><IconDollar /></div>
          <div className="stat-content">
            <span className="stat-label">Ventas del día</span>
            <span className={`stat-value ${valueSizeClass(formatCurrency(stats.ingresos_hoy))}`}>{formatCurrency(stats.ingresos_hoy)}</span>
            <RangoTexto reporte={reporte} />
          </div>
        </div>
      </div>
      <div className="stat-card-wrapper">
        <div className="stat-card">
          <div className="stat-card-accent success" />
          <div className="stat-icon stat-icon-success"><IconShoppingCart /></div>
          <div className="stat-content">
            <span className="stat-label">Ventas realizadas</span>
            <span className={`stat-value ${valueSizeClass(stats.ventas_hoy)}`}>{stats.ventas_hoy}</span>
            <RangoTexto reporte={reporte} />
          </div>
        </div>
      </div>
      <div className="stat-card-wrapper">
        <div className="stat-card">
          <div className="stat-card-accent danger" />
          <div className="stat-icon stat-icon-danger"><IconAlertTriangle /></div>
          <div className="stat-content">
            <span className="stat-label">Bajo stock</span>
            <span className={`stat-value ${valueSizeClass(stats.bajo_stock)}`}>{stats.bajo_stock}</span>
            {/* ── NUEVO: aclara que este número NUNCA sigue el filtro de
                fechas — es el inventario actual, no hay historial. ── */}
            <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--dvna-muted)" }}>Estado actual</span>
          </div>
        </div>
      </div>
      <div className="stat-card-wrapper">
        <div className="stat-card">
          <div className="stat-card-accent warning" />
          <div className="stat-icon stat-icon-warning"><IconDollar /></div>
          <div className="stat-content">
            <span className="stat-label">Ingresos totales</span>
            <span className={`stat-value ${valueSizeClass(formatCurrency(stats.ingresos_totales))}`}>{formatCurrency(stats.ingresos_totales)}</span>
            <RangoTexto reporte={reporte} />
          </div>
        </div>
      </div>
      <div className="stat-card-wrapper">
        <div className="stat-card">
          <div className="stat-card-accent" />
          <div className="stat-icon stat-icon-primary"><IconBox /></div>
          <div className="stat-content">
            <span className="stat-label">Pedidos pendientes</span>
            <span className={`stat-value ${valueSizeClass(stats.pedidos_pendientes ?? 0)}`}>{stats.pedidos_pendientes ?? 0}</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--dvna-muted)" }}>Estado actual</span>
          </div>
        </div>
      </div>
      <div className="stat-card-wrapper">
        <div className="stat-card">
          <div className="stat-card-accent success" />
          <div className="stat-icon stat-icon-success"><IconTruck /></div>
          <div className="stat-content">
            <span className="stat-label">Compras totales</span>
            <span className={`stat-value ${valueSizeClass(formatCurrency(stats.compras_monto_total))}`}>{formatCurrency(stats.compras_monto_total)}</span>
            <RangoTexto reporte={reporte} />
          </div>
        </div>
      </div>
    </div>
  );
}
