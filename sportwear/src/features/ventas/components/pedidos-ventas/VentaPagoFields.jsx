import CuotasCalendario from "../../../checkout/components/checkout/CuotasCalendario";
import { fmt, HOY_ISO } from "../../utils/pedidosVentasHelpers";

// ── Bloque "tipo de pago" del formulario de Nueva venta: tipo de pago, cupo
// de crédito, número/fecha de cuotas y método(s) de pago. Aislado del resto
// del formulario porque concentra toda la lógica condicional de cuotas. ──
export default function VentaPagoFields({
  formVenta, setFormVenta, erroresVenta, setErroresVenta,
  metodosPago, cargandoCredito, creditoInfo, totalVenta, opcionesCuotasVenta,
  numCuotasSel, valorCuotaSel, fechasCuotasSel,
}) {
  return (
    <>
      <div className="pedidosventas-form-row">
        <div className="pedidosventas-form-group">
          <label className="pedidosventas-form-label">Tipo de pago</label>
          <select
            className="pedidosventas-form-select"
            value={formVenta.tipo_pago}
            onChange={(e) => setFormVenta({ ...formVenta, tipo_pago: e.target.value, num_cuotas: "" })}
          >
            <option value="completo">Pago completo</option>
            <option value="cuotas">Cuotas</option>
          </select>
        </div>
        {formVenta.tipo_pago === "cuotas" && formVenta.id_cliente && (
          <div className="pedidosventas-credito-banner">
            {cargandoCredito ? (
              <span style={{ color: "var(--muted)" }}>Consultando cupo de crédito...</span>
            ) : creditoInfo?.cupo_credito !== null && creditoInfo?.cupo_credito !== undefined ? (
              <>
                <span>Cupo: <b>{fmt(creditoInfo.cupo_credito)}</b></span>
                <span>Deuda actual: <b>{fmt(creditoInfo.deuda_actual)}</b></span>
                <span className={totalVenta > (creditoInfo.disponible ?? Infinity) ? "pedidosventas-credito-excedido" : "pedidosventas-credito-ok"}>
                  Disponible: <b>{fmt(creditoInfo.disponible)}</b>
                </span>
              </>
            ) : (
              <span style={{ color: "var(--muted)" }}>Este cliente no tiene cupo de crédito asignado (sin límite).</span>
            )}
          </div>
        )}
        {formVenta.tipo_pago === "cuotas" ? (
          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Número de cuotas</label>
            <select
              className={`pedidosventas-form-select${erroresVenta.num_cuotas ? " input-error" : ""}`}
              value={formVenta.num_cuotas}
              onChange={(e) => {
                const num_cuotas = e.target.value;
                setFormVenta((prev) => ({
                  ...prev,
                  num_cuotas,
                  // ── NUEVO: la fecha de la primera cuota se autocompleta con
                  // la fecha de la venta al elegir el número de cuotas — sigue
                  // siendo editable después. ──
                  fecha_primera_cuota: prev.fecha_primera_cuota || prev.fecha,
                }));
                setErroresVenta((prev) => ({ ...prev, num_cuotas: "" }));
              }}
            >
              <option value="">Selecciona...</option>
              {(opcionesCuotasVenta || []).map((n) => (
                <option key={n} value={n}>{n} cuotas de {fmt(Math.ceil(totalVenta / n))}</option>
              ))}
            </select>
            {erroresVenta.num_cuotas && <span className="pedidosventas-field-error">{erroresVenta.num_cuotas}</span>}
          </div>
        ) : (
          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Estado</label>
            <select className="pedidosventas-form-select" value={formVenta.estado} onChange={(e) => setFormVenta({ ...formVenta, estado: e.target.value })}>
              <option value="Pendiente">Pendiente</option>
              <option value="Pagado">Pagado (registrar como ya pagada)</option>
            </select>
          </div>
        )}
      </div>

      <div className="pedidosventas-form-row">
        {/* ── NUEVO: si la venta es a cuotas, no tiene sentido pedir UN
            método de pago general — cada abono ya tiene el suyo propio
            al registrarlo. Solo se pide para pago completo. ── */}
        {formVenta.tipo_pago !== "cuotas" && (
          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Método de pago</label>
            <select className="pedidosventas-form-select" value={formVenta.metodo_pago} onChange={(e) => setFormVenta({ ...formVenta, metodo_pago: e.target.value })}>
              {metodosPago.map((m) => (
                <option key={m.id_metodo} value={m.nombre}>{m.nombre}</option>
              ))}
            </select>
          </div>
        )}
        {formVenta.tipo_pago === "cuotas" && (
          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Estado inicial</label>
            <select className="pedidosventas-form-select" value={formVenta.estado} onChange={(e) => setFormVenta({ ...formVenta, estado: e.target.value })}>
              <option value="Pendiente">Pendiente</option>
              <option value="Pagado">Primera cuota confirmada</option>
            </select>
          </div>
        )}
        {/* ── NUEVO: si se confirma la primera cuota de una vez al crear
            la venta, hay que saber CÓMO se pagó esa cuota puntual — las
            demás cuotas futuras ya piden su propio método cada vez que
            se registran desde "Gestionar Abonos", así que esto solo
            aplica a la cuota inicial. ── */}
        {formVenta.tipo_pago === "cuotas" && formVenta.estado === "Pagado" && (
          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Método de pago (cuota inicial)</label>
            <select className="pedidosventas-form-select" value={formVenta.metodo_pago} onChange={(e) => setFormVenta({ ...formVenta, metodo_pago: e.target.value })}>
              {metodosPago.map((m) => (
                <option key={m.id_metodo} value={m.nombre}>{m.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── NUEVO: fecha de la primera cuota (misma fila que el
          calendario, no debajo) — se recalcula solo si cambia la fecha
          o el número de cuotas. ── */}
      {formVenta.tipo_pago === "cuotas" && numCuotasSel > 0 && (
        <div className="pedidosventas-form-row pedidosventas-cuotas-row">
          <div className="pedidosventas-form-group">
            <label className="pedidosventas-form-label">Fecha de la primera cuota</label>
            <input
              type="date"
              max={HOY_ISO}
              className="pedidosventas-form-input"
              value={formVenta.fecha_primera_cuota || formVenta.fecha}
              onChange={(e) => setFormVenta({ ...formVenta, fecha_primera_cuota: e.target.value })}
            />
          </div>
          <div className="pedidosventas-calendario-cuotas">
            <CuotasCalendario
              tipoPagoActivo="cuotas" total={totalVenta} numCuotasActivo={numCuotasSel}
              valorCuota={valorCuotaSel} fechasCuotas={fechasCuotasSel}
            />
          </div>
        </div>
      )}
    </>
  );
}
