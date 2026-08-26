import { IconDollar, IconBox, IconTruck, IconCreditCard } from "../../../../shared/components/Icons";
import { fmt } from "../../utils/miCuentaHelpers";

export default function EstadoCuentaCard({ pedidos, totalCompras, totalPagado, totalPendiente }) {
  return (
    <div className="mc-card mc-estado-cuenta" style={{ marginBottom: 16 }}>
      <h3 className="mc-card-title">Estado de cuenta</h3>
      <div className="mc-estado-grid mc-estado-grid-4">
        <div className="mc-estado-item">
          <span className="mc-estado-icon"><IconBox /></span>
          <div>
            <span className="mc-estado-label">Pedidos</span>
            <span className="mc-estado-value">{pedidos.length}</span>
          </div>
        </div>
        <div className="mc-estado-item">
          <span className="mc-estado-icon"><IconDollar /></span>
          <div>
            <span className="mc-estado-label">Total compras</span>
            <span className="mc-estado-value">{fmt(totalCompras)}</span>
          </div>
        </div>
        <div className="mc-estado-item">
          <span className="mc-estado-icon mc-estado-icon-pagado"><IconCreditCard /></span>
          <div>
            <span className="mc-estado-label">Total pagado</span>
            <span className="mc-estado-value mc-estado-pagado">{fmt(totalPagado)}</span>
          </div>
        </div>
        <div className="mc-estado-item">
          <span className={`mc-estado-icon${totalPendiente > 0 ? " mc-estado-icon-pendiente" : " mc-estado-icon-pagado"}`}><IconTruck /></span>
          <div>
            <span className="mc-estado-label">Saldo pendiente</span>
            <span className={`mc-estado-value ${totalPendiente > 0 ? 'mc-estado-pendiente' : 'mc-estado-pagado'}`}>
              {fmt(totalPendiente)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
