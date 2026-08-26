// src/pages/colores/Colores.jsx
import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import ModalSteps from "../../../shared/components/ModalSteps";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import Toast from "../../../shared/components/Toast";
import ExportButtons from "../../../shared/components/ExportButtons";
import Loader from "../../../shared/components/Loader";
// Colores.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original. GestProductos.jsx
// también importa estos mismos archivos (reutiliza el picker/preview de color).
import "./Colores.layout.css";
import "./Colores.modals.css";
import "./Colores.responsive.css";
import { IconPalette, IconSearch, IconX } from "../../../shared/components/Icons";
import ColorFormSteps from "../components/colores/ColorFormSteps";
import ColoresGrid from "../components/colores/ColoresGrid";
import ColoresTable from "../components/colores/ColoresTable";
import { getBrightness, mensajeErrorNombreColor, mensajeErrorCodigoHex } from "../utils/coloresHelpers";

export default function Colores() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,    setDatos]    = useState([]); // listado completo (activos): alimenta la pestaña "Muestra"
  const [datosLista, setDatosLista] = useState([]); // página actual de la pestaña "Lista"
  const [totalColores, setTotalColores] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina,   setPagina]   = useState(1);
  const [modal,    setModal]    = useState(false);
  const [editar,   setEditar]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("muestra");
  const [form, setForm] = useState({ nombre: "", codigo_hex: "#000000", estado: "Activo" });
  const [errores, setErrores] = useState({ nombre: "", codigo_hex: "" });
  const [toast, setToast] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };
  const FILAS_POR_PAGINA = 10;

  const cargar = async () => {
    try {
      const { data } = await api.get("/colores");
      const sinDuplicados = [...new Map(data.map(c => [c.codigo_hex.toLowerCase(), c])).values()];
      setDatos(sinDuplicados.sort((a,b) => getBrightness(b.codigo_hex) - getBrightness(a.codigo_hex)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const cargarLista = async (pag = pagina, q = busquedaDebounced) => {
    try {
      const { data } = await api.get("/colores", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setDatosLista(data.data);
      setTotalColores(data.total);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { cargar(); }, []);

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'lista') cargarLista(pagina, busquedaDebounced); }, [tab, pagina, busquedaDebounced]);

  const totalPaginas = Math.ceil(totalColores / FILAS_POR_PAGINA) || 1;

  const abrirRegistrar = () => { setEditar(null); setForm({ nombre: "", codigo_hex: "#000000", estado: "Activo" }); setModal(true); };
  const abrirEditar    = (c) => { setEditar(c.id_color); setForm({ nombre: c.nombre, codigo_hex: c.codigo_hex, estado: c.estado }); setModal(true); };

  const guardar = async () => {
    if (!form.nombre?.trim()) return false;
    try {
      if (editar) await api.put(`/colores/${editar}`, form);
      else        await api.post("/colores", form);
      setModal(false); cargar(); cargarLista();
    } catch (err) { console.error(err); return false; }
  };

  const validarPasoColor = () => {
    const msg = mensajeErrorCodigoHex(form.codigo_hex);
    setErrores(prev => ({ ...prev, codigo_hex: msg }));
    return !msg;
  };

  const validarPasoDatos = () => {
    const msg = mensajeErrorNombreColor(form.nombre);
    setErrores(prev => ({ ...prev, nombre: msg }));
    return !msg;
  };

  const validarPasoCompleto = () => {
    const colorValido = validarPasoColor();
    const nombreValido = validarPasoDatos();
    return colorValido && nombreValido;
  };

  const eliminarColor = async (id) => {
    setPendingDeleteId(id);
  };

  const confirmarEliminarColor = async () => {
    if (!pendingDeleteId) return;
    try {
      await api.delete(`/colores/${pendingDeleteId}`);
      setPendingDeleteId(null);
      cargar(); cargarLista();
    } catch (err) {
      setPendingDeleteId(null);
      showToast("error", err.response?.data?.message || "Error al eliminar color");
    }
  };

  // Sin try/catch propio: si el backend rechaza el cambio (p. ej. el color
  // sigue asociado a productos), el error debe propagarse para que
  // StatusToggle lo capture y muestre el mensaje real — si se atrapara aquí,
  // StatusToggle no vería ningún rechazo y mostraría igual un toast de éxito.
  const toggleEstado = async (id) => {
    await api.patch(`/colores/${id}/estado`);
    cargar(); cargarLista();
  };

  if (loading) return <Loader text="Cargando colores..." />;

  return (
    <div className="colores-container">
      <div className="colores-actions-bar">
        <div className="colores-actions-left">
          <div className="colores-search-wrapper">
            <span className="colores-search-icon"><IconSearch /></span>
            <input type="text" className="colores-search-input" placeholder="Buscar color..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            {busqueda && <button className="colores-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>
          <div className="colores-tabs-bar">
            <button className={`colores-tab-btn${tab === 'muestra' ? ' active' : ''}`} onClick={() => setTab('muestra')}><IconPalette /> Muestra</button>
            <button className={`colores-tab-btn${tab === 'lista' ? ' active' : ''}`} onClick={() => setTab('lista')}>Lista</button>
          </div>
        </div>
        <div className="colores-actions-right">
          {tienePerm('Colores.crear') && (
            <button className="colores-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo color</button>
          )}
          {tab === 'lista' && (
            <ExportButtons
              obtenerDatos={async () => {
                const { data } = await api.get("/colores", { params: { q: busquedaDebounced || undefined } });
                return data;
              }}
              columnas={[
                { header: "Nombre", key: "nombre" },
                { header: "HEX", key: "codigo_hex" },
                ...(tienePerm('Colores.estado') ? [{ header: "Estado", key: "estado" }] : []),
              ]}
              nombreArchivo="colores"
              titulo="Colores"
            />
          )}
        </div>
      </div>

      {tab === 'muestra' && <ColoresGrid datos={datos} />}

      {tab === 'lista' && (
        <ColoresTable
          datosLista={datosLista}
          tienePerm={tienePerm}
          toggleEstado={toggleEstado}
          abrirEditar={abrirEditar}
          eliminarColor={eliminarColor}
          totalPaginas={totalPaginas}
          pagina={pagina}
          setPagina={setPagina}
          totalColores={totalColores}
        />
      )}

      {modal && (
        <ModalSteps titulo={editar ? "Editar color" : "Nuevo color"} pasos={["Color y nombre"]} onClose={() => setModal(false)} onGuardar={guardar} validaciones={[validarPasoCompleto]} labelGuardar={editar ? "Actualizar" : "Registrar"}>
          <ColorFormSteps form={form} setForm={setForm} errores={errores} setErrores={setErrores} />
        </ModalSteps>
      )}

      {pendingDeleteId && (
        <ConfirmModal
          title="Eliminar color"
          message="¿Eliminar este color? Se eliminarán las variantes asociadas."
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={confirmarEliminarColor}
          confirmLabel="Sí, eliminar"
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
