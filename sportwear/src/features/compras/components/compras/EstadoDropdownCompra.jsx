import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESTADOS_ORDEN_COMPRA, TRANSICIONES_COMPRA } from "../../utils/comprasHelpers";

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

export default function EstadoDropdownCompra({ compra, abierto, onToggle, onCambiar, cambiando, tienePerm }) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const estadoActual = compra.estado;
  const esAnulado = estadoActual === 'Anulado';
  const esRecibido = estadoActual === 'Recibido';
  const idxActual = ESTADOS_ORDEN_COMPRA.indexOf(estadoActual);
  const siguientes = TRANSICIONES_COMPRA[estadoActual] || [];
  const puedeEditar = tienePerm('Compras.editar') && siguientes.length > 0;

  useEffect(() => {
    if (!abierto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
  }, [abierto]);

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
    estadoActual === 'Recibido'    ? 'active' :
    estadoActual === 'Anulado'     ? 'inactive' :
    estadoActual === 'En Tránsito' ? 'info' : 'pending';

  return (
    <div className="compras-estado-dropdown">
      <button
        ref={btnRef}
        type="button"
        className={`compras-estado-trigger compras-estado-${badgeClase}`}
        onClick={() => puedeEditar && onToggle(abierto ? null : compra.id_compra)}
        disabled={!puedeEditar}
      >
        {estadoActual}
        {puedeEditar && <IconChevronDown />}
      </button>

      {abierto && puedeEditar && coords && createPortal(
        <div
          ref={panelRef}
          className="compras-estado-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 190) }}
        >
          {esAnulado || esRecibido ? (
            <div className="compras-estado-final-msg">
              {esAnulado ? 'Compra anulada' : 'Compra recibida — inventario ya actualizado'}
            </div>
          ) : (
            <>
              {ESTADOS_ORDEN_COMPRA.map((estado, i) => {
                const yaPaso   = i < idxActual;
                const esActual = i === idxActual;
                const habilitado = siguientes.includes(estado);
                return (
                  <button
                    key={estado}
                    type="button"
                    className={`compras-estado-item${yaPaso ? " done" : ""}${esActual ? " current" : ""}${habilitado ? " clickable" : ""}`}
                    disabled={!habilitado || cambiando}
                    onClick={() => { onCambiar(compra.id_compra, estado); onToggle(null); }}
                  >
                    <span className="compras-estado-dot">
                      {yaPaso || esActual ? <IconCheckSm /> : null}
                    </span>
                    <span className="compras-estado-item-label">{estado}</span>
                  </button>
                );
              })}
              {tienePerm('Compras.anular') && (
                <>
                  <div className="compras-estado-divider" />
                  <button
                    type="button"
                    className={`compras-estado-item compras-estado-item-cancelar${siguientes.includes('Anulado') ? " clickable" : ""}`}
                    disabled={!siguientes.includes('Anulado') || cambiando}
                    onClick={() => { onCambiar(compra.id_compra, 'Anulado'); onToggle(null); }}
                  >
                    <span className="compras-estado-dot" />
                    <span className="compras-estado-item-label">Anular compra</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
