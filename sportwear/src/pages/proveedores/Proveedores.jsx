// src/pages/proveedores/Proveedores.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import StatusToggle from "../../components/StatusToggle";
import ConfirmModal from "../../components/ConfirmModal";
import Loader from "../../components/Loader";
import ExportButtons from "../../components/ExportButtons";
import { soloDigitos, maxLongitudDocumento, validarNumeroDocumento } from "../../utils/numerico";
import './Proveedores.css';
import { IconEdit, IconEye, IconSearch, IconX } from "../../components/Icons";

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
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);

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

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Validadores por campo: misma condición y mismo texto que validar(), para
  // poder reutilizarlos en onBlur/onChange y mostrar errores en tiempo real.
  const validarCampoNumeroDoc = (tipoDoc, numeroDoc) => {
    if (!numeroDoc.trim()) return "El número de documento es obligatorio";
    const errorLongitud = validarNumeroDocumento(tipoDoc, numeroDoc);
    return errorLongitud || "";
  };
  const validarCampoRazonSocial = (v) => (!v.trim() ? "La razón social es obligatoria" : "");
  const validarCampoNombreContacto = (v) => (!v.trim() ? "La persona de contacto es obligatoria" : "");
  const validarCampoCiudad = (v) => (!v.trim() ? "La ciudad es obligatoria" : "");
  const validarCampoTelefono = (v) => (!v.trim() ? "El teléfono es obligatorio" : "");
  const validarCampoDireccion = (v) => (!v.trim() ? "La dirección es obligatoria" : "");
  const validarCampoEmail = (v) => {
    if (!v.trim()) return "El correo es obligatorio";
    if (!EMAIL_REGEX.test(v)) return "El correo no tiene un formato válido";
    return "";
  };

  const validar = () => {
    const e = {};
    if (!form.tipo_doc) e.tipo_doc = "Selecciona un tipo de documento";
    if (!form.numero_doc.trim()) e.numero_doc = "El número de documento es obligatorio";
    else {
      const errorLongitud = validarNumeroDocumento(form.tipo_doc, form.numero_doc);
      if (errorLongitud) e.numero_doc = errorLongitud;
    }
    if (!form.razon_social.trim()) e.razon_social = "La razón social es obligatoria";
    if (!form.nombre_contacto.trim()) e.nombre_contacto = "La persona de contacto es obligatoria";
    if (!form.ciudad.trim()) e.ciudad = "La ciudad es obligatoria";
    if (!form.telefono_celular.trim()) e.telefono_celular = "El teléfono es obligatorio";
    if (!form.direccion.trim()) e.direccion = "La dirección es obligatoria";
    if (!form.email_contacto.trim()) e.email_contacto = "El correo es obligatorio";
    else if (!EMAIL_REGEX.test(form.email_contacto)) e.email_contacto = "El correo no tiene un formato válido";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const pedirConfirmacion = () => {
    if (!validar()) return;
    if (editar) { setConfirmarGuardar(true); return; }
    guardar();
  };

  const guardar = async () => {
    setConfirmarGuardar(false);
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
    return <Loader text="Cargando proveedores..." />;
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
          <ExportButtons
            datos={filtradosAll}
            columnas={[
              { header: "Empresa", value: (p) => p.nombre_comercial || p.razon_social },
              { header: "Documento", value: (p) => `${p.tipo_doc} ${p.numero_doc}` },
              { header: "Contacto", key: "nombre_contacto" },
              { header: "Teléfono", key: "telefono_celular" },
              { header: "Email", key: "email_contacto" },
              { header: "Ciudad", key: "ciudad" },
              { header: "Compras", key: "total_compras" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="proveedores"
            titulo="Proveedores"
          />
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
              <th className="tbl-th">Email</th>
              <th className="tbl-th">Ciudad</th>
              <th className="tbl-th">Compras</th>
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
                <td className="tbl-td proveedores-telefono-cell">{p.email_contacto || "—"}</td>
                <td className="tbl-td"><span className="tabla-ciudad">{p.ciudad || "—"}</span></td>
                <td className="tbl-td">{p.total_compras ?? 0}</td>
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
                <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
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
                    <select
                      className="proveedores-form-select"
                      value={form.tipo_doc}
                      disabled={!!editar}
                      title={editar ? "El documento no se puede modificar" : undefined}
                      onChange={(e) => {
                        const tipo = e.target.value;
                        setForm((prev) => ({ ...prev, tipo_doc: tipo }));
                        // El número de documento depende del tipo (longitud válida por tipo):
                        // si ya había un error visible, se revalida contra el nuevo tipo.
                        if (errores.numero_doc) {
                          setErrores((prev) => ({ ...prev, numero_doc: validarCampoNumeroDoc(tipo, form.numero_doc) }));
                        }
                      }}
                    >
                      <option value="NIT">NIT</option>
                      <option value="CC">Cédula de ciudadanía</option>
                      <option value="CE">Cédula de extranjería</option>
                    </select>
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Número de documento <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`proveedores-form-input${errores.numero_doc ? " input-error" : ""}`}
                      placeholder="Ej: 900123456"
                      maxLength={maxLongitudDocumento(form.tipo_doc)}
                      value={form.numero_doc}
                      disabled={!!editar}
                      title={editar ? "El documento no se puede modificar" : undefined}
                      onChange={(e) => {
                        const valor = soloDigitos(e.target.value);
                        setForm((prev) => ({ ...prev, numero_doc: valor }));
                        if (errores.numero_doc) {
                          setErrores((prev) => ({ ...prev, numero_doc: validarCampoNumeroDoc(form.tipo_doc, valor) }));
                        }
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, numero_doc: validarCampoNumeroDoc(form.tipo_doc, form.numero_doc) }))}
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
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm((prev) => ({ ...prev, ciudad: valor }));
                        if (errores.ciudad) setErrores((prev) => ({ ...prev, ciudad: validarCampoCiudad(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, ciudad: validarCampoCiudad(form.ciudad) }))}
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
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm((prev) => ({ ...prev, razon_social: valor }));
                        if (errores.razon_social) setErrores((prev) => ({ ...prev, razon_social: validarCampoRazonSocial(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, razon_social: validarCampoRazonSocial(form.razon_social) }))}
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
                    <label className="proveedores-form-label">Dirección <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      className={`proveedores-form-input${errores.direccion ? " input-error" : ""}`}
                      value={form.direccion}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm((prev) => ({ ...prev, direccion: valor }));
                        if (errores.direccion) setErrores((prev) => ({ ...prev, direccion: validarCampoDireccion(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, direccion: validarCampoDireccion(form.direccion) }))}
                    />
                    {errores.direccion && <span className="proveedores-field-error">{errores.direccion}</span>}
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
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm((prev) => ({ ...prev, nombre_contacto: valor }));
                        if (errores.nombre_contacto) setErrores((prev) => ({ ...prev, nombre_contacto: validarCampoNombreContacto(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, nombre_contacto: validarCampoNombreContacto(form.nombre_contacto) }))}
                    />
                    {errores.nombre_contacto && <span className="proveedores-field-error">{errores.nombre_contacto}</span>}
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Cargo</label>
                    <input type="text" className="proveedores-form-input" value={form.cargo_contacto} onChange={(e) => set("cargo_contacto", e.target.value)} />
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Teléfono celular <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`proveedores-form-input${errores.telefono_celular ? " input-error" : ""}`}
                      placeholder="Ej: 3001234567"
                      value={form.telefono_celular}
                      onChange={(e) => {
                        const valor = soloDigitos(e.target.value);
                        setForm((prev) => ({ ...prev, telefono_celular: valor }));
                        if (errores.telefono_celular) setErrores((prev) => ({ ...prev, telefono_celular: validarCampoTelefono(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, telefono_celular: validarCampoTelefono(form.telefono_celular) }))}
                    />
                    {errores.telefono_celular && <span className="proveedores-field-error">{errores.telefono_celular}</span>}
                  </div>
                </div>

                <div className="proveedores-form-row">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Correo de contacto <span className="proveedores-req">*</span></label>
                    <input
                      type="email"
                      className={`proveedores-form-input${errores.email_contacto ? " input-error" : ""}`}
                      placeholder="contacto@empresa.com"
                      value={form.email_contacto}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm((prev) => ({ ...prev, email_contacto: valor }));
                        if (errores.email_contacto) setErrores((prev) => ({ ...prev, email_contacto: validarCampoEmail(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, email_contacto: validarCampoEmail(form.email_contacto) }))}
                    />
                    {errores.email_contacto && <span className="proveedores-field-error">{errores.email_contacto}</span>}
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
                    <input type="text" inputMode="numeric" className="proveedores-form-input" value={form.numero_cuenta} onChange={(e) => set("numero_cuenta", soloDigitos(e.target.value))} />
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
              <button className="proveedores-btn-primary" onClick={pedirConfirmacion} disabled={guardando}>
                {guardando ? "Guardando..." : editar ? "Actualizar" : "Registrar proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmarGuardar && (
        <ConfirmModal
          title="¿Guardar los cambios del proveedor?"
          message="Se actualizará la información de este proveedor."
          onCancel={() => setConfirmarGuardar(false)}
          onConfirm={guardar}
          confirmLabel="Sí, guardar"
        />
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
                  <div><span className="proveedores-detalle-info-label">Compras realizadas</span><span className="proveedores-detalle-info-valor">{verDetalle.total_compras ?? 0}</span></div>
                  <div><span className="proveedores-detalle-info-label">Última actualización</span><span className="proveedores-detalle-info-valor">{verDetalle.fecha_actualizacion ? new Date(verDetalle.fecha_actualizacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span></div>
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