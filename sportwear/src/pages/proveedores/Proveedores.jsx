// src/pages/proveedores/Proveedores.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import StatusToggle from "../../components/StatusToggle";
import './Proveedores.css';
import { IconEdit, IconEye, IconPrint, IconSearch, IconX } from "../../components/Icons";

const FILAS_POR_PAGINA = 10;

const FORM_VACIO = {
  tipo_doc: "NIT",
  numero_doc: "",
  razon_social: "",
  nombre_comercial: "",
  nombre_contacto: "",
  cargo_contacto: "",
  telefono_celular: "",
  email_contacto: "",
  ciudad: "",
  departamento: "",
  pais: "Colombia",
  direccion: "",
  banco: "",
  tipo_cuenta: "",
  numero_cuenta: "",
  titular_cuenta: "",
  plazo_pago_dias: 30,
  condiciones: "",
  estado: "Activo",
};

export default function Proveedores() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    setCargando(true);
    setError("");
    try {
      const res = await api.get("/proveedores");
      setDatos(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar los proveedores.");
    } finally {
      setCargando(false);
    }
  };

  const filtradosAll = datos.filter(
    (p) =>
      p.razon_social?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.nombre_comercial?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.numero_doc?.includes(busqueda)
  );
  const filtrados = filtradosAll.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);
  const totalPaginas = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA) || 1;

  const abrirRegistrar = () => {
    setEditar(null);
    setForm(FORM_VACIO);
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_proveedor);
    setForm({
      tipo_doc: p.tipo_doc || "NIT",
      numero_doc: p.numero_doc || "",
      razon_social: p.razon_social || "",
      nombre_comercial: p.nombre_comercial || "",
      nombre_contacto: p.nombre_contacto || "",
      cargo_contacto: p.cargo_contacto || "",
      telefono_celular: p.telefono_celular || "",
      email_contacto: p.email_contacto || "",
      ciudad: p.ciudad || "",
      departamento: p.departamento || "",
      pais: p.pais || "Colombia",
      direccion: p.direccion || "",
      banco: p.banco || "",
      tipo_cuenta: p.tipo_cuenta || "",
      numero_cuenta: p.numero_cuenta || "",
      titular_cuenta: p.titular_cuenta || "",
      plazo_pago_dias: p.plazo_pago_dias ?? 30,
      condiciones: p.condiciones || "",
      estado: p.estado || "Activo",
    });
    setErrores({});
    setModal(true);
  };

  const set = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: "" }));
  };

  const validar = () => {
    const e = {};
    if (!form.tipo_doc) e.tipo_doc = "Selecciona un tipo de documento";
    if (!form.numero_doc.trim()) e.numero_doc = "El número de documento es obligatorio";
    if (!form.razon_social.trim()) e.razon_social = "La razón social es obligatoria";
    if (!form.nombre_contacto.trim()) e.nombre_contacto = "La persona de contacto es obligatoria";
    if (!form.ciudad.trim()) e.ciudad = "La ciudad es obligatoria";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = { ...form, plazo_pago_dias: Number(form.plazo_pago_dias) || 30 };
      if (editar) {
        const res = await api.put(`/proveedores/${editar}`, payload);
        setDatos((prev) => prev.map((p) => (p.id_proveedor === editar ? res.data : p)));
      } else {
        const res = await api.post("/proveedores", payload);
        setDatos((prev) => [res.data, ...prev]);
      }
      setModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Error al guardar el proveedor");
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (id) => {
    try {
      const res = await api.patch(`/proveedores/${id}/estado`);
      setDatos((prev) => prev.map((p) => (p.id_proveedor === id ? { ...p, estado: res.data.estado } : p)));
    } catch (err) {
      alert(err.response?.data?.message || "Error al cambiar el estado del proveedor");
    }
  };




  if (cargando) {
    return (
      <div className="proveedores-loading-container">
        <div className="proveedores-loading-spinner" />
        <span className="proveedores-loading-text">Cargando proveedores...</span>
      </div>
    );
  }

  return (
    <div className="proveedores-container">
      {error && <div className="compras-error-banner">{error}</div>}

      <div className="proveedores-actions-bar">
        <div className="proveedores-actions-left">
          <div className="proveedores-search-wrapper">
            <span className="proveedores-search-icon"><IconSearch /></span>
            <input
              type="text"
              className="proveedores-search-input"
              placeholder="Buscar proveedor o documento..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            />
            {busqueda && (
              <button className="proveedores-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}>
                <IconX />
              </button>
            )}
          </div>
        </div>
        <div className="proveedores-actions-right">
          {tienePerm('Proveedores.crear') && (
            <button className="proveedores-btn-primary" onClick={abrirRegistrar}>
              <span>+</span> Nuevo proveedor
            </button>
          )}
          <button className="btn-print" onClick={() => window.print()} title="Imprimir tabla"><IconPrint /></button>
        </div>
      </div>

      <div className="proveedores-results-count">
        {filtradosAll.length} proveedor{filtradosAll.length !== 1 ? 'es' : ''} encontrado{filtradosAll.length !== 1 ? 's' : ''}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Empresa</th>
              <th className="tbl-th">Documento</th>
              <th className="tbl-th">Contacto</th>
              <th className="tbl-th">Teléfono</th>
              <th className="tbl-th">Ciudad</th>
              {tienePerm('Proveedores.estado') && <th className="tbl-th">Estado</th>}
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtrados.map((p) => (
              <tr key={p.id_proveedor} className="tbl-row">
                <td className="tbl-td">
                  <span className="proveedores-empresa-name">{p.razon_social}</span>
                  {p.nombre_comercial && <div className="proveedores-empresa-sub">{p.nombre_comercial}</div>}
                </td>
                <td className="tbl-td"><code className="proveedores-nit-code">{p.tipo_doc} {p.numero_doc}</code></td>
                <td className="tbl-td proveedores-contacto-cell">{p.nombre_contacto || "—"}</td>
                <td className="tbl-td proveedores-telefono-cell">{p.telefono_celular || "—"}</td>
                <td className="tbl-td"><span className="tabla-ciudad">{p.ciudad || "—"}</span></td>
                {tienePerm('Proveedores.estado') && (
                  <td className="tbl-td"><StatusToggle id={p.id_proveedor} estado={p.estado} onToggle={() => toggleEstado(p.id_proveedor)} /></td>
                )}
                <td className="tbl-td">
                  <div className="proveedores-action-cell">
                    <button className="proveedores-action-btn proveedores-view-btn" onClick={() => setVerDetalle(p)} title="Ver detalles"><IconEye /></button>
                    {tienePerm('Proveedores.editar') && (
                      <button className="proveedores-action-btn proveedores-edit-btn" onClick={() => abrirEditar(p)} title="Editar"><IconEdit /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtradosAll.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  No hay proveedores registrados todavía.
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
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtradosAll.length} registros</span>
          </div>
        )}
      </div>

      {/* ── Modal tipo factura, un solo panel con scroll reducido ── */}
      {modal && (
        <div className="proveedores-modal-overlay" onClick={() => !guardando && setModal(false)}>
          <div className="proveedores-modal proveedores-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="proveedores-modal-header">
              <h2 className="proveedores-modal-title">{editar ? "Editar proveedor" : "Nuevo proveedor"}</h2>
              <button className="proveedores-modal-close" onClick={() => setModal(false)}><IconX /></button>
            </div>

            <div className="proveedores-modal-body proveedores-factura-body">

              <div className="proveedores-factura-seccion">
                <h3 className="proveedores-factura-titulo">Datos de la empresa</h3>

                <div className="proveedores-form-row-3">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Tipo de documento <span className="proveedores-req">*</span></label>
                    <select className="proveedores-form-select" value={form.tipo_doc} onChange={(e) => set("tipo_doc", e.target.value)}>
                      <option value="NIT">NIT</option>
                      <option value="CC">Cédula de ciudadanía</option>
                      <option value="CE">Cédula de extranjería</option>
                    </select>
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Número de documento <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      className={`proveedores-form-input${errores.numero_doc ? " input-error" : ""}`}
                      placeholder="Ej: 900123456"
                      value={form.numero_doc}
                      onChange={(e) => set("numero_doc", e.target.value)}
                    />
                    {errores.numero_doc && <span className="proveedores-field-error">{errores.numero_doc}</span>}
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Ciudad <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      className={`proveedores-form-input${errores.ciudad ? " input-error" : ""}`}
                      placeholder="Ej: Medellín"
                      value={form.ciudad}
                      onChange={(e) => set("ciudad", e.target.value)}
                    />
                    {errores.ciudad && <span className="proveedores-field-error">{errores.ciudad}</span>}
                  </div>
                </div>

                <div className="proveedores-form-row">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Razón social <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      className={`proveedores-form-input${errores.razon_social ? " input-error" : ""}`}
                      placeholder="Ej: Distribuidora Textil S.A."
                      value={form.razon_social}
                      onChange={(e) => set("razon_social", e.target.value)}
                    />
                    {errores.razon_social && <span className="proveedores-field-error">{errores.razon_social}</span>}
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Nombre comercial (opcional)</label>
                    <input
                      type="text"
                      className="proveedores-form-input"
                      placeholder="Nombre con el que se conoce comercialmente"
                      value={form.nombre_comercial}
                      onChange={(e) => set("nombre_comercial", e.target.value)}
                    />
                  </div>
                </div>

                <div className="proveedores-form-row">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Departamento</label>
                    <input type="text" className="proveedores-form-input" placeholder="Ej: Antioquia" value={form.departamento} onChange={(e) => set("departamento", e.target.value)} />
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Dirección</label>
                    <input type="text" className="proveedores-form-input" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="proveedores-factura-seccion">
                <h3 className="proveedores-factura-titulo">Contacto</h3>

                <div className="proveedores-form-row-3">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Persona de contacto <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      className={`proveedores-form-input${errores.nombre_contacto ? " input-error" : ""}`}
                      placeholder="Ej: Juan Pérez"
                      value={form.nombre_contacto}
                      onChange={(e) => set("nombre_contacto", e.target.value)}
                    />
                    {errores.nombre_contacto && <span className="proveedores-field-error">{errores.nombre_contacto}</span>}
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Cargo</label>
                    <input type="text" className="proveedores-form-input" value={form.cargo_contacto} onChange={(e) => set("cargo_contacto", e.target.value)} />
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Teléfono celular</label>
                    <input type="text" className="proveedores-form-input" placeholder="Ej: 3001234567" value={form.telefono_celular} onChange={(e) => set("telefono_celular", e.target.value)} />
                  </div>
                </div>

                <div className="proveedores-form-row">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Correo de contacto</label>
                    <input type="email" className="proveedores-form-input" placeholder="contacto@empresa.com" value={form.email_contacto} onChange={(e) => set("email_contacto", e.target.value)} />
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Estado</label>
                    <select className="proveedores-form-select" value={form.estado} onChange={(e) => set("estado", e.target.value)}>
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="proveedores-factura-seccion">
                <h3 className="proveedores-factura-titulo">Datos bancarios <span className="proveedores-opcional">(opcional)</span></h3>

                <div className="proveedores-form-row-3">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Banco</label>
                    <input type="text" className="proveedores-form-input" value={form.banco} onChange={(e) => set("banco", e.target.value)} />
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Tipo de cuenta</label>
                    <select className="proveedores-form-select" value={form.tipo_cuenta} onChange={(e) => set("tipo_cuenta", e.target.value)}>
                      <option value="">Seleccionar...</option>
                      <option value="Ahorros">Ahorros</option>
                      <option value="Corriente">Corriente</option>
                    </select>
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Número de cuenta</label>
                    <input type="text" className="proveedores-form-input" value={form.numero_cuenta} onChange={(e) => set("numero_cuenta", e.target.value)} />
                  </div>
                </div>

                <div className="proveedores-form-row">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Titular de la cuenta</label>
                    <input type="text" className="proveedores-form-input" value={form.titular_cuenta} onChange={(e) => set("titular_cuenta", e.target.value)} />
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Plazo de pago (días)</label>
                    <input type="number" min="0" className="proveedores-form-input" value={form.plazo_pago_dias} onChange={(e) => set("plazo_pago_dias", e.target.value)} />
                  </div>
                </div>

                <div className="proveedores-form-group">
                  <label className="proveedores-form-label">Condiciones</label>
                  <textarea className="proveedores-form-input proveedores-form-textarea" rows={2} maxLength={300} value={form.condiciones} onChange={(e) => set("condiciones", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="proveedores-modal-footer">
              <button className="proveedores-btn-secondary" onClick={() => setModal(false)} disabled={guardando}>Cancelar</button>
              <button className="proveedores-btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando..." : editar ? "Actualizar" : "Registrar proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {verDetalle && (
        <div className="proveedores-modal-overlay" onClick={() => setVerDetalle(null)}>
          <div className="proveedores-modal proveedores-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="proveedores-modal-header">
              <div>
                <h2 className="proveedores-modal-title">{verDetalle.razon_social}</h2>
                <p className="proveedores-modal-subtitulo">Detalle del proveedor</p>
              </div>
              <button className="proveedores-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
            </div>

            <div className="proveedores-modal-body proveedores-factura-body">

              <div className="proveedores-factura-seccion">
                <h3 className="proveedores-factura-titulo">Datos de la empresa</h3>
                <div className="proveedores-detalle-info-grid">
                  <div><span className="proveedores-detalle-info-label">ID</span><span className="proveedores-detalle-info-valor">#{String(verDetalle.id_proveedor).padStart(3, "0")}</span></div>
                  <div><span className="proveedores-detalle-info-label">Documento</span><span className="proveedores-detalle-info-valor">{verDetalle.tipo_doc} {verDetalle.numero_doc}</span></div>
                  <div><span className="proveedores-detalle-info-label">Ciudad</span><span className="proveedores-detalle-info-valor">{verDetalle.ciudad || "—"}</span></div>
                  <div>
                    <span className="proveedores-detalle-info-label">Estado</span>
                    <span className={`tabla-status${verDetalle.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalle.estado}</span>
                  </div>
                </div>
                <div className="proveedores-detalle-info-grid" style={{ marginTop: "1rem" }}>
                  <div><span className="proveedores-detalle-info-label">Razón social</span><span className="proveedores-detalle-info-valor">{verDetalle.razon_social}</span></div>
                  <div><span className="proveedores-detalle-info-label">Nombre comercial</span><span className="proveedores-detalle-info-valor">{verDetalle.nombre_comercial || "—"}</span></div>
                </div>
              </div>

              <div className="proveedores-factura-seccion">
                <h3 className="proveedores-factura-titulo">Contacto</h3>
                <div className="proveedores-detalle-info-grid">
                  <div><span className="proveedores-detalle-info-label">Persona de contacto</span><span className="proveedores-detalle-info-valor">{verDetalle.nombre_contacto || "—"}</span></div>
                  <div><span className="proveedores-detalle-info-label">Celular</span><span className="proveedores-detalle-info-valor">{verDetalle.telefono_celular || "—"}</span></div>
                  <div><span className="proveedores-detalle-info-label">Correo</span><span className="proveedores-detalle-info-valor">{verDetalle.email_contacto || "—"}</span></div>
                </div>
              </div>

              {(verDetalle.banco || verDetalle.numero_cuenta) && (
                <div className="proveedores-factura-seccion">
                  <h3 className="proveedores-factura-titulo">Datos bancarios</h3>
                  <div className="proveedores-detalle-info-grid">
                    <div><span className="proveedores-detalle-info-label">Banco</span><span className="proveedores-detalle-info-valor">{verDetalle.banco || "—"}</span></div>
                    <div><span className="proveedores-detalle-info-label">Tipo de cuenta</span><span className="proveedores-detalle-info-valor">{verDetalle.tipo_cuenta || "—"}</span></div>
                    <div><span className="proveedores-detalle-info-label">N° de cuenta</span><span className="proveedores-detalle-info-valor">{verDetalle.numero_cuenta || "—"}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="proveedores-modal-footer">
              <button className="proveedores-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
              {tienePerm('Proveedores.editar') && (
                <button className="proveedores-btn-primary" onClick={() => { setVerDetalle(null); abrirEditar(verDetalle); }}>
                  <IconEdit /> Editar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}