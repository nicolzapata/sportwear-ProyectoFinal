// src/pages/colores/Colores.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import StatusToggle from "../../components/StatusToggle";
import ConfirmModal from "../../components/ConfirmModal";
import Toast from "../../components/Toast";
import ExportButtons from "../../components/ExportButtons";
import './Colores.css';
import { IconEdit, IconPalette, IconSearch, IconTrash, IconX } from "../../components/Icons";

const getBrightness = (hex) => {
  const r = parseInt(hex.substring(1,3),16), g = parseInt(hex.substring(3,5),16), b = parseInt(hex.substring(5,7),16);
  return (r*299 + g*587 + b*114) / 1000;
};

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
    if (!form.codigo_hex) {
      setErrores(prev => ({ ...prev, codigo_hex: "Selecciona un color válido" }));
      return false;
    }
    setErrores(prev => ({ ...prev, codigo_hex: "" }));
    return true;
  };

  const validarPasoDatos = () => {
    if (!form.nombre.trim()) {
      setErrores(prev => ({ ...prev, nombre: "El nombre del color es obligatorio" }));
      return false;
    }
    setErrores(prev => ({ ...prev, nombre: "" }));
    return true;
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

  const toggleEstado = async (id) => {
    try {
      await api.patch(`/colores/${id}/estado`);
      cargar(); cargarLista();
    } catch { showToast("error", "Error al cambiar estado"); }
  };

  if (loading) return (
    <div className="colores-loading-container">
      <div className="colores-loading-spinner"></div>
      <p className="colores-loading-text">Cargando colores...</p>
    </div>
  );

  const PasoColor = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Color HEX <span className="ms-req">*</span></label>
        <div className="colores-color-picker-wrapper">
          <input
            type="color"
            className={`colores-color-picker${errores.codigo_hex ? " input-error" : ""}`}
            value={form.codigo_hex}
            onChange={e => {
              setForm({ ...form, codigo_hex: e.target.value });
              if (errores.codigo_hex) setErrores(prev => ({ ...prev, codigo_hex: "" }));
            }}
          />
          <span className="colores-color-value">{form.codigo_hex}</span>
        </div>
        {errores.codigo_hex && <span className="ms-form-error">{errores.codigo_hex}</span>}
      </div>
      <div className="colores-preview" style={{ marginTop: 8 }}>
        <div className="colores-preview-label">Vista previa</div>
        <div className="colores-preview-sample" style={{ backgroundColor: form.codigo_hex }}>
          <span style={{ color: getBrightness(form.codigo_hex) > 128 ? '#000' : '#fff' }}>{form.nombre || 'Color'}</span>
        </div>
      </div>
    </div>
  );

  const PasoDatos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Nombre del color <span className="ms-req">*</span></label>
        <input
          type="text"
          className={`ms-form-input${errores.nombre ? " input-error" : ""}`}
          placeholder="Ej: Rojo Intenso"
          value={form.nombre}
          onChange={e => {
            const nombre = e.target.value;
            setForm({ ...form, nombre });
            if (errores.nombre) setErrores(prev => ({ ...prev, nombre: nombre.trim() ? "" : prev.nombre }));
          }}
          onBlur={() => setErrores(prev => ({ ...prev, nombre: form.nombre.trim() ? "" : "El nombre del color es obligatorio" }))}
        />
        {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
      </div>
    </div>
  );

  const PasoColorYDatos = (
    <>
      {PasoColor}
      {PasoDatos}
    </>
  );

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

      {tab === 'muestra' && (
        <div className="colores-grid">
          {datos.filter(c => c.estado === "Activo").map((c) => (
            <div key={c.id_color} className="colores-grid-item">
              <div className="colores-grid-sample" style={{ backgroundColor: c.codigo_hex }} />
              <div className="colores-grid-info">
                <div className="colores-grid-name">{c.nombre}</div>
                <div className="colores-grid-hex">{c.codigo_hex}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'lista' && (
        <div className="tbl-container">
          <table className="tbl">
            <thead className="tbl-header">
              <tr>
                <th className="tbl-th">Nombre</th>
                <th className="tbl-th">HEX</th>
                {tienePerm('Colores.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {datosLista.map((c) => (
                <tr key={c.id_color} className="tbl-row">
                  <td className="tbl-td">
                    <div className="colores-name-cell">
                      <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: c.codigo_hex, border: "1px solid rgba(0,0,0,0.1)", marginRight: 8, flexShrink: 0 }} />
                      <span className="colores-name-text">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="tbl-td"><code className="colores-hex-code">{c.codigo_hex}</code></td>
                  {tienePerm('Colores.estado') && (
                    <td className="tbl-td"><StatusToggle id={c.id_color} estado={c.estado} onToggle={toggleEstado} /></td>
                  )}
                  <td className="tbl-td">
                    <div className="colores-action-cell">
                      {tienePerm('Colores.editar') && (
                        <button className="colores-action-btn colores-edit-btn" onClick={() => abrirEditar(c)} title="Editar"><IconEdit /></button>
                      )}
                      {tienePerm('Colores.eliminar') && (
                        <button className="colores-action-btn colores-deactivate-btn" onClick={() => eliminarColor(c.id_color)} title="Eliminar"><IconTrash /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginas > 1 && (
            <div className="paginador">
              <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
              ))}
              <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
              <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalColores} registros</span>
            </div>
          )}
          {/* Print button moved to top action bar */}
        </div>
      )}

      {modal && (
        <ModalSteps titulo={editar ? "Editar color" : "Nuevo color"} pasos={["Color y nombre"]} onClose={() => setModal(false)} onGuardar={guardar} validaciones={[validarPasoCompleto]} labelGuardar={editar ? "Actualizar" : "Registrar"}>
          {PasoColorYDatos}
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