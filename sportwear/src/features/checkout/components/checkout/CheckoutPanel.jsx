import OpcionesPago from "./OpcionesPago";
import CuotasCalendario from "./CuotasCalendario";
import StockAlerta from "./StockAlerta";
import { fmt, ETIQUETAS_METODO } from "../../utils/checkoutHelpers";

export default function CheckoutPanel({
  usuario, items,
  direccion, setDireccion, erroresPaso, setErroresPaso,
  cargandoBarrios, barrios, idBarrio, setIdBarrio,
  cargandoMetodos, metodosPago, metodo, setMetodo,
  permisoCuotas, tipoPago, setTipoPago, opcionesCuotas,
  tipoPagoActivo, numCuotasActivo, setNumCuotas, total, valorCuota, fechasCuotas,
  error, errorStock, elegirAlternativa,
  enviando, handleConfirmar, navigate,
}) {
  return (
    <div className="checkout-panel">
      <h2 className="checkout-section-titulo">Datos del pedido</h2>

      <div className="checkout-campo">
        <label className="checkout-label">Cliente</label>
        <div className="checkout-valor">{usuario?.nombre}</div>
      </div>
      <div className="checkout-campo">
        <label className="checkout-label">Correo</label>
        <div className="checkout-valor">{usuario?.email ?? usuario?.correo ?? "—"}</div>
      </div>
      <div className="checkout-campo">
        <label className="checkout-label">Dirección de entrega</label>
        <input
          type="text"
          className={`form-control${erroresPaso.direccion ? " input-error" : ""}`}
          value={direccion}
          onChange={(e) => {
            setDireccion(e.target.value);
            if (erroresPaso.direccion) setErroresPaso((prev) => ({ ...prev, direccion: "" }));
          }}
          placeholder="Cra 70 # 48-15 Apto 201, Medellín"
        />
        {erroresPaso.direccion && <div className="checkout-error-message">{erroresPaso.direccion}</div>}
      </div>

      {/* ── NUEVO: Ciudad fija + Barrio (antes vivían en el registro) ── */}
      <div className="checkout-campo">
        <label className="checkout-label">Ciudad</label>
        <div className="checkout-valor">Medellín</div>
        <p className="checkout-aviso-domicilios">Por ahora solo hacemos domicilios en Medellín.</p>
      </div>
      <div className="checkout-campo">
        <label className="checkout-label">Barrio</label>
        {cargandoBarrios ? (
          <div className="checkout-valor">Cargando barrios...</div>
        ) : (
          <select
            className={`form-control${erroresPaso.barrio ? " input-error" : ""}`}
            value={idBarrio}
            onChange={(e) => {
              setIdBarrio(e.target.value);
              if (erroresPaso.barrio) setErroresPaso((prev) => ({ ...prev, barrio: "" }));
            }}
          >
            <option value="">Selecciona tu barrio...</option>
            {barrios.map((b) => (
              <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>
            ))}
          </select>
        )}
        {erroresPaso.barrio && <div className="checkout-error-message">{erroresPaso.barrio}</div>}
      </div>
      <div className="checkout-campo">
        <label className="checkout-label">Método de pago</label>
        {cargandoMetodos ? (
          <div className="checkout-valor">Cargando métodos de pago...</div>
        ) : metodosPago.length === 0 ? (
          <p className="checkout-error-message">No hay métodos de pago habilitados en este momento. Contáctanos para completar tu pedido.</p>
        ) : (
          <select
            className={`form-control${erroresPaso.metodo ? " input-error" : ""}`}
            value={metodo}
            onChange={(e) => {
              setMetodo(e.target.value);
              if (erroresPaso.metodo) setErroresPaso((prev) => ({ ...prev, metodo: "" }));
            }}
          >
            {metodosPago.map((m) => (
              <option key={m.id_metodo} value={m.nombre}>
                {ETIQUETAS_METODO[m.nombre] || m.nombre}
              </option>
            ))}
          </select>
        )}
        {erroresPaso.metodo && <div className="checkout-error-message">{erroresPaso.metodo}</div>}
      </div>

      <OpcionesPago
        permisoCuotas={permisoCuotas} tipoPago={tipoPago} setTipoPago={setTipoPago}
        opcionesCuotas={opcionesCuotas} tipoPagoActivo={tipoPagoActivo}
        numCuotasActivo={numCuotasActivo} setNumCuotas={setNumCuotas} total={total}
      />

      <div className="checkout-divider" />

      <div className="checkout-resumen-lineas">
        {items.map((item) => (
          <div key={item.id_variante ?? item.id} className="checkout-resumen-linea">
            <span>{item.nombre} × {item.cantidad}</span>
            <span>{fmt(item.precio * item.cantidad)}</span>
          </div>
        ))}
      </div>

      <div className="checkout-divider" />

      <div className="checkout-total">
        <span>{tipoPagoActivo === "cuotas" ? `Total cuota (1/${numCuotasActivo})` : "Total a pagar"}</span>
        <span>{fmt(tipoPagoActivo === "cuotas" ? valorCuota : total)}</span>
      </div>

      <CuotasCalendario
        tipoPagoActivo={tipoPagoActivo} total={total} numCuotasActivo={numCuotasActivo}
        valorCuota={valorCuota} fechasCuotas={fechasCuotas}
      />

      {error && <p className="checkout-error">{error}</p>}
      <StockAlerta errorStock={errorStock} elegirAlternativa={elegirAlternativa} />

      <button
        className="checkout-btn-primary"
        style={{ width: "100%", marginTop: 16 }}
        onClick={handleConfirmar}
        disabled={enviando || metodosPago.length === 0}
      >
        {enviando ? "Procesando..." : "Confirmar pedido"}
      </button>

      <button className="btn btn-outline" style={{ width: "100%", marginTop: 10 }} onClick={() => navigate("/carrito")} disabled={enviando}>
        Volver al carrito
      </button>
    </div>
  );
}
