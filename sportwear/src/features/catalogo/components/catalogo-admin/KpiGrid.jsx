import { IconLayers, IconGlobe, IconEyeOff } from "./icons";
import { IconAlertTriangle } from "../../../../shared/components/Icons";

export default function KpiGrid({ kpis }) {
  return (
    <div className="catadmin-kpi-grid">
      <div className="catadmin-kpi-card">
        <span className="catadmin-kpi-icon catadmin-kpi-icon-neutral"><IconLayers /></span>
        <div>
          <span className="catadmin-kpi-label">Productos totales</span>
          <span className="catadmin-kpi-value">{kpis.total}</span>
        </div>
      </div>
      <div className="catadmin-kpi-card">
        <span className="catadmin-kpi-icon catadmin-kpi-icon-success"><IconGlobe /></span>
        <div>
          <span className="catadmin-kpi-label">Publicados</span>
          <span className="catadmin-kpi-value">{kpis.publicados}</span>
        </div>
      </div>
      <div className="catadmin-kpi-card">
        <span className="catadmin-kpi-icon catadmin-kpi-icon-warning"><IconAlertTriangle /></span>
        <div>
          <span className="catadmin-kpi-label">Bajo stock</span>
          <span className="catadmin-kpi-value">{kpis.bajoStock}</span>
        </div>
      </div>
      <div className="catadmin-kpi-card">
        <span className="catadmin-kpi-icon catadmin-kpi-icon-danger"><IconEyeOff /></span>
        <div>
          <span className="catadmin-kpi-label">Agotados</span>
          <span className="catadmin-kpi-value">{kpis.agotados}</span>
        </div>
      </div>
    </div>
  );
}
