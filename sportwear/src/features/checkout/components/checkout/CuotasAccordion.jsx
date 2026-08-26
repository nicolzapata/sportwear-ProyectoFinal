import { fmt } from "../../utils/checkoutHelpers";

// ── Desglose de cuotas — colapsado por defecto. En vez de mostrar un
// "Total a pagar: $X" que sugiere que se paga todo de una, el checkout de
// una compra a cuotas muestra el detalle de cada cuota (número, fecha,
// monto) dentro de un acordeón que el cliente abre si quiere revisarlo. ──
export default function CuotasAccordion({ tipoPagoActivo, numCuotasActivo, valorCuota, fechasCuotas }) {
  if (tipoPagoActivo !== "cuotas") return null;

  return (
    <details className="checkout-cuotas-accordion">
      <summary className="checkout-cuotas-accordion-summary">
        <span>Pagas en {numCuotasActivo} cuotas de {fmt(valorCuota)}</span>
        <span className="checkout-cuotas-accordion-toggle">Ver desglose de cuotas</span>
      </summary>
      <div className="checkout-cuotas-accordion-body">
        {fechasCuotas.map((fecha, i) => (
          <div key={i} className="checkout-cuotas-accordion-row">
            <span className="checkout-cuotas-accordion-num">Cuota {i + 1}</span>
            <span className="checkout-cuotas-accordion-fecha">
              {fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="checkout-cuotas-accordion-monto">{fmt(valorCuota)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
