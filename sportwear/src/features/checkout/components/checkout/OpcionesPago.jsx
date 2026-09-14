import Select from "../../../../shared/components/Select";
import { fmt } from "../../utils/checkoutHelpers";
import { IconCheckSm } from "../../checkoutIcons";

export default function OpcionesPago({
  permisoCuotas, tipoPago, setTipoPago, opcionesCuotas,
  tipoPagoActivo, numCuotasActivo, setNumCuotas, total,
}) {
  if (!permisoCuotas) return null;

  return (
    <div className="checkout-campo" style={{ marginTop: 15 }}>
      <label className="checkout-label">Opción de pago</label>

      <button
        type="button"
        className={`checkout-opcion-card${tipoPago === "completo" ? " selected" : ""}`}
        onClick={() => setTipoPago("completo")}
      >
        {tipoPago === "completo" && <span className="checkout-opcion-check"><IconCheckSm /></span>}
        <span className="checkout-opcion-radio" />
        <span className="checkout-opcion-titulo">Pago completo</span>
        <span className="checkout-opcion-badge">Recomendado</span>
      </button>

      {opcionesCuotas.length > 0 && (
        <button
          type="button"
          className={`checkout-opcion-card${tipoPago === "cuotas" ? " selected" : ""}`}
          onClick={() => setTipoPago("cuotas")}
        >
          {tipoPago === "cuotas" && <span className="checkout-opcion-check"><IconCheckSm /></span>}
          <span className="checkout-opcion-radio" />
          <span className="checkout-opcion-titulo">Pagar en cuotas</span>
          <span className="checkout-opcion-badge">Sin tarjeta</span>
        </button>
      )}

      {tipoPagoActivo === "cuotas" && (
        <div className="checkout-cuotas-select">
          <label className="checkout-label">Número de cuotas</label>
          <Select value={numCuotasActivo} onChange={(e) => setNumCuotas(Number(e.target.value))} className="form-control" style={{ marginTop: 4 }}>
            {opcionesCuotas.map((n) => (
              <option key={n} value={n}>{n} cuotas de {fmt(Math.ceil(total / n))}</option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
