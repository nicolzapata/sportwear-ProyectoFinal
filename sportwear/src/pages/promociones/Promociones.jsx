// src/pages/promociones/Promociones.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import './Promociones.css';
import { IconBan, IconCheck, IconClock, IconDollar, IconEdit, IconHeart, IconSearch, IconX } from "../../components/Icons";

const fmt = (n) => Number(n||0).toLocaleString("es-CO", {
  style: "currency", 
  currency: "COP", 
  minimumFractionDigits: 0
});

export default function Promociones() {
  const [datos, setDatos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [editar, setEditar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ 
    nombre: "", 
    descripcion: "", 
    tipo_descuento: "Porcentaje", 
    descuento: "", 
    fecha_inicio: "", 
    fecha_fin: "", 
    estado: "Activo" 
  });

  const cargar = async () => {
    try { 
      const { data } = await api.get("/promociones"); 
      setDatos(data); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = datos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirRegistrar = () => { 
    setEditar(null); 
    setForm({ 
      nombre: "", 
      descripcion: "", 
      tipo_descuento: "Porcentaje", 
      descuento: "", 
      fecha_inicio: "", 
      fecha_fin: "", 
      estado: "Activo" 
    }); 
    setModal(true); 
  };

  const abrirEditar = (p) => { 
    setEditar(p.id_promocion); 
    setForm({ 
      nombre: p.nombre, 
      descripcion: p.descripcion, 
      tipo_descuento: p.tipo_descuento, 
      descuento: p.descuento, 
      fecha_inicio: p.fecha_inicio?.toString().split("T")[0], 
      fecha_fin: p.fecha_fin?.toString().split("T")[0], 
      estado: p.estado 
    }); 
    setModal(true); 
  };

  const guardar = async () => {
    if (!form.nombre) return;
    try {
      if (editar) await api.put(`/promociones/${editar}`, form);
      else await api.post("/promociones", form);
      setModal(false); 
      cargar();
    } catch (err) { 
      console.error(err); 
    }
  };

  const cambiarEstado = async (id) => { 
    try { 
      await api.patch(`/promociones/${id}/estado`); 
      cargar(); 
    } catch (err) { 
      console.error(err); 
    } 
  };

  const fecha = new Date().toLocaleDateString("es-CO", {
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric"
  });

  if (loading) {
    return (
      <div className="promociones-loading-container">
        <div className="promociones-loading-spinner"></div>
        <p className="promociones-loading-text">Cargando promociones...</p>
      </div>
    );
  }

  return (
    <div className="promociones-container">
      
      {/* Grid de promociones activas */}
      <div className="promociones-grid">
        {datos.filter(p => p.estado === "Activo").map((p) => (
          <div key={p.id_promocion} className="promociones-grid-card">
            <div className="promociones-grid-header">
              <h3 className="promociones-grid-title">{p.nombre}</h3>
              <div className="promociones-grid-badge">
                {p.tipo_descuento === "Porcentaje" ? `${p.descuento}%` : fmt(p.descuento)}
              </div>
            </div>
            <p className="promociones-grid-description">{p.descripcion}</p>
            <div className="promociones-grid-dates">
              <span>{p.fecha_inicio?.toString().split("T")[0]}</span>
              <span>→</span>
              <span>{p.fecha_fin?.toString().split("T")[0]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="promociones-actions-bar">
        <div className="promociones-search-wrapper">
          <span className="promociones-search-icon"><IconSearch /></span>
          <input
            type="text"
            className="promociones-search-input"
            placeholder="Buscar promoción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="promociones-search-clear" onClick={() => setBusqueda("")}><IconX /></button>
          )}
        </div>
        <button className="promociones-btn-primary" onClick={abrirRegistrar}>
          <span>+</span> Nueva promoción
        </button>
      </div>

      {/* Contador */}
      <div className="promociones-results-count">
        {filtrados.length} promoción{filtrados.length !== 1 ? 'es' : ''} encontrada{filtrados.length !== 1 ? 's' : ''}
      </div>

      {/* Tabla */}
      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Nombre</th>
              <th className="tbl-th">Descuento</th>
              <th className="tbl-th">Tipo</th>
              <th className="tbl-th">Vigencia</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtrados.map((p) => (
              <tr key={p.id_promocion} className="tbl-row">
                <td className="tbl-td">
                  <div className="promociones-nombre-cell">
                    <div className="promociones-nombre-avatar"><IconHeart /></div>
                    <div>
                      <div className="promociones-nombre-text">{p.nombre}</div>
                      <div className="promociones-descripcion-text">{p.descripcion}</div>
                    </div>
                  </div>
                </td>
                <td className="tbl-td">
                  <span className="promociones-descuento-valor">
                    {p.tipo_descuento === "Porcentaje" ? `${p.descuento}%` : fmt(p.descuento)}
                  </span>
                </td>
                <td className="tbl-td">
                  <span className="promociones-tipo-badge">{p.tipo_descuento}</span>
                </td>
                <td className="tbl-td">
                  <div className="promociones-fechas-cell">
                    <span>{p.fecha_inicio?.toString().split("T")[0]}</span>
                    <span className="promociones-fecha-sep">→</span>
                    <span>{p.fecha_fin?.toString().split("T")[0]}</span>
                  </div>
                </td>
                <td className="tbl-td">
                  <span className={`promociones-status-badge ${p.estado === "Activo" ? 'active' : 'inactive'}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="tbl-td">
                  <div className="promociones-action-cell">
                    <button
                      className="promociones-action-btn promociones-edit-btn"
                      onClick={() => abrirEditar(p)}
                      title="Editar"
                    >
                      <IconEdit />
                    </button>
                    <button
                      className={`promociones-action-btn ${p.estado === "Activo" ? "promociones-deactivate-btn" : "promociones-activate-btn"}`}
                      onClick={() => cambiarEstado(p.id_promocion)}
                      title={p.estado === "Activo" ? "Desactivar" : "Activar"}
                    >
                      {p.estado === "Activo" ? <IconBan /> : <IconCheck />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal registro/edición */}
      {modal && (
        <div className="promociones-modal-overlay" onClick={() => setModal(false)}>
          <div className="promociones-modal" onClick={(e) => e.stopPropagation()}>
            <div className="promociones-modal-header">
              <h2 className="promociones-modal-title">
                {editar ? 'Editar promoción' : 'Nueva promoción'}
              </h2>
              <button className="promociones-modal-close" onClick={() => setModal(false)}><IconX /></button>
            </div>

            <div className="promociones-modal-body">
              <div className="promociones-form-group">
                <label className="promociones-form-label">Nombre de la promoción</label>
                <input
                  type="text"
                  className="promociones-form-input"
                  placeholder="Ej: Descuento de verano"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="promociones-form-group">
                <label className="promociones-form-label">Descripción</label>
                <input
                  type="text"
                  className="promociones-form-input"
                  placeholder="Ej: 20% de descuento en toda la colección"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>

              <div className="promociones-form-row">
                <div className="promociones-form-group">
                  <label className="promociones-form-label">Tipo de descuento</label>
                  <select
                    className="promociones-form-select"
                    value={form.tipo_descuento}
                    onChange={(e) => setForm({ ...form, tipo_descuento: e.target.value })}
                  >
                    <option value="Porcentaje">Porcentaje</option>
                    <option value="Valor fijo">Valor fijo</option>
                  </select>
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">Descuento</label>
                  <input
                    type="number"
                    className="promociones-form-input"
                    placeholder={form.tipo_descuento === "Porcentaje" ? "Ej: 20" : "Ej: 50000"}
                    value={form.descuento}
                    onChange={(e) => setForm({ ...form, descuento: e.target.value })}
                  />
                </div>
              </div>

              <div className="promociones-form-row">
                <div className="promociones-form-group">
                  <label className="promociones-form-label">Fecha inicio</label>
                  <input
                    type="date"
                    className="promociones-form-input"
                    value={form.fecha_inicio}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  />
                </div>

                <div className="promociones-form-group">
                  <label className="promociones-form-label">Fecha fin</label>
                  <input
                    type="date"
                    className="promociones-form-input"
                    value={form.fecha_fin}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  />
                </div>
              </div>

              <div className="promociones-form-group">
                <label className="promociones-form-label">Estado</label>
                <select
                  className="promociones-form-select"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="promociones-modal-footer">
              <button className="promociones-btn-secondary" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button className="promociones-btn-primary" onClick={guardar}>
                {editar ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}