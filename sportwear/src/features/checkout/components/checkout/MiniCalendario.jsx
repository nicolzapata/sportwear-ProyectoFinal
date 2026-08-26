import { fmt, MESES, DIAS } from "../../utils/checkoutHelpers";

// ── Mini calendario por cuota ─────────────────────────────────────────────
export default function MiniCalendario({ fecha, cuota, monto }) {
  const anio      = fecha.getFullYear();
  const mes       = fecha.getMonth();
  const diaPago   = fecha.getDate();
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const hoy       = new Date();

  return (
    <div className="cal-cuota">
      <div className="cal-cuota-header">
        <span className="cal-cuota-badge">Cuota {cuota}</span>
        <p className="cal-cuota-mes">{MESES[mes]} {anio}</p>
      </div>
      <div className="cal-cuota-grid">
        {DIAS.map(d => (
          <div key={d} className="cal-dia-nombre">{d}</div>
        ))}
        {Array.from({ length: primerDia }).map((_, e) => <div key={`e${e}`} />)}
        {Array.from({ length: diasEnMes }, (_, idx) => {
          const d = idx + 1;
          const esHoy  = hoy.getFullYear() === anio && hoy.getMonth() === mes && hoy.getDate() === d;
          const esPago = d === diaPago;
          return (
            <div key={d} className={`cal-dia${esPago ? " cal-dia--pago" : esHoy ? " cal-dia--hoy" : ""}`}>
              {d}
            </div>
          );
        })}
      </div>
      <p className="cal-cuota-monto">{fmt(monto)}</p>
      <p className="cal-cuota-fecha">
        {fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}
