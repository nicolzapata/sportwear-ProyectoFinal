// src/pages/pedidos/Pedidos.jsx
import { useState, useEffect, useRef } from "react";
import './Pedidos.css';
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import Loader from "../../../shared/components/Loader";
import { IconSearch, IconX, IconPrint } from "../../../shared/components/Icons";
import { FILAS_POR_PAGINA } from "../utils/pedidosHelpers";
import PedidosTable from "../components/pedidos/PedidosTable";
import PedidoDetalleModal from "../components/pedidos/PedidoDetalleModal";

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

  const cargar = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    setErrorMsg("");
    try {
      const { data } = await api.get("/pedidos", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
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

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

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
        totalPaginas={totalPaginas}
        pagina={pagina}
        setPagina={setPagina}
        total={total}
      />

      {verDetalle && (
        <PedidoDetalleModal verDetalle={verDetalle} setVerDetalle={setVerDetalle} />
      )}
    </div>
  );
}
