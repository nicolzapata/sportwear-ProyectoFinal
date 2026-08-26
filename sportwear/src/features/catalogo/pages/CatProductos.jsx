// src/pages/categorias/CatProductos.jsx
import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import ModalSteps from "../../../shared/components/ModalSteps";
import StatusToggle from "../../../shared/components/StatusToggle";
import Loader from "../../../shared/components/Loader";
// CatProductos.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import './CatProductos.layout.css';
import './CatProductos.modals.css';
import './CatProductos.responsive.css';
import { IconBan, IconCheck, IconEdit, IconSearch, IconX } from "../../../shared/components/Icons";

const ICONOS = [
  { id: "shirt", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg> },
  { id: "shoe", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H8.5L3 9.5"/><path d="M10 9.5 8.5 16"/><path d="m14 9.5 1.5 4"/></svg> },
  { id: "bag", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
  { id: "hat", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/><path d="M12 2c2 4 4 6 10 10"/><path d="M2 12h20"/></svg> },
  { id: "watch", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><line x1="12" y1="10" x2="12" y2="12"/><line x1="12" y1="12" x2="14" y2="12"/><path d="M7 6V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2"/><path d="M7 18v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/></svg> },
  { id: "gem", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 18 3 22 9 12 22 2 9"/><polyline points="2 9 12 14 22 9"/><line x1="12" y1="22" x2="12" y2="14"/></svg> },
  { id: "jacket", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L8 6H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-3l-4-4z"/><path d="M12 2v7"/><path d="M8 6l-3 3"/><path d="M16 6l3 3"/></svg> },
  { id: "star", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { id: "tag", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> },
  { id: "flame", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg> },
  { id: "crown", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 19h20"/><path d="M2 19l3-9 5 5 2-9 2 9 5-5 3 9"/></svg> },
  { id: "layers", svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> },
];

const getIcono = (id) => ICONOS.find(i => i.id === id)?.svg || ICONOS.find(i => i.id === "tag").svg;

export default function CatProductos() {
  const [datos,      setDatos]      = useState([]);
  const [busqueda,   setBusqueda]   = useState("");
  const [modal,      setModal]      = useState(false);
  const [editar,     setEditar]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [iconPicker, setIconPicker] = useState(false);
  const [errores,    setErrores]    = useState({ nombre: "" });
   const [form, setForm] = useState({ nombre: "", descripcion: "", estado: "Activo", icono: "tag" });
   const FILAS_POR_PAGINA = 10;
   const [pagina, setPagina] = useState(1);

  const cargar = async () => {
    try { const { data } = await api.get("/categorias"); setDatos(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

   const filtradosAll = datos.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
   const totalPaginas = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA);
   const filtrados = filtradosAll.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const abrirRegistrar = () => {
    setEditar(null);
    setForm({ nombre: "", descripcion: "", estado: "Activo", icono: "tag" });
    setIconPicker(false);
    setModal(true);
  };

  const abrirEditar = (c) => {
    setEditar(c.id_categoria);
    setForm({ nombre: c.nombre, descripcion: c.descripcion, estado: c.estado, icono: c.icono || "tag" });
    setIconPicker(false);
    setModal(true);
  };

  const validarPasoDatos = () => {
    if (!form.nombre.trim()) {
      setErrores({ nombre: "El nombre de la categoría es obligatorio" });
      return false;
    }
    setErrores({ nombre: "" });
    return true;
  };

  const guardar = async () => {
    if (!validarPasoDatos()) return false;
    try {
      if (editar) await api.put(`/categorias/${editar}`, form);
      else        await api.post("/categorias", form);
      setModal(false);
      cargar();
    } catch (err) { console.error(err); }
  };

  const toggleEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/categorias/${id}/estado`);
      setDatos(prev => prev.map(c => c.id_categoria === id ? { ...c, estado: nuevoEstado } : c));
    } catch (err) { console.error(err); }
  };

  if (loading) return <Loader text="Cargando categorías..." />;

  // ── Pasos ──────────────────────────────────────────────────────────────────
  const PasoIcono = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Icono de la categoría</label>
        <button className="catproductos-icon-selector" onClick={() => setIconPicker(!iconPicker)} type="button">
          <span className="catproductos-icon-selector-preview">{getIcono(form.icono)}</span>
          <span className="catproductos-icon-selector-text">{iconPicker ? 'Cerrar selector' : 'Cambiar icono'}</span>
          <span className="catproductos-icon-selector-arrow">{iconPicker ? '▲' : '▼'}</span>
        </button>
        {iconPicker && (
          <div className="catproductos-icon-grid" style={{ marginTop: 8 }}>
            {ICONOS.map((icono) => (
              <button
                key={icono.id}
                type="button"
                className={`catproductos-icon-option${form.icono === icono.id ? ' selected' : ''}`}
                onClick={() => { setForm({ ...form, icono: icono.id }); setIconPicker(false); }}
                title={icono.id}
              >
                {icono.svg}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="ms-form-hint" style={{ marginTop: 8 }}>El icono aparecerá junto al nombre de la categoría en toda la plataforma.</p>
    </div>
  );

  const PasoDatos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Nombre de la categoría <span className="ms-req">*</span></label>
        <input
          type="text"
          className={`ms-form-input${errores.nombre ? " input-error" : ""}`}
          placeholder="Ej: Ropa Deportiva"
          value={form.nombre}
          onChange={e => {
            const nombre = e.target.value;
            setForm({ ...form, nombre });
            if (errores.nombre) setErrores({ nombre: nombre.trim() ? "" : errores.nombre });
          }}
          onBlur={() => setErrores({ nombre: form.nombre.trim() ? "" : "El nombre de la categoría es obligatorio" })}
        />
        {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
      </div>
    </div>
  );

  return (
    <div className="catproductos-container">
      <div className="catproductos-actions-bar">
        <div className="catproductos-search-wrapper">
          <span className="catproductos-search-icon"><IconSearch /></span>
          <input
            type="text"
            className="catproductos-search-input"
            placeholder="Buscar categoría..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          />
          {busqueda && <button className="catproductos-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}><IconX /></button>}
        </div>
        <button className="catproductos-btn-primary" onClick={abrirRegistrar}><span>+</span> Nueva categoría</button>
      </div>

      <div className="catproductos-results-count">
        {filtrados.length} categoría{filtrados.length !== 1 ? 's' : ''} encontrada{filtrados.length !== 1 ? 's' : ''}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Nombre</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtrados.map((c) => (
              <tr key={c.id_categoria} className="tbl-row">
                <td className="tbl-td">
                  <div className="catproductos-categoria-cell">
                    <div className="catproductos-categoria-avatar">{getIcono(c.icono)}</div>
                    <span className="catproductos-categoria-name">{c.nombre}</span>
                  </div>
                </td>
<td className="tbl-td">
                  <StatusToggle id={c.id_categoria} estado={c.estado} onToggle={toggleEstado} showConfirmation={true} nombreRegistro={c.nombre} />
                </td>
                <td className="tbl-td">
                  <div className="catproductos-action-cell">
                    <button className="catproductos-action-btn catproductos-edit-btn" onClick={() => abrirEditar(c)} title="Editar">
                      <IconEdit />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginador */}
        {totalPaginas > 1 && (
          <div className="paginador">
            <button
              className="paginador-btn"
              onClick={() => setPagina(p => Math.max(p - 1, 1))}
              disabled={pagina === 1}
            >
              ‹
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`}
                onClick={() => setPagina(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="paginador-btn"
              onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))}
              disabled={pagina === totalPaginas}
            >
              ›
            </button>
            <span className="paginador-info">
              Página {pagina} de {totalPaginas} · {filtradosAll.length} registros
            </span>
          </div>
        )}
      </div>

      {modal && (
        <ModalSteps
          titulo={editar ? "Editar categoría" : "Nueva categoría"}
          pasos={["Icono", "Datos"]}
          onClose={() => { setModal(false); setIconPicker(false); }}
          onGuardar={guardar}
          validaciones={[() => true, validarPasoDatos]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          {PasoIcono}
          {PasoDatos}
        </ModalSteps>
      )}
    </div>
  );
}
