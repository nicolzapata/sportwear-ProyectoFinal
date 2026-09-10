// src/pages/pedidos/Pedidos.jsx
import { useState, useEffect, useRef } from "react";
import './Pedidos.css';
import './Pedidos.cards.css';
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import Loader from "../../../shared/components/Loader";
import { IconSearch, IconX, IconPrint } from "../../../shared/components/Icons";
import { FILAS_POR_PAGINA, ESTADOS_FILTRO } from "../utils/pedidosHelpers";
import PedidosTable from "../components/pedidos/PedidosTable";
import PedidoListItem from "../components/pedidos/PedidoListItem";
import PedidoDetalleModal from "../components/pedidos/PedidoDetalleModal";
import EditarPedidoModal from "../components/pedidos/EditarPedidoModal";
import AbonosModal from "../components/pedidos-ventas/AbonosModal";
import FilterToggle from "../../../shared/components/FilterToggle";
import { useAbonosYAnulacionesState } from "../hooks/useAbonosYAnulacionesState";

const nuevaLinea = () => ({ id_producto: "", id_variante: "", cantidad: 1, precio_unitario: "" });

// ── Iconos del selector de vista (lista+detalle / tabla) — mismos que Roles/Proveedores ──
const IconVistaTarjetas = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconVistaTabla = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const OPCIONES_VISTA = [
  { valor: "tarjetas", etiqueta: <span title="Lista y detalle"><IconVistaTarjetas /></span> },
  { valor: "tabla",    etiqueta: <span title="Tabla"><IconVistaTabla /></span> },
];

// Estados sobre los que se calculan los conteos reales de los chips de
// filtro (uno por valor de ESTADOS_FILTRO) — "" es "Todos".
const ESTADOS_CONTEO = ['', 'Pendiente', 'En preparación', 'Enviado', 'Entregado', 'Cancelado'];

export default function Pedidos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos,      setDatos]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [cargando,   setCargando]   = useState(true);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [busqueda,   setBusqueda]   = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  // ── NUEVO: filtro por estado de envío — "" = Todos ──
  const [filtroEstado, setFiltroEstado] = useState("");
  const [pagina,     setPagina]     = useState(1);
  const [vista,      setVista]      = useState(() => localStorage.getItem("sz_pedidos_vista") || "tarjetas");
  const [verDetalle, setVerDetalle] = useState(null);
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [conteos,    setConteos]    = useState({});
  const [cambiando,  setCambiando]  = useState(false);
  const [filaAbierta, setFilaAbierta] = useState(null);
  // ── NUEVO: métodos de pago para el modal "Confirmar pago" — antes solo se
  // pedían al abrir "Editar pedido"; ahora también hacen falta para poder
  // registrar un pago sin pasar por ahí. ──
  const [metodosPago, setMetodosPago] = useState([]);
  useEffect(() => {
    api.get("/metodos-pago?activos=1").then(({ data }) => setMetodosPago(data || [])).catch(() => setMetodosPago([]));
  }, []);

  // Al cambiar de vista se cierra cualquier panel de ver detalle/editar
  // abierto — evita pasar a la tabla con el panel acoplado de la vista de
  // tarjetas todavía montado (o viceversa).
  const cambiarVista = (v) => {
    setVista(v);
    localStorage.setItem("sz_pedidos_vista", v);
    cerrarDetalle();
    setFilaAbierta(null);
    if (!guardandoEditar) setModalEditar(null);
  };
  // ── NUEVO: antes, cada búsqueda volvía a poner cargando=true, y como el
  // componente hacía "if (cargando) return <Loader/>", TODA la tabla (con
  // el buscador adentro) se desmontaba y remontaba en cada tecla — por eso
  // el foco del input se perdía. Ahora el loader de pantalla completa solo
  // se muestra en la carga inicial; las búsquedas posteriores no reemplazan
  // el árbol entero, así que el input nunca se desmonta. ──
  const primerCargaHecha = useRef(false);

  // ── NUEVO: editar pedido (conectado a Ventas) ──
  const [modalEditar, setModalEditar] = useState(null);
  const [cargandoDatosEditar, setCargandoDatosEditar] = useState(false);
  const [productosEditar, setProductosEditar] = useState([]);
  const [metodosPagoEditar, setMetodosPagoEditar] = useState([]);
  const [formEditar, setFormEditar] = useState({ direccion_entrega: "", observaciones: "", metodo_pago: "" });
  const [erroresEditar, setErroresEditar] = useState({});
  const [nuevasLineas, setNuevasLineas] = useState([]);
  const [guardandoEditar, setGuardandoEditar] = useState(false);

  const cargar = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    setErrorMsg("");
    try {
      const { data } = await api.get("/pedidos", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined, estado: filtroEstado || undefined } });
      setDatos(data.data);
      setTotal(data.total);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Error al cargar los pedidos");
    } finally {
      setCargando(false);
      primerCargaHecha.current = true;
    }
  };

  // ── NUEVO: "Confirmar pago" — mismo flujo de registrar abonos que ya
  // existe en Ventas (AbonosModal/useAbonosYAnulacionesState), reutilizado
  // acá porque un pedido de cliente sin pago confirmado no aparece en Ventas
  // (no se puede llegar a él desde ahí) — necesita su propia puerta de
  // entrada. Se recarga la lista de Pedidos, no la de Ventas. ──
  const abonosYAnulaciones = useAbonosYAnulacionesState({
    cargar: () => cargar(pagina, busquedaDebounced),
    setCambiandoEstado: setCambiando,
  });

  const abrirConfirmarPago = async (p) => {
    try {
      const [ventaRes, pagosRes] = await Promise.all([
        api.get(`/ventas/${p.id_venta}`),
        api.get(`/ventas/${p.id_venta}/pagos`),
      ]);
      const total_pagado = (pagosRes.data || [])
        .filter((a) => a.estado === "Confirmado")
        .reduce((acc, a) => acc + Number(a.monto), 0);
      abonosYAnulaciones.setAbonosModal({ ...ventaRes.data, abonos: pagosRes.data, total_pagado });
    } catch {
      showToast("error", "No se pudo cargar la información de pago de este pedido.");
    }
  };

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced, filtroEstado]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(pagina, busquedaDebounced); }, [pagina, busquedaDebounced, filtroEstado]);

  // Conteo real por estado para los chips de filtro (no depende del
  // buscador ni de la página actual — es el total global por estado, igual
  // que en el mockup). Son 6 peticiones livianas (limit=1, solo se lee el
  // total) — se recalculan al entrar y cada vez que cambia el estado de
  // algún pedido.
  const cargarConteos = async () => {
    try {
      const resultados = await Promise.all(
        ESTADOS_CONTEO.map((estado) => api.get("/pedidos", { params: { page: 1, limit: 1, estado: estado || undefined } }))
      );
      const mapa = {};
      ESTADOS_CONTEO.forEach((estado, i) => { mapa[estado] = resultados[i].data.total || 0; });
      setConteos(mapa);
    } catch { /* los chips simplemente no muestran conteo si falla */ }
  };
  useEffect(() => { cargarConteos(); }, []);

  const abrirDetalle = async (p) => {
    setPedidoSeleccionadoId(p.id_pedido);
    setCargandoDetalle(true);
    try {
      const { data } = await api.get(`/pedidos/${p.id_pedido}`);
      setVerDetalle(data);
    } catch {
      setVerDetalle(p);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setVerDetalle(null);
    setPedidoSeleccionadoId(null);
  };

  // Vista "lista + detalle": mantiene seleccionado el primer pedido visible
  // de la página actual, igual que en Roles/Proveedores.
  useEffect(() => {
    if (vista !== 'tarjetas') return;
    if (datos.length === 0) { cerrarDetalle(); return; }
    if (!datos.some((p) => p.id_pedido === pedidoSeleccionadoId)) {
      abrirDetalle(datos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, datos]);

  const cambiarEstado = async (id_pedido, estado) => {
    setCambiando(true);
    try {
      await api.patch(`/pedidos/${id_pedido}/estado`, { estado });
      setDatos((prev) => prev.map((p) => p.id_pedido === id_pedido ? { ...p, estado_pedido: estado } : p));
      if (verDetalle?.id_pedido === id_pedido) {
        const { data } = await api.get(`/pedidos/${id_pedido}`);
        setVerDetalle(data);
      }
      cargarConteos();
      showToast("exito", `Pedido marcado como "${estado}".`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al cambiar el estado del pedido");
    } finally {
      setCambiando(false);
    }
  };

  // ── NUEVO: abrir el modal de edición — carga el detalle completo del
  // pedido (para tener observaciones/subtotal/items reales) y, en
  // paralelo, productos y métodos de pago para el selector de líneas nuevas. ──
  const abrirEditar = async (p) => {
    setModalEditar(p);
    setNuevasLineas([]);
    setErroresEditar({});
    setCargandoDatosEditar(true);
    try {
      const [pedidoRes, productosRes, metodosRes] = await Promise.all([
        api.get(`/pedidos/${p.id_pedido}`),
        api.get("/productos"),
        api.get("/metodos-pago?activos=1"),
      ]);
      setModalEditar(pedidoRes.data);
      setFormEditar({
        direccion_entrega: pedidoRes.data.direccion_entrega || "",
        observaciones: pedidoRes.data.observaciones || "",
        metodo_pago: pedidoRes.data.metodo_pago || metodosRes.data?.[0]?.nombre || "",
      });
      setProductosEditar((productosRes.data || []).filter((prod) => prod.estado === "Activo"));
      setMetodosPagoEditar(metodosRes.data || []);
    } catch {
      showToast("error", "No se pudo cargar el pedido para editar.");
      setModalEditar(null);
    } finally {
      setCargandoDatosEditar(false);
    }
  };

  const cerrarEditar = () => {
    if (guardandoEditar) return;
    setModalEditar(null);
  };

  const agregarLinea = () => setNuevasLineas((prev) => [...prev, nuevaLinea()]);
  const quitarLinea = (index) => setNuevasLineas((prev) => prev.filter((_, i) => i !== index));
  const actualizarLinea = (index, campo, valor) => {
    setNuevasLineas((prev) => {
      const lineas = [...prev];
      lineas[index] = { ...lineas[index], [campo]: valor };
      if (campo === "id_producto") {
        lineas[index].id_variante = "";
        const producto = productosEditar.find((p) => String(p.id_producto) === String(valor));
        lineas[index].precio_unitario = producto?.precio ?? "";
      }
      return lineas;
    });
  };

  const totalNuevasLineas = nuevasLineas.reduce((acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.precio_unitario) || 0), 0);
  const totalActualEditar = Number(modalEditar?.total || 0);
  const totalNuevoEditar = totalActualEditar + totalNuevasLineas;

  const validarEdicion = () => {
    const e = {};
    if (!formEditar.direccion_entrega?.trim()) e.direccion_entrega = "La dirección de entrega es obligatoria";
    nuevasLineas.forEach((l, i) => {
      if (!l.id_producto) e[`linea_${i}_producto`] = "Selecciona un producto";
      const producto = productosEditar.find((p) => String(p.id_producto) === String(l.id_producto));
      const variantesActivas = (producto?.variantes || []).filter((v) => v.estado === "Activo");
      if (variantesActivas.length > 0 && !l.id_variante) e[`linea_${i}_variante`] = "Selecciona talla y color";
      const cant = Number(l.cantidad);
      if (!cant || cant <= 0 || !Number.isInteger(cant)) e[`linea_${i}_cantidad`] = "Cantidad inválida";
      else {
        const variante = variantesActivas.find((v) => String(v.id_variante) === String(l.id_variante));
        if (variante && cant > Number(variante.stock)) e[`linea_${i}_cantidad`] = `Solo hay ${variante.stock} unidades disponibles`;
      }
    });
    setErroresEditar(e);
    return Object.keys(e).length === 0;
  };

  const guardarEdicion = async () => {
    if (!validarEdicion()) return;
    setGuardandoEditar(true);
    try {
      await api.patch(`/pedidos/${modalEditar.id_pedido}`, {
        direccion_entrega: formEditar.direccion_entrega.trim(),
        observaciones: formEditar.observaciones?.trim() || null,
        metodo_pago: formEditar.metodo_pago || null,
        nuevos_items: nuevasLineas.map((l) => ({
          id_producto: Number(l.id_producto),
          id_variante: l.id_variante ? Number(l.id_variante) : null,
          cantidad: Number(l.cantidad),
          precio_unitario: Number(l.precio_unitario),
        })),
      });
      await cargar(pagina, busquedaDebounced);
      setModalEditar(null);
      showToast("exito", "Pedido actualizado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al actualizar el pedido");
    } finally {
      setGuardandoEditar(false);
    }
  };

  const totalPaginas = Math.ceil(total / FILAS_POR_PAGINA) || 1;

  if (cargando && !primerCargaHecha.current) return <Loader text="Cargando pedidos..." />;

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
              placeholder="Buscar por cliente o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="pedidos-search-clear" onClick={() => setBusqueda("")}>
                <IconX />
              </button>
            )}
          </div>
        </div>
        <div className="pedidos-actions-right">
          <FilterToggle opciones={OPCIONES_VISTA} valor={vista} onChange={cambiarVista} />
          <button className="btn-print" onClick={() => window.print()} title="Imprimir tabla"><IconPrint /></button>
        </div>
      </div>

      <div className="ped-filter-toggle">
        {ESTADOS_FILTRO.map(({ valor, etiqueta }) => (
          <button
            key={valor || 'todos'}
            className={`ped-filter-btn${filtroEstado === valor ? ' active' : ''}`}
            onClick={() => setFiltroEstado(valor)}
          >
            {etiqueta}{conteos[valor] !== undefined ? ` (${conteos[valor]})` : ''}
          </button>
        ))}
      </div>

      <div className="pedidos-results-count">
        {`${total} pedido${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
      </div>

      {vista === "tabla" ? (
        <div className={(verDetalle || modalEditar) ? "pedidos-contenido-split" : "pedidos-contenido"}>
          <PedidosTable
            datos={datos}
            cargando={cargando}
            filaAbierta={filaAbierta}
            setFilaAbierta={setFilaAbierta}
            cambiarEstado={cambiarEstado}
            cambiando={cambiando}
            tienePerm={tienePerm}
            abrirDetalle={abrirDetalle}
            abrirEditar={abrirEditar}
            totalPaginas={totalPaginas}
            pagina={pagina}
            setPagina={setPagina}
            total={total}
          />

          {(verDetalle || modalEditar) && (
            <div className="pedidos-panel-columna">
              {modalEditar ? (
                <EditarPedidoModal
                  variante="panel"
                  pedido={modalEditar} onClose={cerrarEditar}
                  form={formEditar} setForm={setFormEditar} errores={erroresEditar} setErrores={setErroresEditar}
                  productos={productosEditar} metodosPago={metodosPagoEditar} cargandoDatos={cargandoDatosEditar}
                  nuevasLineas={nuevasLineas} agregarLinea={agregarLinea} quitarLinea={quitarLinea} actualizarLinea={actualizarLinea}
                  totalActual={totalActualEditar} totalNuevo={totalNuevoEditar}
                  guardando={guardandoEditar} onGuardar={guardarEdicion}
                />
              ) : (
                <PedidoDetalleModal
                  verDetalle={verDetalle} setVerDetalle={cerrarDetalle} cargandoDetalle={cargandoDetalle}
                  cambiarEstado={cambiarEstado} cambiando={cambiando} tienePerm={tienePerm}
                  filaAbierta={filaAbierta} setFilaAbierta={setFilaAbierta} abrirEditar={abrirEditar}
                  abrirConfirmarPago={abrirConfirmarPago}
                />
              )}
            </div>
          )}
        </div>
      ) : datos.length === 0 ? (
        <p className="ped-empty">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay pedidos para mostrar."}</p>
      ) : (
        <div className="ped-lista-detalle">
          <div className="ped-lista">
            {datos.map((p) => (
              <PedidoListItem
                key={p.id_pedido} pedido={p}
                seleccionado={p.id_pedido === pedidoSeleccionadoId}
                onSeleccionar={(id) => {
                  const pedido = datos.find((d) => d.id_pedido === id);
                  if (pedido) abrirDetalle(pedido);
                }}
              />
            ))}
          </div>

          {modalEditar ? (
            <EditarPedidoModal
              variante="panel"
              pedido={modalEditar} onClose={cerrarEditar}
              form={formEditar} setForm={setFormEditar} errores={erroresEditar} setErrores={setErroresEditar}
              productos={productosEditar} metodosPago={metodosPagoEditar} cargandoDatos={cargandoDatosEditar}
              nuevasLineas={nuevasLineas} agregarLinea={agregarLinea} quitarLinea={quitarLinea} actualizarLinea={actualizarLinea}
              totalActual={totalActualEditar} totalNuevo={totalNuevoEditar}
              guardando={guardandoEditar} onGuardar={guardarEdicion}
            />
          ) : (
            <PedidoDetalleModal
              verDetalle={verDetalle} setVerDetalle={cerrarDetalle} cargandoDetalle={cargandoDetalle}
              cambiarEstado={cambiarEstado} cambiando={cambiando} tienePerm={tienePerm}
              filaAbierta={filaAbierta} setFilaAbierta={setFilaAbierta} abrirEditar={abrirEditar}
              abrirConfirmarPago={abrirConfirmarPago}
            />
          )}
        </div>
      )}

      {totalPaginas > 1 && vista === "tarjetas" && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPagina((p) => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
          <span className="paginador-info">Página {pagina} de {totalPaginas} · {total} registros</span>
        </div>
      )}

      <AbonosModal
        abonosModal={abonosYAnulaciones.abonosModal} setAbonosModal={abonosYAnulaciones.setAbonosModal} tienePerm={tienePerm}
        formAbono={abonosYAnulaciones.formAbono} setFormAbono={abonosYAnulaciones.setFormAbono}
        erroresAbono={abonosYAnulaciones.erroresAbono} setErroresAbono={abonosYAnulaciones.setErroresAbono}
        metodosPago={metodosPago} guardandoAbono={abonosYAnulaciones.guardandoAbono} agregarAbono={abonosYAnulaciones.agregarAbono}
      />
    </div>
  );
}
