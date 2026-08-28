// src/pages/pedidos/Pedidos.jsx
import { useState, useEffect, useRef } from "react";
import './Pedidos.css';
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import Loader from "../../../shared/components/Loader";
import { IconSearch, IconX, IconPrint } from "../../../shared/components/Icons";
import { FILAS_POR_PAGINA, ESTADOS_FILTRO } from "../utils/pedidosHelpers";
import PedidosTable from "../components/pedidos/PedidosTable";
import PedidoDetalleModal from "../components/pedidos/PedidoDetalleModal";
import EditarPedidoModal from "../components/pedidos/EditarPedidoModal";
import FilterToggle from "../../../shared/components/FilterToggle";

const nuevaLinea = () => ({ id_producto: "", id_variante: "", cantidad: 1, precio_unitario: "" });

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
  const [verDetalle, setVerDetalle] = useState(null);
  const [cambiando,  setCambiando]  = useState(false);
  const [filaAbierta, setFilaAbierta] = useState(null);
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

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced, filtroEstado]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(pagina, busquedaDebounced); }, [pagina, busquedaDebounced, filtroEstado]);

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
    } catch (err) {
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
          <FilterToggle
            opciones={ESTADOS_FILTRO}
            valor={filtroEstado}
            onChange={setFiltroEstado}
          />
        </div>
        <div className="pedidos-actions-right">
          <button className="btn-print" onClick={() => window.print()} title="Imprimir tabla"><IconPrint /></button>
        </div>
      </div>

      <div className="pedidos-results-count">
        {`${total} pedido${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
      </div>

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

      {verDetalle && (
        <PedidoDetalleModal verDetalle={verDetalle} setVerDetalle={setVerDetalle} />
      )}

      {modalEditar && (
        <EditarPedidoModal
          pedido={modalEditar} onClose={cerrarEditar}
          form={formEditar} setForm={setFormEditar} errores={erroresEditar} setErrores={setErroresEditar}
          productos={productosEditar} metodosPago={metodosPagoEditar} cargandoDatos={cargandoDatosEditar}
          nuevasLineas={nuevasLineas} agregarLinea={agregarLinea} quitarLinea={quitarLinea} actualizarLinea={actualizarLinea}
          totalActual={totalActualEditar} totalNuevo={totalNuevoEditar}
          guardando={guardandoEditar} onGuardar={guardarEdicion}
        />
      )}
    </div>
  );
}
