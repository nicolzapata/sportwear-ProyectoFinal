import MiniCalendario from "./MiniCalendario";
import { fmt } from "../../utils/checkoutHelpers";

export default function CuotasCalendario({ tipoPagoActivo, total, numCuotasActivo, valorCuota, fechasCuotas }) {
  if (tipoPagoActivo !== "cuotas") return null;

  return (
    <>
      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
        Total del pedido: {fmt(total)} en {numCuotasActivo} cuotas de {fmt(valorCuota)}
      </p>
      <label className="checkout-label" style={{ marginBottom: 8 }}>Fechas de pago</label>
      <div className="cal-cuotas-wrap">
        {fechasCuotas.map((fecha, i) => (
          <MiniCalendario key={i} fecha={fecha} cuota={i + 1} monto={valorCuota} />
        ))}
      </div>
    </>
  );
}
