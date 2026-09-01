import Select from "../../../../shared/components/Select";
import { fmt } from "../../utils/checkoutHelpers";

export default function OpcionesPago({
  permisoCuotas, tipoPago, setTipoPago, opcionesCuotas,
  tipoPagoActivo, numCuotasActivo, setNumCuotas, total,
}) {
  if (!permisoCuotas) return null;

  return (
    <div className="checkout-campo" style={{ marginTop: 15 }}>
      <label className="checkout-label">Opción de pago</label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 5 }}>
        <input type="radio" name="tipoPago2" value="completo" checked={tipoPago === "completo"} onChange={() => setTipoPago("completo")} />
        Pago completo
      </label>
      {opcionesCuotas.length > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 5 }}>
          <input type="radio" name="tipoPago2" value="cuotas" checked={tipoPago === "cuotas"} onChange={() => setTipoPago("cuotas")} />
          Pagar en cuotas
        </label>
      )}
      {tipoPagoActivo === "cuotas" && (
        <div style={{ marginTop: 10, paddingLeft: 24 }}>
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
