import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ESTADOS_ORDEN_VENTA, TRANSICIONES_VENTA } from "../../utils/pedidosVentasHelpers";

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

export default function EstadoDropdownVenta({ venta, abierto, onToggle, onCambiar, cambiando, tienePerm }) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const estadoActual = venta.estado;
  const esAnulado = estadoActual === 'Anulado';
  const idxActual = ESTADOS_ORDEN_VENTA.indexOf(estadoActual);
  const siguientes = TRANSICIONES_VENTA[estadoActual] || [];
  const puedeEditar = tienePerm('Ventas.estado') && siguientes.length > 0;

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

  const badgeClase = estadoActual === 'Pagado' ? 'active' : estadoActual === 'Anulado' ? 'inactive' : 'pending';

  return (
    <div className="pedidosventas-estado-dropdown">
      <button
        ref={btnRef}
        type="button"
        className={`pedidosventas-estado-trigger pedidosventas-badge-${badgeClase}`}
        onClick={() => puedeEditar && onToggle(abierto ? null : venta.id_venta)}
        disabled={!puedeEditar}
      >
        {estadoActual}
        {puedeEditar && <IconChevronDown />}
      </button>

      {abierto && puedeEditar && coords && createPortal(
        <div
          ref={panelRef}
          className="pedidosventas-estado-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 190) }}
        >
          {esAnulado ? (
            <div className="pedidosventas-estado-anulado-msg">Venta anulada</div>
          ) : (
            <>
              {ESTADOS_ORDEN_VENTA.map((estado, i) => {
                const yaPaso   = i < idxActual;
                const esActual = i === idxActual;
                const habilitado = siguientes.includes(estado);
                return (
                  <button
                    key={estado}
                    type="button"
                    className={`pedidosventas-estado-item${yaPaso ? " done" : ""}${esActual ? " current" : ""}${habilitado ? " clickable" : ""}`}
                    disabled={!habilitado || cambiando}
                    onClick={() => { onCambiar(venta.id_venta, estado); onToggle(null); }}
                  >
                    <span className="pedidosventas-estado-dot">
                      {yaPaso || esActual ? <IconCheckSm /> : null}
                    </span>
                    <span className="pedidosventas-estado-item-label">{estado}</span>
                  </button>
                );
              })}
              <div className="pedidosventas-estado-divider" />
              <button
                type="button"
                className={`pedidosventas-estado-item pedidosventas-estado-item-cancelar${siguientes.includes('Anulado') ? " clickable" : ""}`}
                disabled={!siguientes.includes('Anulado') || cambiando}
                onClick={() => { onCambiar(venta.id_venta, 'Anulado'); onToggle(null); }}
              >
                <span className="pedidosventas-estado-dot" />
                <span className="pedidosventas-estado-item-label">Anular venta</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
