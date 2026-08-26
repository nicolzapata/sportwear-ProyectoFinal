import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ESTADOS_ORDEN, TRANSICIONES } from "../../utils/pedidosHelpers";
import { IconChevronDown, IconCheckSm } from "./icons";

// ── Dropdown de estado (portal, para no quedar recortado por el overflow de la tabla) ──
export default function EstadoDropdown({ pedido, abierto, onToggle, onCambiar, cambiando, tienePerm }) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const estadoActual = pedido.estado_pedido;
  const esCancelado = estadoActual === 'Cancelado';
  const idxActual = ESTADOS_ORDEN.indexOf(estadoActual);
  const siguientes = TRANSICIONES[estadoActual] || [];
  const puedeEditar = tienePerm('Pedidos.estado') && siguientes.length > 0;

  useEffect(() => {
    if (!abierto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width, arriba: false });
  }, [abierto]);

  // ── NUEVO: voltea el panel hacia arriba si no cabe debajo del botón
  // (ej. pedidos al final de la tabla) — mismo criterio que el resto de
  // desplegables de estado del sitio. ──
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

  const badgeClase = estadoActual === 'Entregado' ? 'active' : estadoActual === 'Cancelado' ? 'inactive' : estadoActual === 'Enviado' ? 'info' : 'pending';

  return (
    <div className="pedidos-estado-dropdown">
      <button
        ref={btnRef}
        type="button"
        className={`pedidos-estado-trigger pedidos-badge-${badgeClase}`}
        onClick={() => puedeEditar && onToggle(abierto ? null : pedido.id_pedido)}
        disabled={!puedeEditar}
      >
        {estadoActual}
        {puedeEditar && <IconChevronDown />}
      </button>

      {abierto && puedeEditar && coords && createPortal(
        <div
          ref={panelRef}
          className="pedidos-estado-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 190) }}
        >
          {esCancelado ? (
            <div className="pedidos-estado-cancelado-msg">Pedido cancelado</div>
          ) : (
            <>
              {ESTADOS_ORDEN.map((estado, i) => {
                const yaPaso   = i < idxActual;
                const esActual = i === idxActual;
                const habilitado = siguientes.includes(estado);
                return (
                  <button
                    key={estado}
                    type="button"
                    className={`pedidos-estado-item${yaPaso ? " done" : ""}${esActual ? " current" : ""}${habilitado ? " clickable" : ""}`}
                    disabled={!habilitado || cambiando}
                    onClick={() => { onCambiar(pedido.id_pedido, estado); onToggle(null); }}
                  >
                    <span className="pedidos-estado-dot">
                      {yaPaso || esActual ? <IconCheckSm /> : null}
                    </span>
                    <span className="pedidos-estado-item-label">{estado}</span>
                  </button>
                );
              })}
              <div className="pedidos-estado-divider" />
              <button
                type="button"
                className={`pedidos-estado-item pedidos-estado-item-cancelar${siguientes.includes('Cancelado') ? " clickable" : ""}`}
                disabled={!siguientes.includes('Cancelado') || cambiando}
                onClick={() => { onCambiar(pedido.id_pedido, 'Cancelado'); onToggle(null); }}
              >
                <span className="pedidos-estado-dot" />
                <span className="pedidos-estado-item-label">Cancelar pedido</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
