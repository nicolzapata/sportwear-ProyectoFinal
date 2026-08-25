// src/pages/proveedores/Proveedores.jsx
import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import StatusToggle from "../../../shared/components/StatusToggle";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import { soloDigitos, maxLongitudDocumento, validarNumeroDocumento, validarTelefono, validarNombre, validarEmail, LONGITUD_TELEFONO, MAX_LONGITUD_NOMBRE } from "../../../shared/utils/numerico";
import './Proveedores.css';
import { DetalleItem, DetalleGrid } from "../../../shared/components/ModalDetalle";
import { IconEdit, IconEye, IconSearch, IconX } from "../../../shared/components/Icons";

const FILAS_POR_PAGINA = 10;

const FORM_VACIO = {
  tipo_persona: "Juridica",
  tipo_doc: "NIT",
  numero_doc: "",
  razon_social: "",
  nombre_comercial: "",
  nombres_contacto: "",
  apellidos_contacto: "",
  cargo_contacto: "",
  telefono_celular: "",
  email_contacto: "",
  ciudad: "",
  departamento: "",
  pais: "Colombia",
  direccion: "",
  estado: "Activo",
};

const TIPOS_DOC_POR_PERSONA = { Juridica: ["NIT"], Natural: ["CC", "CE"] };

// "nombre_contacto" completo (BD) -> se separa en nombres y apellidos. Con 4
// o más palabras se asumen 2 apellidos (convención CO), así el segundo
// nombre no termina metido en el campo de apellidos.
const dividirNombreContacto = (nombreCompleto) => {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 4) {
    return { nombres_contacto: partes.slice(0, -2).join(" "), apellidos_contacto: partes.slice(-2).join(" ") };
  }
  return { nombres_contacto: partes[0] || "", apellidos_contacto: partes.slice(1).join(" ") };
};

export default function Proveedores() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [modal, setModal] = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [pagina, setPagina] = useState(1);
  const [totalProveedores, setTotalProveedores] = useState(0);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);

  const cargarProveedores = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get("/proveedores", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setDatos(data.data || []);
      setTotalProveedores(data.total);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar los proveedores.");
    } finally {
      setCargando(false);
    }
  };

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarProveedores(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const totalPaginas = Math.ceil(totalProveedores / FILAS_POR_PAGINA) || 1;

  const abrirRegistrar = () => {
    setEditar(null);
    setForm(FORM_VACIO);
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_proveedor);
    setForm({
      tipo_persona: p.tipo_doc === "NIT" ? "Juridica" : "Natural",
      tipo_doc: p.tipo_doc || "NIT",
      numero_doc: p.numero_doc || "",
      razon_social: p.razon_social || "",
      nombre_comercial: p.nombre_comercial || "",
      ...dividirNombreContacto(p.nombre_contacto),
      cargo_contacto: p.cargo_contacto || "",
      telefono_celular: p.telefono_celular || "",
      email_contacto: p.email_contacto || "",
      ciudad: p.ciudad || "",
      departamento: p.departamento || "",
      pais: p.pais || "Colombia",
      direccion: p.direccion || "",
      estado: p.estado || "Activo",
    });
    setErrores({});
    setModal(true);
  };

  const set = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: "" }));
  };

  // Validadores por campo: misma condición y mismo texto que validar(), para
  // poder reutilizarlos en onBlur/onChange y mostrar errores en tiempo real.
  const validarCampoNumeroDoc = (tipoDoc, numeroDoc) => {
    if (!numeroDoc.trim()) return "El número de documento es obligatorio";
    const errorLongitud = validarNumeroDocumento(tipoDoc, numeroDoc);
    return errorLongitud || "";
  };
  const validarCampoRazonSocial = (v) => (!v.trim() ? "La razón social es obligatoria" : "");
  const validarCampoNombresContacto = (v) => validarNombre(v, "El nombre de la persona de contacto es obligatorio");
  const validarCampoApellidosContacto = (v) => validarNombre(v, "El apellido de la persona de contacto es obligatorio");
  const validarCampoCiudad = (v) => (!v.trim() ? "La ciudad es obligatoria" : "");
  const validarCampoDireccion = (v) => (!v.trim() ? "La dirección es obligatoria" : "");
  const validarCampoEmail = (v) => validarEmail(v, "El correo es obligatorio");

  const validar = () => {
    const e = {};
    if (!form.tipo_doc) e.tipo_doc = "Selecciona un tipo de documento";
    if (!form.numero_doc.trim()) e.numero_doc = "El número de documento es obligatorio";
    else {
      const errorLongitud = validarNumeroDocumento(form.tipo_doc, form.numero_doc);
      if (errorLongitud) e.numero_doc = errorLongitud;
    }
    if (form.tipo_persona === "Juridica" && !form.razon_social.trim()) e.razon_social = "La razón social es obligatoria";
    const errorNombresContacto = validarCampoNombresContacto(form.nombres_contacto);
    if (errorNombresContacto) e.nombres_contacto = errorNombresContacto;
    const errorApellidosContacto = validarCampoApellidosContacto(form.apellidos_contacto);
    if (errorApellidosContacto) e.apellidos_contacto = errorApellidosContacto;
    if (!form.ciudad.trim()) e.ciudad = "La ciudad es obligatoria";
    const errorTelefono = validarTelefono(form.telefono_celular);
    if (errorTelefono) e.telefono_celular = errorTelefono;
    if (!form.direccion.trim()) e.direccion = "La dirección es obligatoria";
    const errorEmailContacto = validarCampoEmail(form.email_contacto);
    if (errorEmailContacto) e.email_contacto = errorEmailContacto;
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
      const { nombres_contacto, apellidos_contacto, tipo_persona, ...resto } = form;
      const nombreCompletoContacto = `${nombres_contacto} ${apellidos_contacto}`.trim();
      const payload = {
        ...resto,
        nombre_contacto: nombreCompletoContacto,
        // Persona Natural: el proveedor es la propia persona, no hay razón social separada.
        razon_social: tipo_persona === "Natural" ? nombreCompletoContacto : resto.razon_social,
      };
      if (editar) await api.put(`/proveedores/${editar}`, payload);
      else        await api.post("/proveedores", payload);
      cargarProveedores();
      setModal(false);
      showToast("exito", editar ? "Proveedor actualizado correctamente." : "Proveedor registrado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al guardar el proveedor");
    } finally {
      setGuardando(false);
    }
  };

  // El aviso de éxito/error ya lo muestra <StatusToggle> centralmente a partir de
  // lo que esta función resuelva o rechace — por eso NO se atrapa el error acá
  // (antes se atrapaba y no se re-lanzaba, así que StatusToggle nunca se enteraba
  // del fallo y mostraba igual un toast de éxito encima del de error).
  const toggleEstado = async (id) => {
    const res = await api.patch(`/proveedores/${id}/estado`);
    setDatos((prev) => prev.map((p) => (p.id_proveedor === id ? { ...p, estado: res.data.estado } : p)));
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
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="proveedores-search-clear" onClick={() => setBusqueda("")}>
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
            obtenerDatos={async () => {
              const { data } = await api.get("/proveedores", { params: { q: busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Documento", value: (p) => `${p.tipo_doc} ${p.numero_doc}` },
              { header: "Empresa", value: (p) => p.nombre_comercial || p.razon_social },
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
        {totalProveedores} proveedor{totalProveedores !== 1 ? 'es' : ''} encontrado{totalProveedores !== 1 ? 's' : ''}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Documento</th>
              <th className="tbl-th">Empresa</th>
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
            {datos.map((p) => (
              <tr key={p.id_proveedor} className="tbl-row">
                <td className="tbl-td"><code className="proveedores-nit-code">{p.tipo_doc} {p.numero_doc}</code></td>
                <td className="tbl-td">
                  <span className="proveedores-empresa-name">{p.razon_social}</span>
                  {p.nombre_comercial && <div className="proveedores-empresa-sub">{p.nombre_comercial}</div>}
                </td>
                <td className="tbl-td proveedores-contacto-cell">{p.nombre_contacto || "—"}</td>
                <td className="tbl-td proveedores-telefono-cell">{p.telefono_celular || "—"}</td>
                <td className="tbl-td proveedores-telefono-cell">{p.email_contacto || "—"}</td>
                <td className="tbl-td"><span className="tabla-ciudad">{p.ciudad || "—"}</span></td>
                <td className="tbl-td">{p.total_compras ?? 0}</td>
                {tienePerm('Proveedores.estado') && (
                  <td className="tbl-td"><StatusToggle id={p.id_proveedor} estado={p.estado} onToggle={() => toggleEstado(p.id_proveedor)} nombreRegistro={p.nombre_comercial || p.razon_social} /></td>
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
            {datos.length === 0 && (
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
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {totalProveedores} registros</span>
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

                <div className="proveedores-form-group">
                  <label className="proveedores-form-label">Tipo de proveedor <span className="proveedores-req">*</span>{editar && <span className="proveedores-opcional"> (no editable)</span>}</label>
                  <select
                    className="proveedores-form-select"
                    value={form.tipo_persona}
                    disabled={!!editar}
                    title={editar ? "El tipo de proveedor no se puede modificar" : undefined}
                    onChange={(e) => {
                      const tipo_persona = e.target.value;
                      const tipo_doc = TIPOS_DOC_POR_PERSONA[tipo_persona][0];
                      setForm((prev) => ({ ...prev, tipo_persona, tipo_doc }));
                      setErrores((prev) => ({ ...prev, numero_doc: "", razon_social: "" }));
                    }}
                  >
                    <option value="Juridica">Persona Jurídica</option>
                    <option value="Natural">Persona Natural</option>
                  </select>
                </div>

                <div className="proveedores-form-row-3">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Tipo de documento <span className="proveedores-req">*</span>{editar && <span className="proveedores-opcional"> (no editable)</span>}</label>
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
                      {TIPOS_DOC_POR_PERSONA[form.tipo_persona].map((t) => (
                        <option key={t} value={t}>{t === "NIT" ? "NIT" : t === "CC" ? "Cédula de ciudadanía" : "Cédula de extranjería"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Número de documento <span className="proveedores-req">*</span>{editar && <span className="proveedores-opcional"> (no editable)</span>}</label>
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

                {form.tipo_persona === "Juridica" && (
                  <div className="proveedores-form-row">
                    <div className="proveedores-form-group">
                      <label className="proveedores-form-label">Razón social <span className="proveedores-req">*</span></label>
                      <input
                        type="text"
                        maxLength={120}
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
                        maxLength={MAX_LONGITUD_NOMBRE}
                        className="proveedores-form-input"
                        placeholder="Nombre con el que se conoce comercialmente"
                        value={form.nombre_comercial}
                        onChange={(e) => set("nombre_comercial", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="proveedores-form-row">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Departamento</label>
                    <input type="text" maxLength={MAX_LONGITUD_NOMBRE} className="proveedores-form-input" placeholder="Ej: Antioquia" value={form.departamento} onChange={(e) => set("departamento", e.target.value)} />
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
                <h3 className="proveedores-factura-titulo">{form.tipo_persona === "Natural" ? "Datos del proveedor" : "Contacto"}</h3>

                <div className="proveedores-form-row-3">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">{form.tipo_persona === "Natural" ? "Nombres" : "Nombres de contacto"} <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      className={`proveedores-form-input${errores.nombres_contacto ? " input-error" : ""}`}
                      placeholder="Ej: Juan"
                      value={form.nombres_contacto}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm((prev) => ({ ...prev, nombres_contacto: valor }));
                        if (errores.nombres_contacto) setErrores((prev) => ({ ...prev, nombres_contacto: validarCampoNombresContacto(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, nombres_contacto: validarCampoNombresContacto(form.nombres_contacto) }))}
                    />
                    {errores.nombres_contacto && <span className="proveedores-field-error">{errores.nombres_contacto}</span>}
                  </div>
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">{form.tipo_persona === "Natural" ? "Apellidos" : "Apellidos de contacto"} <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      className={`proveedores-form-input${errores.apellidos_contacto ? " input-error" : ""}`}
                      placeholder="Ej: Pérez"
                      value={form.apellidos_contacto}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setForm((prev) => ({ ...prev, apellidos_contacto: valor }));
                        if (errores.apellidos_contacto) setErrores((prev) => ({ ...prev, apellidos_contacto: validarCampoApellidosContacto(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, apellidos_contacto: validarCampoApellidosContacto(form.apellidos_contacto) }))}
                    />
                    {errores.apellidos_contacto && <span className="proveedores-field-error">{errores.apellidos_contacto}</span>}
                  </div>
                  {form.tipo_persona === "Juridica" && (
                    <div className="proveedores-form-group">
                      <label className="proveedores-form-label">Cargo</label>
                      <input type="text" maxLength={MAX_LONGITUD_NOMBRE} className="proveedores-form-input" value={form.cargo_contacto} onChange={(e) => set("cargo_contacto", e.target.value)} />
                    </div>
                  )}
                </div>

                <div className="proveedores-form-row">
                  <div className="proveedores-form-group">
                    <label className="proveedores-form-label">Teléfono celular <span className="proveedores-req">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={`proveedores-form-input${errores.telefono_celular ? " input-error" : ""}`}
                      placeholder="Ej: 3001234567"
                      maxLength={LONGITUD_TELEFONO}
                      value={form.telefono_celular}
                      onChange={(e) => {
                        const valor = soloDigitos(e.target.value);
                        setForm((prev) => ({ ...prev, telefono_celular: valor }));
                        if (errores.telefono_celular) setErrores((prev) => ({ ...prev, telefono_celular: validarTelefono(valor) }));
                      }}
                      onBlur={() => setErrores((prev) => ({ ...prev, telefono_celular: validarTelefono(form.telefono_celular) }))}
                    />
                    {errores.telefono_celular && <span className="proveedores-field-error">{errores.telefono_celular}</span>}
                  </div>
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
                <DetalleGrid>
                  <DetalleItem label="Documento" value={`${verDetalle.tipo_doc} ${verDetalle.numero_doc}`} />
                  <DetalleItem label="ID" value={`#${String(verDetalle.id_proveedor).padStart(3, "0")}`} />
                  <DetalleItem label="Ciudad" value={verDetalle.ciudad} />
                  <DetalleItem label="Estado" value={<span className={`tabla-status${verDetalle.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalle.estado}</span>} />
                  <DetalleItem label="Compras realizadas" value={verDetalle.total_compras ?? 0} />
                  <DetalleItem label="Última actualización" value={verDetalle.fecha_actualizacion ? new Date(verDetalle.fecha_actualizacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  <DetalleItem label="Razón social" value={verDetalle.razon_social} />
                  <DetalleItem label="Nombre comercial" value={verDetalle.nombre_comercial} />
                </DetalleGrid>
              </div>

              <div className="proveedores-factura-seccion">
                <h3 className="proveedores-factura-titulo">Contacto</h3>
                <DetalleGrid>
                  <DetalleItem label="Persona de contacto" value={verDetalle.nombre_contacto} />
                  <DetalleItem label="Celular" value={verDetalle.telefono_celular} />
                  <DetalleItem label="Correo" value={verDetalle.email_contacto} />
                </DetalleGrid>
              </div>

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