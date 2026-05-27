// src/pages/colores/Colores.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import ModalSteps from "../../components/ModalSteps";
import './Colores.css';
import { IconBan, IconCheck, IconEdit, IconFileText, IconPalette, IconPrint, IconSearch, IconTrash, IconX } from "../../components/Icons";

const getBrightness = (hex) => {
  const r = parseInt(hex.substring(1,3),16), g = parseInt(hex.substring(3,5),16), b = parseInt(hex.substring(5,7),16);
  return (r*299 + g*587 + b*114) / 1000;
};

export default function Colores() {
  const [datos,    setDatos]    = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modal,    setModal]    = useState(false);
  const [editar,   setEditar]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("muestra");
  const [form, setForm] = useState({ nombre: "", codigo_hex: "#000000", estado: "Activo" });

  const cargar = async () => {
    try {
      const { data } = await api.get("/colores");
      const sinDuplicados = [...new Map(data.map(c => [c.codigo_hex.toLowerCase(), c])).values()];
      setDatos(sinDuplicados.sort((a,b) => getBrightness(b.codigo_hex) - getBrightness(a.codigo_hex)));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = datos.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const abrirRegistrar = () => { setEditar(null); setForm({ nombre: "", codigo_hex: "#000000", estado: "Activo" }); setModal(true); };
  const abrirEditar = (c) => { setEditar(c.id_color); setForm({ nombre: c.nombre, codigo_hex: c.codigo_hex, estado: c.estado }); setModal(true); };

  const guardar = async () => {
    if (!form.nombre) return;
    try {
      if (editar) await api.put(`/colores/${editar}`, form);
      else        await api.post("/colores", form);
      setModal(false); cargar();
    } catch (err) { console.error(err); }
  };

  const eliminarColor = async (id) => {
    if (!window.confirm("¿Eliminar este color? Se eliminarán las variantes asociadas.")) return;
    try { await api.delete(`/colores/${id}`); cargar(); } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="colores-loading-container">
      <div className="colores-loading-spinner"></div>
      <p className="colores-loading-text">Cargando colores...</p>
    </div>
  );

  // ── Pasos ──────────────────────────────────────────────────────────────────
  const PasoColor = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Color HEX <span className="ms-req">*</span></label>
        <div className="colores-color-picker-wrapper">
          <input type="color" className="colores-color-picker" value={form.codigo_hex} onChange={e => setForm({ ...form, codigo_hex: e.target.value })} />
          <span className="colores-color-value">{form.codigo_hex}</span>
        </div>
      </div>
      <div className="colores-preview" style={{ marginTop: 8 }}>
        <div className="colores-preview-label">Vista previa</div>
        <div className="colores-preview-sample" style={{ backgroundColor: form.codigo_hex }}>
          <span style={{ color: getBrightness(form.codigo_hex) > 128 ? '#000' : '#fff' }}>
            {form.nombre || 'Color'}
          </span>
        </div>
      </div>
    </div>
  );

  const PasoDatos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Nombre del color <span className="ms-req">*</span></label>
        <input type="text" className="ms-form-input" placeholder="Ej: Rojo Intenso" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
      </div>
    </div>
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
        <button className="colores-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo color</button>
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
                <th className="tbl-th">Estado</th>
                <th className="tbl-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {filtrados.map((c) => (
                <tr key={c.id_color} className="tbl-row">
                  <td className="tbl-td">
                    <div className="colores-name-cell">
                      <span
                        className="colores-name-dot"
                        style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: c.codigo_hex, border: "1px solid rgba(0,0,0,0.1)", marginRight: 8, flexShrink: 0 }}
                      />
                      <span className="colores-name-text">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="tbl-td"><code className="colores-hex-code">{c.codigo_hex}</code></td>
                  <td className="tbl-td">
                    <span className={`tabla-status${c.estado === "Activo" ? ' activo' : ' inactivo'}`}>{c.estado}</span>
                  </td>
                  <td className="tbl-td">
                    <div className="colores-action-cell">
                      <button className="colores-action-btn colores-edit-btn" onClick={() => abrirEditar(c)} title="Editar"><IconEdit /></button>
                      <button className="colores-action-btn colores-deactivate-btn" onClick={() => eliminarColor(c.id_color)} title="Eliminar"><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="print-button-container">
            <button className="btn-print" onClick={() => window.print()}>
              <IconPrint />
            </button>
          </div>
        </div>
      )}

      {modal && (
        <ModalSteps
          titulo={editar ? "Editar color" : "Nuevo color"}
          pasos={["Seleccionar color", "Nombre"]}
          onClose={() => setModal(false)}
          onGuardar={guardar}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          {PasoColor}
          {PasoDatos}
        </ModalSteps>
      )}
    </div>
  );
}