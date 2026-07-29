// src/pages/compras/Compras.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { validarMonto, MAX_MONTO, MAX_LONGITUD_CODIGO, MAX_LONGITUD_TEXTO_LIBRE } from "../../utils/numerico";
import './Compras.css';
import { DetalleItem, DetalleGrid } from "../../components/ModalDetalle";
import { IconEdit, IconEye, IconSearch, IconX } from "../../components/Icons";
import Loader from "../../components/Loader";
import ExportButtons from "../../components/ExportButtons";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const FILAS_POR_PAGINA = 10;

const nuevoItem = () => ({ id_producto: "", id_variante: "", cantidad: 1, precio_unitario: "", descuento_linea: 0 });

const formInicial = () => ({
  id_proveedor: "",
  numero_orden: "",
  descuento: 0,
  impuesto: 0,
  estado: "Pendiente",
  fecha: new Date().toISOString().split("T")[0],
  observaciones: "",
  items: [nuevoItem()],
});

// ── Dropdown de estado con colores (mismo patrón que Pedidos/Ventas) ──
const ESTADOS_ORDEN_COMPRA = ['Pendiente', 'En Tránsito', 'Recibido'];
const TRANSICIONES_COMPRA = {
  'Pendiente':    ['En Tránsito', 'Recibido', 'Anulado'],
  'En Tránsito':  ['Recibido', 'Anulado'],
  'Recibido':     [],
  'Anulado':      [],
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

function EstadoDropdownCompra({ compra, abierto, onToggle, onCambiar, cambiando, tienePerm }) {
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

export default function Compras() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();
  const confirmar = useConfirm();

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalCompras, setTotalCompras] = useState(0);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [estadoEditado, setEstadoEditado] = useState("");
  const [guardandoEstado, setGuardandoEstado] = useState(false);
  const [form, setForm] = useState(formInicial());
  const [errores, setErrores] = useState({});
  const [filaAbierta, setFilaAbierta] = useState(null);
  const [cambiandoEstadoTabla, setCambiandoEstadoTabla] = useState(false);

  const cargarCompras = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    try {
      const { data } = await api.get("/compras", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setCompras(data.data || []);
      setTotalCompras(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar la información de compras. Verifica tu conexión o tus permisos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    setError("");
    api.get("/proveedores").then(({ data }) => setProveedores(data)).catch(() => {});
    api.get("/productos").then(({ data }) => setProductos((data || []).filter((p) => p.estado === "Activo"))).catch(() => {});
  }, []);

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarCompras(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const totalPaginas = Math.ceil(totalCompras / FILAS_POR_PAGINA) || 1;

  // ── Manejo de líneas de producto dentro del formulario ──
  const actualizarItem = (index, campo, valor) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [campo]: valor };
      if (campo === "id_producto") items[index].id_variante = "";
      return { ...prev, items };
    });
  };
  const agregarItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, nuevoItem()] }));
  const quitarItem = (index) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));

  const subtotal = form.items.reduce((acc, it) => {
    const cant = Number(it.cantidad) || 0;
    const precio = Number(it.precio_unitario) || 0;
    const desc = Number(it.descuento_linea) || 0;
    return acc + (cant * precio - desc);
  }, 0);
  const totalCompra = subtotal - (Number(form.descuento) || 0) + (Number(form.impuesto) || 0);

  const MAX_CANTIDAD = 9999;

  const validar = () => {
    const e = {};
    if (!form.id_proveedor) e.id_proveedor = "El proveedor es obligatorio";
    if (!form.fecha) e.fecha = "La fecha es obligatoria";
    form.items.forEach((it, i) => {
      if (!it.id_producto) e[`item_${i}_producto`] = "Selecciona un producto";
      const producto = productos.find((p) => String(p.id_producto) === String(it.id_producto));
      const variantesActivas = (producto?.variantes || []).filter((v) => v.estado === "Activo");
      if (variantesActivas.length > 0 && !it.id_variante) e[`item_${i}_variante`] = "Selecciona talla y color";
      const msgCantidad = errorItemCantidad(it.cantidad);
      if (msgCantidad) e[`item_${i}_cantidad`] = msgCantidad;
      const msgPrecio = errorItemPrecio(it.precio_unitario);
      if (msgPrecio) e[`item_${i}_precio`] = msgPrecio;
      const msgDescLinea = errorItemDescuento(it.descuento_linea, it.cantidad, it.precio_unitario);
      if (msgDescLinea) e[`item_${i}_descuento`] = msgDescLinea;
    });
    const msgDescGeneral = errorDescuentoGeneral(form.descuento);
    if (msgDescGeneral) e.descuento = msgDescGeneral;
    const msgImpuesto = errorImpuestoGeneral(form.impuesto);
    if (msgImpuesto) e.impuesto = msgImpuesto;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  // ── Validaciones puntuales (en tiempo real, por campo) ──
  const errorItemProducto = (idProducto) => (!idProducto ? "Selecciona un producto" : "");
  const errorItemVariante = (idProducto, idVariante) => {
    const producto = productos.find((p) => String(p.id_producto) === String(idProducto));
    const variantesActivas = (producto?.variantes || []).filter((v) => v.estado === "Activo");
    return variantesActivas.length > 0 && !idVariante ? "Selecciona talla y color" : "";
  };
  const errorItemCantidad = (cantidad) => {
    if (!cantidad || Number(cantidad) <= 0) return "Cantidad inválida";
    if (!Number.isInteger(Number(cantidad))) return "Debe ser un número entero";
    if (Number(cantidad) > MAX_CANTIDAD) return `No puede ser mayor a ${MAX_CANTIDAD}`;
    return "";
  };
  const errorItemPrecio = (precio) => validarMonto(precio, { mensajeVacio: "Precio inválido" });
  const errorItemDescuento = (descuento, cantidad, precioUnitario) => {
    const d = Number(descuento) || 0;
    if (d < 0) return "No puede ser negativo";
    const subtotalLinea = (Number(cantidad) || 0) * (Number(precioUnitario) || 0);
    if (d > subtotalLinea) return "No puede ser mayor al subtotal de la línea";
    return "";
  };
  const errorDescuentoGeneral = (descuento) => {
    const d = Number(descuento) || 0;
    if (d < 0) return "No puede ser negativo";
    if (d > subtotal) return "No puede ser mayor al subtotal";
    return "";
  };
  const errorImpuestoGeneral = (impuesto) => {
    const i = Number(impuesto) || 0;
    if (i < 0) return "No puede ser negativo";
    if (i > MAX_MONTO) return `No puede ser mayor a ${MAX_MONTO.toLocaleString("es-CO")}`;
    return "";
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = {
        id_proveedor: Number(form.id_proveedor),
        numero_orden: form.numero_orden || null,
        descuento: Number(form.descuento) || 0,
        impuesto: Number(form.impuesto) || 0,
        estado: form.estado,
        fecha: form.fecha,
        observaciones: form.observaciones || null,
        items: form.items.map((it) => ({
          id_producto: Number(it.id_producto),
          id_variante: it.id_variante ? Number(it.id_variante) : null,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          descuento_linea: Number(it.descuento_linea) || 0,
        })),
      };
      await api.post("/compras", payload);
      setModal(false);
      setForm(formInicial());
      cargarCompras();
      showToast("exito", "Compra registrada correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al registrar la compra");
    } finally {
      setGuardando(false);
    }
  };

  const abrirDetalle = (c) => {
    setVerDetalle(c);
    setEstadoEditado(c.estado);
    setModoEdicion(false);
  };

  const abrirEdicion = (c) => {
    setVerDetalle(c);
    setEstadoEditado(c.estado);
    setModoEdicion(true);
  };

  const cerrarDetalle = () => {
    setVerDetalle(null);
    setModoEdicion(false);
  };

  // ── Cambio de estado directo desde el dropdown de la tabla ──
  const cambiarEstadoDesdeTabla = async (id, estado) => {
    setCambiandoEstadoTabla(true);
    try {
      if (estado === 'Anulado') {
        await api.patch(`/compras/${id}/anular`);
      } else {
        await api.patch(`/compras/${id}/estado`, { estado });
      }
      setCompras((prev) => prev.map((c) => (c.id_compra === id ? { ...c, estado } : c)));
      showToast("exito", `Compra marcada como "${estado}".`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al cambiar el estado de la compra");
    } finally {
      setCambiandoEstadoTabla(false);
    }
  };

  // ── Guardar estado desde el modal de detalle: ahora cierra toda la ventana ──
  const guardarEstado = async () => {
    setGuardandoEstado(true);
    try {
      const res = await api.patch(`/compras/${verDetalle.id_compra}/estado`, { estado: estadoEditado });
      setCompras((prev) => prev.map((c) => (c.id_compra === verDetalle.id_compra ? { ...c, estado: res.data.estado } : c)));
      cerrarDetalle();
      showToast("exito", `Compra marcada como "${res.data.estado}".`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al actualizar el estado de la compra");
    } finally {
      setGuardandoEstado(false);
    }
  };

  const anularCompra = async (id) => {
    const ok = await confirmar({ title: "Anular compra", message: "¿Anular esta compra? Esta acción no se puede deshacer.", confirmLabel: "Sí, anular" });
    if (!ok) return;
    try {
      await api.patch(`/compras/${id}/anular`);
      setCompras((prev) => prev.map((c) => (c.id_compra === id ? { ...c, estado: "Anulado" } : c)));
      showToast("exito", "Compra anulada correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al anular la compra");
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "Recibido":
      case "Pagado":
        return "compras-badge-active";
      case "Pendiente":
        return "compras-badge-pending";
      case "En Tránsito":
      case "Confirmado":
        return "compras-badge-info";
      case "Anulado":
        return "compras-badge-inactive";
      default:
        return "compras-badge-info";
    }
  };

  if (cargando) return <Loader text="Cargando compras..." />;

  return (
    <div className="compras-container">
      {error && <div className="compras-error-banner"><IconX /> {error}</div>}

      <div className="compras-actions-bar">
        <div className="compras-actions-left">
          <div className="compras-search-wrapper">
            <span className="compras-search-icon"><IconSearch /></span>
            <input
              type="text"
              className="compras-search-input"
              placeholder="Buscar por proveedor, N° orden o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="compras-search-clear" onClick={() => setBusqueda("")}>
                <IconX />
              </button>
            )}
          </div>
        </div>
        <div className="compras-actions-right">
          {tienePerm('Compras.crear') && (
            <button
              className="compras-btn-primary"
              onClick={() => { setForm(formInicial()); setErrores({}); setModal(true); }}
            >
              <span>+</span> Nueva compra
            </button>
          )}
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/compras", { params: { q: busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Proveedor", key: "proveedor" },
              { header: "N° Orden", key: "numero_orden" },
              { header: "Productos", value: (c) => c.items?.length || 0 },
              { header: "Total", key: "total" },
              { header: "Fecha", value: (c) => c.fecha?.toString().split("T")[0] },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="compras"
            titulo="Compras"
          />
        </div>
      </div>

      <div className="compras-results-count">
        {`${totalCompras} compra${totalCompras !== 1 ? 's' : ''} encontrada${totalCompras !== 1 ? 's' : ''}`}
      </div>

      <div className="tbl-container compras-tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Proveedor</th>
              <th className="tbl-th">N° Orden</th>
              <th className="tbl-th">Productos</th>
              <th className="tbl-th">Total</th>
              <th className="tbl-th">Fecha</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {compras.map((c) => (
              <tr key={c.id_compra} className="tbl-row">
                <td className="tbl-td"><span className="compras-proveedor-name">{c.proveedor}</span></td>
                <td className="tbl-td">{c.numero_orden || "—"}</td>
                <td className="tbl-td">{c.items?.length || 0} producto{c.items?.length !== 1 ? 's' : ''}</td>
                <td className="tbl-td compras-total-cell">{fmt(c.total)}</td>
                <td className="tbl-td compras-fecha-cell">{c.fecha?.toString().split("T")[0]}</td>
                <td className="tbl-td">
                  <EstadoDropdownCompra
                    compra={c}
                    abierto={filaAbierta === c.id_compra}
                    onToggle={setFilaAbierta}
                    onCambiar={cambiarEstadoDesdeTabla}
                    cambiando={cambiandoEstadoTabla}
                    tienePerm={tienePerm}
                  />
                </td>
                <td className="tbl-td">
                  <div className="compras-action-cell">
                    <button className="compras-action-btn compras-view-btn" onClick={() => abrirDetalle(c)} title="Ver detalles">
                      <IconEye />
                    </button>
                    {tienePerm('Compras.editar') && c.estado !== "Anulado" && (
                      <button className="compras-action-btn compras-edit-btn" onClick={() => abrirEdicion(c)} title="Editar estado">
                        <IconEdit />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {compras.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 0 }}>
                  <div className="compras-empty-state"><IconSearch /><p>No hay compras que coincidan con la búsqueda.</p></div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setPagina((p) => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalCompras} registros</span>
          </div>
        )}
      </div>

      {modal && (
        <div className="compras-modal-overlay" onClick={() => !guardando && setModal(false)}>
          <div className="compras-modal" onClick={(e) => e.stopPropagation()}>
            <div className="compras-modal-header">
              <h2 className="compras-modal-title">Nueva compra</h2>
              <button className="compras-modal-close" onClick={() => setModal(false)}><IconX /></button>
            </div>
            <div className="compras-modal-body">
              <div className="compras-form-row">
                <div className="compras-form-group">
                  <label className="compras-form-label">Proveedor</label>
                  <select
                    className={`compras-form-select${errores.id_proveedor ? " input-error" : ""}`}
                    value={form.id_proveedor}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setForm({ ...form, id_proveedor: valor });
                      if (errores.id_proveedor) setErrores((prev) => ({ ...prev, id_proveedor: valor ? "" : prev.id_proveedor }));
                    }}
                    onBlur={() => setErrores((prev) => ({ ...prev, id_proveedor: form.id_proveedor ? "" : "El proveedor es obligatorio" }))}
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.filter((p) => p.estado === "Activo").map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre_comercial || p.razon_social}
                      </option>
                    ))}
                  </select>
                  {errores.id_proveedor && <span className="compras-field-error">{errores.id_proveedor}</span>}
                  {proveedores.length === 0 && (
                    <span className="compras-field-hint">
                      No hay proveedores disponibles. Verifica que tu rol tenga el permiso "Proveedores.ver".
                    </span>
                  )}
                </div>
                <div className="compras-form-group">
                  <label className="compras-form-label">N° de orden (opcional)</label>
                  <input
                    type="text"
                    maxLength={MAX_LONGITUD_CODIGO}
                    className="compras-form-input"
                    value={form.numero_orden}
                    onChange={(e) => setForm({ ...form, numero_orden: e.target.value })}
                  />
                </div>
              </div>

              <div className="compras-form-row">
                <div className="compras-form-group">
                  <label className="compras-form-label">Fecha</label>
                  <input
                    type="date"
                    className={`compras-form-input${errores.fecha ? " input-error" : ""}`}
                    value={form.fecha}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setForm({ ...form, fecha: valor });
                      if (errores.fecha) setErrores((prev) => ({ ...prev, fecha: valor ? "" : prev.fecha }));
                    }}
                    onBlur={() => setErrores((prev) => ({ ...prev, fecha: form.fecha ? "" : "La fecha es obligatoria" }))}
                  />
                  {errores.fecha && <span className="compras-field-error">{errores.fecha}</span>}
                </div>
                <div className="compras-form-group">
                  <label className="compras-form-label">Estado</label>
                  <select className="compras-form-select" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Tránsito">En Tránsito</option>
                    <option value="Recibido">Recibido</option>
                  </select>
                </div>
              </div>

              <div className="compras-items-section">
                <div className="compras-items-header">
                  <label className="compras-form-label">Productos de la compra</label>
                  <button type="button" className="compras-btn-add-item" onClick={agregarItem}>+ Agregar producto</button>
                </div>

                <div className="compras-item-titulos">
                  <span>Producto</span>
                  <span>Talla / Color</span>
                  <span>Cantidad</span>
                  <span>Precio unitario</span>
                  <span title="Descuento aplicado solo a este producto, no a toda la compra">
                    Descuento producto <span className="compras-item-titulo-ayuda">ⓘ</span>
                  </span>
                  <span className="compras-item-titulos-subtotal">Subtotal</span>
                  <span></span>
                </div>

                {form.items.map((item, i) => {
                  const cant = Number(item.cantidad) || 0;
                  const precio = Number(item.precio_unitario) || 0;
                  const desc = Number(item.descuento_linea) || 0;
                  const lineaTotal = cant * precio - desc;
                  const productoSel = productos.find((p) => String(p.id_producto) === String(item.id_producto));
                  const variantesActivas = (productoSel?.variantes || []).filter((v) => v.estado === "Activo");
                  return (
                    <div className="compras-item-row" key={i}>
                      <div className="compras-item-field compras-item-field-producto">
                        <select
                          className={`compras-form-select${errores[`item_${i}_producto`] ? " input-error" : ""}`}
                          value={item.id_producto}
                          onChange={(e) => {
                            const valor = e.target.value;
                            actualizarItem(i, "id_producto", valor);
                            if (errores[`item_${i}_producto`]) {
                              setErrores((prev) => ({ ...prev, [`item_${i}_producto`]: errorItemProducto(valor) }));
                            }
                          }}
                          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_producto`]: errorItemProducto(item.id_producto) }))}
                        >
                          <option value="">Producto...</option>
                          {productos.map((p) => (
                            <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="compras-item-field compras-item-field-variante">
                        <select
                          className={`compras-form-select${errores[`item_${i}_variante`] ? " input-error" : ""}`}
                          value={item.id_variante}
                          onChange={(e) => {
                            const valor = e.target.value;
                            actualizarItem(i, "id_variante", valor);
                            if (errores[`item_${i}_variante`]) {
                              setErrores((prev) => ({ ...prev, [`item_${i}_variante`]: errorItemVariante(item.id_producto, valor) }));
                            }
                          }}
                          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_variante`]: errorItemVariante(item.id_producto, item.id_variante) }))}
                          disabled={!item.id_producto || variantesActivas.length === 0}
                        >
                          <option value="">
                            {!item.id_producto ? "Elige un producto" : variantesActivas.length === 0 ? "Sin variantes" : "Talla / color..."}
                          </option>
                          {variantesActivas.map((v) => (
                            <option key={v.id_variante} value={v.id_variante}>
                              {v.talla} · {v.color_nombre} (stock: {v.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="compras-item-field">
                        <input
                          type="number"
                          min="1"
                          max={MAX_CANTIDAD}
                          step={1}
                          placeholder="Cant."
                          className={`compras-form-input${errores[`item_${i}_cantidad`] ? " input-error" : ""}`}
                          value={item.cantidad}
                          onChange={(e) => {
                            const valor = e.target.value;
                            actualizarItem(i, "cantidad", valor);
                            if (errores[`item_${i}_cantidad`]) {
                              setErrores((prev) => ({ ...prev, [`item_${i}_cantidad`]: errorItemCantidad(valor) }));
                            }
                          }}
                          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_cantidad`]: errorItemCantidad(item.cantidad) }))}
                        />
                      </div>
                      <div className="compras-item-field">
                        <input
                          type="number"
                          min="0"
                          max={MAX_MONTO}
                          placeholder="Precio unit."
                          className={`compras-form-input${errores[`item_${i}_precio`] ? " input-error" : ""}`}
                          value={item.precio_unitario}
                          onChange={(e) => {
                            const valor = e.target.value;
                            actualizarItem(i, "precio_unitario", valor);
                            if (errores[`item_${i}_precio`]) {
                              setErrores((prev) => ({ ...prev, [`item_${i}_precio`]: errorItemPrecio(valor) }));
                            }
                          }}
                          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_precio`]: errorItemPrecio(item.precio_unitario) }))}
                        />
                      </div>
                      <div className="compras-item-field">
                        <input
                          type="number"
                          min="0"
                          max={MAX_MONTO}
                          placeholder="Descuento (opcional)"
                          className={`compras-form-input${errores[`item_${i}_descuento`] ? " input-error" : ""}`}
                          value={item.descuento_linea}
                          onChange={(e) => {
                            const valor = e.target.value;
                            actualizarItem(i, "descuento_linea", valor);
                            if (errores[`item_${i}_descuento`]) {
                              setErrores((prev) => ({ ...prev, [`item_${i}_descuento`]: errorItemDescuento(valor, item.cantidad, item.precio_unitario) }));
                            }
                          }}
                          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_descuento`]: errorItemDescuento(item.descuento_linea, item.cantidad, item.precio_unitario) }))}
                        />
                      </div>
                      <div className="compras-item-subtotal">{fmt(lineaTotal)}</div>
                      <button
                        type="button"
                        className="compras-item-remove"
                        onClick={() => quitarItem(i)}
                        disabled={form.items.length === 1}
                        title="Quitar producto"
                      >
                        <IconX />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="compras-form-row">
                <div className="compras-form-group">
                  <label className="compras-form-label">Descuento general (COP)</label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_MONTO}
                    className={`compras-form-input${errores.descuento ? " input-error" : ""}`}
                    value={form.descuento}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setForm({ ...form, descuento: valor });
                      if (errores.descuento) setErrores((prev) => ({ ...prev, descuento: errorDescuentoGeneral(valor) }));
                    }}
                    onBlur={() => setErrores((prev) => ({ ...prev, descuento: errorDescuentoGeneral(form.descuento) }))}
                  />
                </div>
                <div className="compras-form-group">
                  <label className="compras-form-label">Impuesto (COP)</label>
                  <input
                    type="number"
                    min="0"
                    max={MAX_MONTO}
                    className={`compras-form-input${errores.impuesto ? " input-error" : ""}`}
                    value={form.impuesto}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setForm({ ...form, impuesto: valor });
                      if (errores.impuesto) setErrores((prev) => ({ ...prev, impuesto: errorImpuestoGeneral(valor) }));
                    }}
                    onBlur={() => setErrores((prev) => ({ ...prev, impuesto: errorImpuestoGeneral(form.impuesto) }))}
                  />
                </div>
              </div>

              <div className="compras-form-group">
                <label className="compras-form-label">Observaciones (opcional)</label>
                <textarea
                  className="compras-form-input compras-form-textarea"
                  rows={2}
                  maxLength={MAX_LONGITUD_TEXTO_LIBRE}
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                />
              </div>

              <div className="compras-total-resumen">
                <span>Subtotal: {fmt(subtotal)}</span>
                <span className="compras-total-final">Total: {fmt(totalCompra)}</span>
              </div>
            </div>
            <div className="compras-modal-footer">
              <button className="compras-btn-secondary" onClick={() => setModal(false)} disabled={guardando}>Cancelar</button>
              <button className="compras-btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando..." : "Registrar compra"}
              </button>
            </div>
          </div>
        </div>
      )}

      {verDetalle && (
        <div className="compras-modal-overlay" onClick={() => !guardandoEstado && cerrarDetalle()}>
          <div className="compras-modal compras-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="compras-modal-header">
              <div>
                <h2 className="compras-modal-title">
                  C-{String(verDetalle.id_compra).padStart(3, "0")}
                </h2>
                <p className="compras-modal-subtitulo">Detalle de compra</p>
              </div>
              <button className="compras-modal-close" onClick={cerrarDetalle}><IconX /></button>
            </div>

            <div className="compras-modal-body compras-factura-body">

              {modoEdicion && (
                <div className="compras-edicion-banner">
                  <IconEdit /> Estás editando el estado de esta compra
                </div>
              )}

              <div className="compras-factura-seccion">
                <h3 className="compras-factura-titulo">Información</h3>
                <DetalleGrid>
                  <DetalleItem label="Proveedor" value={verDetalle.proveedor} />
                  <DetalleItem label="N° Orden" value={verDetalle.numero_orden} />
                  <DetalleItem label="Fecha" value={verDetalle.fecha?.toString().split("T")[0]} />
                  <DetalleItem label="Estado" value={
                    modoEdicion ? (
                      <select
                        className="compras-form-select compras-detalle-estado-select"
                        value={estadoEditado}
                        onChange={(e) => setEstadoEditado(e.target.value)}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Tránsito">En Tránsito</option>
                        <option value="Recibido">Recibido</option>
                      </select>
                    ) : (
                      <span className={`compras-badge ${getEstadoBadge(verDetalle.estado)}`}>{verDetalle.estado}</span>
                    )
                  } />
                  {verDetalle.observaciones && (
                    <DetalleItem label="Observaciones" value={verDetalle.observaciones} full />
                  )}
                </DetalleGrid>
              </div>

              <div className="compras-factura-seccion">
                <h3 className="compras-factura-titulo">Productos</h3>
                {(verDetalle.items || []).map((it, i) => (
                  <div key={i} className="compras-detalle-item-linea">
                    <span>{it.producto} {it.talla ? `(${it.talla}${it.color ? " · " + it.color : ""})` : ""} × {it.cantidad}</span>
                    <span>{fmt(it.cantidad * it.precio_unitario - (it.descuento_linea || 0))}</span>
                  </div>
                ))}
              </div>

              <div className="compras-factura-seccion">
                <h3 className="compras-factura-titulo">Pago</h3>
                <div className="compras-total-resumen compras-total-resumen-detalle">
                  <span>Subtotal: {fmt(verDetalle.subtotal)}</span>
                  <span>Descuento: {fmt(verDetalle.descuento)}</span>
                  <span>Impuesto: {fmt(verDetalle.impuesto)}</span>
                  <span className="compras-total-final">Total: {fmt(verDetalle.total)}</span>
                </div>
              </div>
            </div>

            <div className="compras-modal-footer">
              {modoEdicion ? (
                <>
                  <button
                    className="compras-btn-secondary"
                    onClick={() => { setModoEdicion(false); setEstadoEditado(verDetalle.estado); }}
                    disabled={guardandoEstado}
                  >
                    Cancelar
                  </button>
                  <button className="compras-btn-primary" onClick={guardarEstado} disabled={guardandoEstado}>
                    {guardandoEstado ? "Guardando..." : "Guardar cambios"}
                  </button>
                </>
              ) : (
                <>
                  <button className="compras-btn-secondary" onClick={cerrarDetalle}>Cerrar</button>
                  {tienePerm('Compras.editar') && verDetalle.estado !== "Anulado" && (
                    <button className="compras-btn-primary" onClick={() => setModoEdicion(true)}>
                      <IconEdit /> Editar estado
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}