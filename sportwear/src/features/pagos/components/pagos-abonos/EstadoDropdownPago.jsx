import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { TRANSICIONES_PAGO } from "../../utils/pagosAbonosHelpers";

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheckSm = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function EstadoDropdownPago({ pago, abierto, onToggle, onCambiar, cambiando, tienePerm }) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const estadoActual = pago.estado;
  const esFinal = estadoActual === 'Confirmado' || estadoActual === 'Anulado';
  const siguientes = TRANSICIONES_PAGO[estadoActual] || [];
  const puedeEditar = tienePerm('Pagos.estado') && siguientes.length > 0;

  useEffect(() => {
    if (!abierto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width, arriba: false });
  }, [abierto]);

  // ── NUEVO: voltea el panel hacia arriba si no cabe debajo del botón. ──
  useLayoutEffect(() => {
    if (!abierto || !coords || coords.arriba || !panelRef.current || !btnRef.current) return;
    const panelAlto = panelRef.current.getBoundingClientRect().height;
    const r = btnRef.current.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - r.bottom;
    if (panelAlto + 12 > espacioAbajo) {
      setCoords({ top: r.top - panelAlto - 6, left: r.left, width: r.width, arriba: true });
    }
  }, [abierto, coords]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) onToggle(null);
    };
    const cerrarPorScroll = () => onToggle(null);
    document.addEventListener('mousedown', cerrar);
    window.addEventListener('scroll', cerrarPorScroll, true);
    window.addEventListener('resize', cerrarPorScroll);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      window.removeEventListener('scroll', cerrarPorScroll, true);
      window.removeEventListener('resize', cerrarPorScroll);
    };
  }, [abierto, onToggle]);

  const badgeClase =
    estadoActual === 'Confirmado' ? 'exito' :
    estadoActual === 'Anulado'    ? 'error' : 'pendiente';

  return (
    <div className="pagosabonos-estado-dropdown">
      <button
        ref={btnRef}
        type="button"
        className={`pagosabonos-estado-trigger pagosabonos-estado-${badgeClase}`}
        onClick={() => puedeEditar && onToggle(abierto ? null : pago.id_pago)}
        disabled={!puedeEditar}
      >
        {estadoActual}
        {puedeEditar && <IconChevronDown />}
      </button>

      {abierto && puedeEditar && coords && createPortal(
        <div
          ref={panelRef}
          className="pagosabonos-estado-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 190) }}
        >
          {esFinal ? (
            <div className="pagosabonos-estado-final-msg">
              {estadoActual === 'Confirmado' ? 'Pago confirmado' : 'Pago anulado'}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="pagosabonos-estado-item pagosabonos-estado-item-confirmar clickable"
                disabled={cambiando}
                onClick={() => { onCambiar(pago.id_pago, 'Confirmado'); onToggle(null); }}
              >
                <span className="pagosabonos-estado-dot"><IconCheckSm /></span>
                <span className="pagosabonos-estado-item-label">Confirmar pago</span>
              </button>
              <div className="pagosabonos-estado-divider" />
              <button
                type="button"
                className="pagosabonos-estado-item pagosabonos-estado-item-cancelar clickable"
                disabled={cambiando}
                onClick={() => { onCambiar(pago.id_pago, 'Anulado'); onToggle(null); }}
              >
                <span className="pagosabonos-estado-dot" />
                <span className="pagosabonos-estado-item-label">Anular pago</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
