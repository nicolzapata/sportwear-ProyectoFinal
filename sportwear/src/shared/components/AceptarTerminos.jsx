import { useState } from "react";
import TerminosCondicionesModal from "./TerminosCondicionesModal";
import "./TerminosCondiciones.css";

// ── NUEVO: checkbox "Acepto los términos y condiciones" con el link que
// abre el modal — se usa antes de confirmar un pedido (Checkout) y antes
// de confirmar el pago de un pedido (PaymentModal). Componente controlado:
// el padre es dueño de "aceptado" para poder bloquear su propio botón de
// confirmar mientras no esté marcado. ──
export default function AceptarTerminos({ aceptado, setAceptado, error }) {
  const [verTerminos, setVerTerminos] = useState(false);

  return (
    <>
      <label className={`tyc-checkbox-row${error ? " tyc-checkbox-row--error" : ""}`}>
        <input
          type="checkbox"
          checked={aceptado}
          onChange={(e) => setAceptado(e.target.checked)}
        />
        <span>
          He leído y acepto los{" "}
          <button type="button" className="tyc-link" onClick={(e) => { e.preventDefault(); setVerTerminos(true); }}>
            términos y condiciones
          </button>
        </span>
      </label>
      {error && <p className="tyc-checkbox-error">{error}</p>}

      {verTerminos && <TerminosCondicionesModal onClose={() => setVerTerminos(false)} />}
    </>
  );
}
