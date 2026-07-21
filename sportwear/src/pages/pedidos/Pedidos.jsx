// src/pages/pedidos/Pedidos.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import './Pedidos.css';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { DetalleItem, DetalleGrid } from "../../components/ModalDetalle";
import { IconEye, IconPrint, IconSearch, IconX, IconBox } from "../../components/Icons";

const FILAS_POR_PAGINA = 10;

// Orden natural del flujo (sin contar Cancelado, que es una rama aparte)
const ESTADOS_ORDEN = ['Pendiente', 'En preparación', 'Enviado', 'Entregado'];

// Debe calzar con TRANSICIONES del backend (pedidos.service.js)
const TRANSICIONES = {
  'Pendiente':      ['En preparación', 'Cancelado'],
  'En preparación': ['Enviado', 'Cancelado'],
  'Enviado':        ['Entregado', 'Cancelado'],
  'Entregado':      [],
  'Cancelado':      [],
};

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

// ── Dropdown de estado (portal, para no quedar recortado por el overflow de la tabla) ──
function EstadoDropdown({ pedido, abierto, onToggle, onCambiar, cambiando, tienePerm }) {
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

export default function Pedidos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos,      setDatos]      = useState([]);
  const [cargando,   setCargando]   = useState(true);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [busqueda,   setBusqueda]   = useState("");
  const [pagina,     setPagina]     = useState(1);
  const [verDetalle, setVerDetalle] = useState(null);
  const [cambiando,  setCambiando]  = useState(false);
  const [filaAbierta, setFilaAbierta] = useState(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    setCargando(true);
    setErrorMsg("");
    try {
      const { data } = await api.get("/pedidos");
      setDatos(data);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Error al cargar los pedidos");
    } finally {
      setCargando(false);
    }
  };

  const abrirDetalle = async (p) => {
    try {
      const { data } = await api.get(`/pedidos/${p.id_pedido}`);
      setVerDetalle(data);
    } catch {
      setVerDetalle(p);
    }
  };

  const cambiarEstado = async (id_pedido, estado) => {
    setCambiando(true);
    try {
      await api.patch(`/pedidos/${id_pedido}/estado`, { estado });
      setDatos((prev) => prev.map((p) => p.id_pedido === id_pedido ? { ...p, estado_pedido: estado } : p));
      if (verDetalle?.id_pedido === id_pedido) {
        const { data } = await api.get(`/pedidos/${id_pedido}`);
        setVerDetalle(data);
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al cambiar el estado del pedido");
    } finally {
      setCambiando(false);
    }
  };

  const filtrados       = datos.filter(p => p.cliente?.toLowerCase().includes(busqueda.toLowerCase()));
  const totalPaginas    = Math.ceil(filtrados.length / FILAS_POR_PAGINA) || 1;
  const filtradosPagina = filtrados.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "Entregado":      return "pedidos-badge-active";
      case "Cancelado":      return "pedidos-badge-inactive";
      case "Enviado":        return "pedidos-badge-info";
      case "En preparación": return "pedidos-badge-pending";
      default:                return "pedidos-badge-pending";
    }
  };

  if (errorMsg) return (
    <div className="pedidos-container">
      <div className="pedidos-error-banner"><IconX /> {errorMsg}</div>
    </div>
  );

  return (
    <div className="pedidos-container">
      <div className="pedidos-actions-bar">
        <div className="pedidos-actions-left">
          <div className="pedidos-search-wrapper">
            <span className="pedidos-search-icon"><IconSearch /></span>
            <input
              type="text"
              className="pedidos-search-input"
              placeholder="Buscar por cliente..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            />
            {busqueda && (
              <button className="pedidos-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}>
                <IconX />
              </button>
            )}
          </div>
        </div>
        <div className="pedidos-actions-right">
          <button className="btn-print" onClick={() => window.print()} title="Imprimir tabla"><IconPrint /></button>
        </div>
      </div>

      <div className="pedidos-results-count">
        {cargando ? "Cargando..." : `${filtrados.length} pedido${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}`}
      </div>

      <div className="tbl-container pedidos-tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Cliente</th>
              <th className="tbl-th">Productos</th>
              <th className="tbl-th">Dirección</th>
              <th className="tbl-th">Actualizado</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {cargando ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="tbl-row">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td className="tbl-td" key={j}><div className="pedidos-skeleton-cell" /></td>
                  ))}
                </tr>
              ))
            ) : filtradosPagina.map((p) => (
              <tr key={p.id_pedido} className="tbl-row">
                <td className="tbl-td">{p.cliente}</td>
                <td className="tbl-td pedidos-producto-cell">
                  {p.items?.map(i => i.producto).filter(Boolean).join(', ') || '-'}
                </td>
                <td className="tbl-td">{p.direccion_entrega || "—"}</td>
                <td className="tbl-td">{p.fecha_actualizacion?.toString().split("T")[0]}</td>
                <td className="tbl-td">
                  <EstadoDropdown
                    pedido={p}
                    abierto={filaAbierta === p.id_pedido}
                    onToggle={setFilaAbierta}
                    onCambiar={cambiarEstado}
                    cambiando={cambiando}
                    tienePerm={tienePerm}
                  />
                </td>
                <td className="tbl-td">
                  <div className="pedidos-action-cell">
                    <button className="pedidos-action-btn" onClick={() => abrirDetalle(p)} title="Ver detalle">
                      <IconEye />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!cargando && filtrados.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 0 }}>
                <div className="pedidos-empty-state"><IconBox /><p>No hay pedidos registrados.</p></div>
              </td></tr>
            )}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtrados.length} registros</span>
          </div>
        )}
      </div>

      {/* ── Modal "ver detalle" — panel único tipo factura ── */}
      {verDetalle && (
        <div className="pedidos-modal-overlay" onClick={() => setVerDetalle(null)}>
          <div className="pedidos-modal pedidos-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="pedidos-modal-header">
              <div>
                <h2 className="pedidos-modal-title">P-{String(verDetalle.id_pedido).padStart(3, "0")}</h2>
                <p className="pedidos-modal-subtitulo">Detalle de pedido</p>
              </div>
              <button className="pedidos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
            </div>

            <div className="pedidos-modal-body pedidos-factura-body">
              <div className="pedidos-factura-seccion">
                <h3 className="pedidos-factura-titulo">Información</h3>
                <DetalleGrid>
                  <DetalleItem label="Cliente" value={verDetalle.cliente} />
                  <DetalleItem label="Dirección" value={verDetalle.direccion_entrega} />
                  <DetalleItem label="Venta" value={`V-${String(verDetalle.id_venta).padStart(3, "0")}`} />
                  <DetalleItem label="Estado" value={<span className={`pedidos-badge ${getEstadoBadge(verDetalle.estado_pedido)}`}>{verDetalle.estado_pedido}</span>} />
                </DetalleGrid>
              </div>

              <div className="pedidos-factura-seccion">
                <h3 className="pedidos-factura-titulo">Productos</h3>
                {(verDetalle.items || []).map((item, i) => (
                  <div key={i} className="pedidos-detalle-item-linea">
                    <span>{item.producto} {item.talla ? `(${item.talla})` : ""}</span>
                    <span>Cant: {item.cantidad}</span>
                  </div>
                ))}
              </div>

              {verDetalle.historial?.length > 0 && (
                <div className="pedidos-factura-seccion">
                  <h3 className="pedidos-factura-titulo">Historial de estados</h3>
                  {verDetalle.historial.map((h, i) => (
                    <div key={i} className="pedidos-detalle-item-linea">
                      <span>{h.estado}</span>
                      <span>{h.fecha?.toString().split("T")[0]} {h.usuario ? `· ${h.usuario}` : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pedidos-modal-footer">
              <button className="pedidos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}