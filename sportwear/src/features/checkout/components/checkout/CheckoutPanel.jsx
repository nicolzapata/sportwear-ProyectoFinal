import OpcionesPago from "./OpcionesPago";
import CuotasAccordion from "./CuotasAccordion";
import StockAlerta from "./StockAlerta";
import AceptarTerminos from "../../../../shared/components/AceptarTerminos";
import Select from "../../../../shared/components/Select";
import { fmt, ETIQUETAS_METODO } from "../../utils/checkoutHelpers";
import { IconPin, IconArrowRight, IconLock } from "../../checkoutIcons";

export default function CheckoutPanel({
  usuario, items,
  direccion, setDireccion, erroresPaso, setErroresPaso,
  fechaNacimiento, setFechaNacimiento,
  cargandoBarrios, barrios, idBarrio, setIdBarrio,
  cargandoMetodos, metodosPago, metodo, setMetodo,
  permisoCuotas, tipoPago, setTipoPago, opcionesCuotas,
  tipoPagoActivo, numCuotasActivo, setNumCuotas, total, valorCuota, fechasCuotas,
  error, errorStock, elegirAlternativa,
  aceptaTerminos, setAceptaTerminos,
  enviando, handleConfirmar, navigate,
}) {
  return (
    <div className="checkout-panel">
      <div className="checkout-panel-header">
        <h2 className="checkout-section-titulo">Datos del pedido</h2>
        <span className="checkout-panel-badge">Medellín, Colombia</span>
      </div>

      <div className="checkout-cliente-box">
        <div>
          <span className="checkout-label">Cliente</span>
          <div className="checkout-valor">{usuario?.nombre}</div>
          <div className="checkout-cliente-correo">{usuario?.email ?? usuario?.correo ?? "—"}</div>
        </div>
        <button type="button" className="checkout-cliente-cambiar" onClick={() => navigate("/mi-cuenta")}>
          Cambiar
        </button>
      </div>

      <div className="checkout-campo">
        <label className="checkout-label">Dirección de entrega</label>
        <div className={`checkout-input-icon${erroresPaso.direccion ? " input-error" : ""}`}>
          <IconPin />
          <input
            type="text"
            value={direccion}
            onChange={(e) => {
              setDireccion(e.target.value);
              if (erroresPaso.direccion) setErroresPaso((prev) => ({ ...prev, direccion: "" }));
            }}
            placeholder="Cra 70 # 48-15 Apto 201, Medellín"
          />
        </div>
        {erroresPaso.direccion && <div className="checkout-error-message">{erroresPaso.direccion}</div>}
      </div>

      {/* ── NUEVO: verificación de mayoría de edad — obligatoria para completar la compra. ── */}
      <div className="checkout-campo">
        <label className="checkout-label">Fecha de nacimiento</label>
        <div className={`checkout-input-icon${erroresPaso.fechaNacimiento ? " input-error" : ""}`}>
          <input
            type="date"
            value={fechaNacimiento}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => {
              setFechaNacimiento(e.target.value);
              if (erroresPaso.fechaNacimiento) setErroresPaso((prev) => ({ ...prev, fechaNacimiento: "" }));
            }}
          />
        </div>
        {erroresPaso.fechaNacimiento && <div className="checkout-error-message">{erroresPaso.fechaNacimiento}</div>}
      </div>

      {/* ── NUEVO: Ciudad fija + Barrio (antes vivían en el registro) ── */}
      <div className="checkout-campo">
        <div className="checkout-campo-header">
          <label className="checkout-label">Ciudad</label>
          <span className="checkout-cobertura-badge">Cobertura activa</span>
        </div>
        <div className="checkout-valor checkout-valor-box">Medellín</div>
        <p className="checkout-aviso-domicilios">Por ahora solo hacemos domicilios en Medellín.</p>
      </div>
      <div className="checkout-campo">
        <label className="checkout-label">Barrio</label>
        {cargandoBarrios ? (
          <div className="checkout-valor">Cargando barrios...</div>
        ) : (
          <Select
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
          </Select>
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
          <Select
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
          </Select>
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
        <div className="checkout-resumen-linea">
          <span>Costo de domicilio (Medellín)</span>
          <span className="checkout-envio-gratis">GRATIS</span>
        </div>
      </div>

      <div className="checkout-divider" />

      {tipoPagoActivo === "cuotas" ? (
        <CuotasAccordion
          tipoPagoActivo={tipoPagoActivo} numCuotasActivo={numCuotasActivo}
          valorCuota={valorCuota} fechasCuotas={fechasCuotas}
        />
      ) : (
        <div className="checkout-total">
          <div>
            <span className="checkout-total-label">Total a pagar</span>
            <span className="checkout-total-nota">Impuestos incluidos</span>
          </div>
          <div className="checkout-total-precio">
            {fmt(total)} <span className="checkout-total-moneda">COP</span>
          </div>
        </div>
      )}

      {error && <p className="checkout-error">{error}</p>}
      <StockAlerta errorStock={errorStock} elegirAlternativa={elegirAlternativa} />

      <AceptarTerminos
        aceptado={aceptaTerminos}
        setAceptado={(val) => {
          setAceptaTerminos(val);
          if (erroresPaso.terminos) setErroresPaso((prev) => ({ ...prev, terminos: val ? "" : prev.terminos }));
        }}
        error={erroresPaso.terminos}
      />

      <button
        className="checkout-btn-primary"
        style={{ width: "100%", marginTop: 16 }}
        onClick={handleConfirmar}
        disabled={enviando || metodosPago.length === 0}
      >
        {enviando ? "Procesando..." : <>Confirmar pedido <IconArrowRight /></>}
      </button>

      <button className="btn btn-outline" style={{ width: "100%", marginTop: 10 }} onClick={() => navigate("/carrito")} disabled={enviando}>
        Volver al carrito
      </button>

      <p className="checkout-ssl-nota"><IconLock /> Transacción cifrada con protocolo SSL de 256 bits</p>
    </div>
  );
}
