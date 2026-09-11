// src/shared/components/NotificacionesDropdown.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { IconBell, IconBox, IconTruck, IconDollar, IconAlertTriangle } from "./Icons";
import useNotificaciones from "../hooks/useNotificaciones";
import "./NotificacionesDropdown.css";

const ICONOS_POR_CATEGORIA = {
  inventario: IconAlertTriangle,
  pedidos: IconTruck,
  compras: IconBox,
  ventas: IconDollar,
};

export default function NotificacionesDropdown() {
  const { items, loading, recargar, noLeidas, marcarTodoVisto } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const alHacerClickFuera = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", alHacerClickFuera);
    return () => document.removeEventListener("mousedown", alHacerClickFuera);
  }, [abierto]);

  // Mientras el panel está abierto, cualquier notificación que llegue ya se
  // está mostrando en la lista, así que se marca como vista de inmediato —
  // el contador no debe reaparecer sin haber cerrado y vuelto a abrir.
  useEffect(() => {
    if (abierto) marcarTodoVisto();
  }, [abierto, items, marcarTodoVisto]);

  const toggle = () => {
    setAbierto((v) => {
      if (!v) recargar();
      return !v;
    });
  };

  const total = noLeidas;

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="navbar-btn"
        title="Notificaciones"
        aria-label="Notificaciones"
        onClick={toggle}
      >
        <IconBell />
        {total > 0 && <span className="navbar-badge">{total > 9 ? "9+" : total}</span>}
      </button>

      {abierto && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notificaciones</span>
            {total > 0 && <span className="notif-panel-count">{total}</span>}
          </div>

          <div className="notif-panel-body">
            {loading && items.length === 0 && (
              <div className="notif-empty">Cargando…</div>
            )}
            {!loading && items.length === 0 && (
              <div className="notif-empty">No tienes notificaciones pendientes.</div>
            )}
            {items.map((n) => {
              const Icono = ICONOS_POR_CATEGORIA[n.categoria] || IconAlertTriangle;
              return (
                <Link
                  key={n.id}
                  to={n.enlace}
                  className="notif-item"
                  onClick={() => setAbierto(false)}
                >
                  <span className={`notif-item-icon${n.urgente ? " notif-item-icon--urgente" : ""}`}>
                    <Icono />
                  </span>
                  <span className="notif-item-text">
                    <span className="notif-item-title">{n.titulo}</span>
                    <span className="notif-item-detail">{n.detalle}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
