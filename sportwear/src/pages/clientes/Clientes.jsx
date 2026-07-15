// src/pages/clientes/Clientes.jsx
import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import StatusToggle from "../../components/StatusToggle";
import Toast from "../../components/Toast";
import ExportButtons from "../../components/ExportButtons";
import { soloDigitos, maxLongitudDocumento, validarNumeroDocumento, validarTelefono, validarNombre, validarEmail, LONGITUD_TELEFONO } from "../../utils/numerico";
import "./Clientes.css";
import { IconEdit, IconEye, IconSearch, IconX } from "../../components/Icons";

const FORM_VACIO = { nombres: "", apellidos: "", tipo_doc: "CC", documento: "", telefono: "", email: "", ciudad: "Medellín", id_barrio: "", direccion: "", contrasena: "", confirmar: "", permiso_cuotas: 1, estado: "Activo" };

// "nombre" completo (BD) -> primer palabra = nombres, resto = apellidos.
const dividirNombre = (nombreCompleto) => {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  return { nombres: partes[0] || "", apellidos: partes.slice(1).join(" ") };
};
const FILAS_POR_PAGINA = 10;

export default function Clientes() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,        setDatos]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [barrios,      setBarrios]      = useState([]);
  const [zonas,        setZonas]        = useState([]);
  const [barFiltrados, setBarFiltrados] = useState([]);
  const [busqueda,     setBusqueda]     = useState("");
  const [pagina,       setPagina]       = useState(1);
  const [modal,        setModal]        = useState(false);
  const [pasoModal,    setPasoModal]    = useState(0);
  const [verDetalle,   setVerDetalle]   = useState(null);
  const [editar,       setEditar]       = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [errores,      setErrores]      = useState({ nombres: "", apellidos: "", documento: "" });
  const [toast,        setToast]        = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Para descartar la respuesta de /check-email si el usuario ya cambió
  // el campo mientras la verificación estaba en vuelo.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // Verificación en tiempo real (onBlur): si el correo ya existe, avisa de una vez
  // en vez de esperar a que se envíe todo el formulario.
  const verificarEmailDuplicado = async (email) => {
    try {
      const { data } = await api.get("/auth/check-email", { params: { email } });
      if (data?.existe && formRef.current.email.trim() === email) {
        setErrores(prev => ({ ...prev, email: "Este correo ya está registrado." }));
      }
    } catch {
      // Si falla la verificación en tiempo real, el submit igual rechaza duplicados (409).
    }
  };

  useEffect(() => {
    Promise.all([
      api.get("/clientes/con-ventas"),
      api.get("/barrios"),
      api.get("/barrios/zonas")
    ]).then(([clientesRes, barriosRes, zonasRes]) => {
      setDatos(clientesRes.data);
      setBarrios(barriosRes.data);
      setBarFiltrados(barriosRes.data);
      setZonas(zonasRes.data);
    }).catch((err) => {
      setError(err.response?.data?.message || "Error al cargar clientes");
    }).finally(() => setLoading(false));
  }, []);

  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter(b => b.zona === zona) : barrios);
    setForm(f => ({ ...f, id_barrio: "" }));
  };

  const filtradosAll = datos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.documento?.includes(busqueda)
  );
  const totalPaginas = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA);
  const filtrados    = filtradosAll.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const abrirRegistrar = () => { setEditar(null); setForm(FORM_VACIO); setBarFiltrados(barrios); setPasoModal(0); setModal(true); };
  const abrirEditar    = (c) => {
    setEditar(c.id_cliente);
    setForm({ ...dividirNombre(c.nombre), tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", ciudad: c.ciudad || "Medellín", id_barrio: c.id_barrio || "", direccion: c.direccion || "", contrasena: "", confirmar: "", permiso_cuotas: c.permiso_cuotas || 1, estado: c.estado });
    setBarFiltrados(barrios);
    setPasoModal(0);
    setModal(true);
  };

  // Ante un 409 del backend (correo/documento duplicado), en vez de mostrar el
  // mensaje solo en un toast genérico, lo pega al campo real y salta al paso
  // "Datos personales" (0), donde viven ambos campos, para que sea visible.
  const atenderErrorCampo = (err) => {
    const mensaje = err.response?.data?.message;
    if (err.response?.status === 409 && mensaje) {
      const campo = /correo|email/i.test(mensaje) ? "email" : /documento/i.test(mensaje) ? "documento" : null;
      if (campo) {
        setErrores(prev => ({ ...prev, [campo]: mensaje }));
        setPasoModal(0);
        return true;
      }
    }
    return false;
  };

  const guardar = async () => {
    if (!form.nombres || !form.apellidos || !form.documento) return false;
    const { nombres, apellidos, ...resto } = form;
    const payload = { ...resto, nombre: `${nombres} ${apellidos}`.trim() };
    try {
      if (editar) {
        const { data } = await api.put(`/clientes/${editar}`, payload);
        setDatos(prev => prev.map(c => c.id_cliente === editar ? { ...c, ...data } : c));
      } else {
        const { data } = await api.post("/clientes", payload);
        setDatos(prev => [...prev, { ...data, barrio_nombre: "", comuna: "" }]);
      }
      setModal(false);
    } catch (err) {
      if (!atenderErrorCampo(err)) {
        showToast("error", err.response?.data?.message || "Error al guardar cliente");
      }
      return false;
    }
  };

  const errorNombres = (valor) => validarNombre(valor, "El nombre es obligatorio");
  const errorApellidos = (valor) => validarNombre(valor, "El apellido es obligatorio");
  const errorDocumento = (tipoDoc, valor) => {
    if (!valor.trim()) return "El documento es obligatorio";
    return validarNumeroDocumento(tipoDoc, valor);
  };
  const errorCiudad = (valor) => (!valor.trim() ? "La ciudad es obligatoria" : "");
  const errorEmail = (valor) => validarEmail(valor, "El correo es obligatorio");
  const errorContrasena = (valor) => {
    if (!valor) return "La contraseña es obligatoria";
    if (valor.length < 6) return "Debe tener al menos 6 caracteres";
    // eslint-disable-next-line no-useless-escape
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(valor)) return "Debe contener al menos un símbolo";
    return "";
  };
  const errorConfirmar = (valor, contrasena) => {
    if (!valor) return "Confirma la contraseña";
    if (valor !== contrasena) return "Las contraseñas no coinciden";
    return "";
  };

  const validarPasoDatos = () => {
    const e = {};
    const eNombres = errorNombres(form.nombres);
    if (eNombres) e.nombres = eNombres;
    const eApellidos = errorApellidos(form.apellidos);
    if (eApellidos) e.apellidos = eApellidos;
    const eDocumento = errorDocumento(form.tipo_doc, form.documento);
    if (eDocumento) e.documento = eDocumento;
    const eTelefono = validarTelefono(form.telefono);
    if (eTelefono) e.telefono = eTelefono;
    const eEmail = errorEmail(form.email);
    if (eEmail) e.email = eEmail;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPasoUbicacion = () => {
    const eCiudad = errorCiudad(form.ciudad);
    setErrores(prev => ({ ...prev, ciudad: eCiudad }));
    return !eCiudad;
  };

  const validarPasoClasificacion = () => {
    if (editar) return true;
    const eContrasena = errorContrasena(form.contrasena);
    const eConfirmar = errorConfirmar(form.confirmar, form.contrasena);
    setErrores(prev => ({ ...prev, contrasena: eContrasena, confirmar: eConfirmar }));
    return !eContrasena && !eConfirmar;
  };

  const toggleEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/clientes/${id}/estado`);
      setDatos(prev => prev.map(c => c.id_cliente === id ? { ...c, estado: nuevoEstado } : c));
    } catch { showToast("error", "Error al cambiar estado"); }
  };

  const PasoDatos = (<div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Nombres <span className="ms-req">*</span></label><input className={`ms-form-input${errores.nombres ? " input-error" : ""}`} placeholder="Ej: Juan" value={form.nombres} onChange={e => { const nombres = e.target.value; setForm({ ...form, nombres }); if (errores.nombres) setErrores(prev => ({ ...prev, nombres: errorNombres(nombres) })); }} onBlur={() => setErrores(prev => ({ ...prev, nombres: errorNombres(form.nombres) }))} />{errores.nombres && <span className="ms-form-error">{errores.nombres}</span>}</div>
      <div className="ms-form-group"><label className="ms-form-label">Apellidos <span className="ms-req">*</span></label><input className={`ms-form-input${errores.apellidos ? " input-error" : ""}`} placeholder="Ej: Pérez" value={form.apellidos} onChange={e => { const apellidos = e.target.value; setForm({ ...form, apellidos }); if (errores.apellidos) setErrores(prev => ({ ...prev, apellidos: errorApellidos(apellidos) })); }} onBlur={() => setErrores(prev => ({ ...prev, apellidos: errorApellidos(form.apellidos) }))} />{errores.apellidos && <span className="ms-form-error">{errores.apellidos}</span>}</div>
    </div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Tipo documento</label><select className="ms-form-select" value={form.tipo_doc} onChange={e => { const tipo_doc = e.target.value; setForm({ ...form, tipo_doc }); if (errores.documento) setErrores(prev => ({ ...prev, documento: errorDocumento(tipo_doc, form.documento) })); }}>{["CC","CE","TI","NIT","Pasaporte"].map(t => <option key={t}>{t}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className={`ms-form-input${errores.documento ? " input-error" : ""}`} placeholder="123456789" inputMode={form.tipo_doc === "Pasaporte" ? "text" : "numeric"} maxLength={maxLongitudDocumento(form.tipo_doc)} value={form.documento} onChange={e => { const documento = form.tipo_doc === "Pasaporte" ? e.target.value : soloDigitos(e.target.value); setForm({ ...form, documento }); if (errores.documento) setErrores(prev => ({ ...prev, documento: errorDocumento(form.tipo_doc, documento) })); }} onBlur={() => setErrores(prev => ({ ...prev, documento: errorDocumento(form.tipo_doc, form.documento) }))} />{errores.documento && <span className="ms-form-error">{errores.documento}</span>}</div>
    </div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Teléfono <span className="ms-req">*</span></label><input className={`ms-form-input${errores.telefono ? " input-error" : ""}`} inputMode="numeric" maxLength={LONGITUD_TELEFONO} placeholder="3001234567" value={form.telefono} onChange={e => { const telefono = soloDigitos(e.target.value); setForm({ ...form, telefono }); if (errores.telefono) setErrores(prev => ({ ...prev, telefono: validarTelefono(telefono) })); }} onBlur={() => setErrores(prev => ({ ...prev, telefono: validarTelefono(form.telefono) }))} />{errores.telefono && <span className="ms-form-error">{errores.telefono}</span>}</div>
      <div className="ms-form-group"><label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label><input type="email" className={`ms-form-input${errores.email ? " input-error" : ""}`} disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined} placeholder="ejemplo@correo.com" value={form.email} onChange={e => { const email = e.target.value; setForm({ ...form, email }); if (errores.email) setErrores(prev => ({ ...prev, email: errorEmail(email) })); }} onBlur={() => {
        const mensaje = errorEmail(form.email);
        setErrores(prev => ({ ...prev, email: mensaje }));
        if (!editar && !mensaje) {
          const valor = form.email.trim();
          if (valor) verificarEmailDuplicado(valor);
        }
      }} />{errores.email && <span className="ms-form-error">{errores.email}</span>}</div>
    </div>
  </div>);

  const PasoUbicacion = (<div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Ciudad <span className="ms-req">*</span></label><input className={`ms-form-input${errores.ciudad ? " input-error" : ""}`} placeholder="Medellín" value={form.ciudad} onChange={e => { const ciudad = e.target.value; setForm({ ...form, ciudad }); if (errores.ciudad) setErrores(prev => ({ ...prev, ciudad: errorCiudad(ciudad) })); }} onBlur={() => setErrores(prev => ({ ...prev, ciudad: errorCiudad(form.ciudad) }))} />{errores.ciudad && <span className="ms-form-error">{errores.ciudad}</span>}</div>
      <div className="ms-form-group"><label className="ms-form-label">Zona / Área</label><select className="ms-form-select" onChange={e => handleZona(e.target.value)}><option value="">— Todas las zonas —</option>{zonas.map(z => <option key={z} value={z}>{z}</option>)}</select></div>
    </div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Barrio / Comuna</label><select className="ms-form-select" value={form.id_barrio} onChange={e => setForm({ ...form, id_barrio: Number(e.target.value) })}><option value="">— Seleccionar —</option>{barFiltrados.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} — {b.comuna}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">Dirección completa</label><input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
    </div>
  </div>);

  const PasoClasificacion = (<div>
    {!editar && (
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Contraseña <span className="ms-req">*</span></label><input type="password" className={`ms-form-input${errores.contrasena ? " input-error" : ""}`} placeholder="Mín. 6 caracteres" value={form.contrasena} onChange={e => { const contrasena = e.target.value; setForm({ ...form, contrasena }); if (errores.contrasena) setErrores(prev => ({ ...prev, contrasena: errorContrasena(contrasena) })); if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: errorConfirmar(form.confirmar, contrasena) })); }} onBlur={() => setErrores(prev => ({ ...prev, contrasena: errorContrasena(form.contrasena) }))} />{errores.contrasena && <span className="ms-form-error">{errores.contrasena}</span>}</div>
        <div className="ms-form-group"><label className="ms-form-label">Confirmar contraseña <span className="ms-req">*</span></label><input type="password" className={`ms-form-input${errores.confirmar ? " input-error" : ""}`} placeholder="Repite la contraseña" value={form.confirmar} onChange={e => { const confirmar = e.target.value; setForm({ ...form, confirmar }); if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: errorConfirmar(confirmar, form.contrasena) })); }} onBlur={() => setErrores(prev => ({ ...prev, confirmar: errorConfirmar(form.confirmar, form.contrasena) }))} />{errores.confirmar && <span className="ms-form-error">{errores.confirmar}</span>}</div>
      </div>
    )}
    {editar ? (
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={form.permiso_cuotas} onChange={e => setForm({ ...form, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
        <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
      </div>
    ) : (
      <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={form.permiso_cuotas} onChange={e => setForm({ ...form, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
    )}
  </div>);

  const c = verDetalle;
  const DetalleDatos = c && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="ID"        value={`#${String(c.id_cliente).padStart(3,'0')}`} />
    <DetalleItem label="Nombre"    value={c.nombre} />
    <DetalleItem label="Tipo doc." value={c.tipo_doc} />
    <DetalleItem label="Documento" value={c.documento} />
    <DetalleItem label="Teléfono"  value={c.telefono} />
    <DetalleItem label="Email"     value={c.email} />
  </DetalleGrid></DetalleSeccion>);

  const DetalleUbicacion = c && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="Ciudad"    value={c.ciudad} />
    <DetalleItem label="Barrio"    value={c.barrio_nombre ? `${c.barrio_nombre} (${c.comuna})` : null} />
    <DetalleItem label="Dirección" value={c.direccion} full />
  </DetalleGrid></DetalleSeccion>);

  const DetalleClasificacion = c && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="Estado" value={c.estado} />
  </DetalleGrid></DetalleSeccion>);

  if (error) return <div style={{ padding: 32, color: "var(--danger)" }}>{error}</div>;

  return (
    <div className="clientes-container">
      <div className="clientes-actions-bar">
        <div className="clientes-search-wrapper">
          <span className="clientes-search-icon"><IconSearch /></span>
          <input type="text" className="clientes-search-input" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
          {busqueda && <button className="clientes-search-clear" onClick={() => { setBusqueda(""); setPagina(1); }}><IconX /></button>}
          </div>
          <div className="clientes-actions-right">
            {tienePerm('Clientes.crear') && (
              <button className="clientes-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo cliente</button>
            )}
            <ExportButtons
              datos={filtradosAll}
              columnas={[
                { header: "Cliente", key: "nombre" },
                { header: "Documento", value: (c) => `${c.tipo_doc} ${c.documento}` },
                { header: "Teléfono", value: (c) => c.telefono || "—" },
                { header: "Barrio", value: (c) => (c.barrio_nombre ? `${c.barrio_nombre} (${c.comuna})` : "—") },
                { header: "Compras", value: (c) => c.total_compras || 0 },
                { header: "Total gastado", value: (c) => `$${Number(c.total_gastado || 0).toLocaleString("es-CO")}` },
                ...(tienePerm('Clientes.estado') ? [{ header: "Estado", key: "estado" }] : []),
              ]}
              nombreArchivo="clientes"
              titulo="Clientes"
            />
          </div>
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">Cliente</th>
              <th className="tbl-th">Documento</th>
              <th className="tbl-th">Teléfono</th>
              <th className="tbl-th">Compras</th>
              <th className="tbl-th">Total</th>
              {tienePerm('Clientes.estado') && <th className="tbl-th">Estado</th>}
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {loading ? (
              <tr><td colSpan="8" className="tbl-td">Cargando clientes...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="8" className="tbl-td">No hay clientes con compras registradas</td></tr>
            ) : filtrados.map((c) => (
              <tr key={c.id_cliente} className="tbl-row">
                <td className="tbl-td"><div className="clientes-user-info"><div className="clientes-user-name">{c.nombre}</div><div className="clientes-user-email">{c.email}</div></div></td>
                <td className="tbl-td"><span className="tabla-doc">{c.tipo_doc} {c.documento}</span></td>
                <td className="tbl-td clientes-phone-cell">{c.telefono || '—'}</td>
                <td className="tbl-td">{c.total_compras || 0}</td>
                <td className="tbl-td">${Number(c.total_gastado || 0).toLocaleString('es-CO')}</td>
                {tienePerm('Clientes.estado') && (
                  <td className="tbl-td"><StatusToggle id={c.id_cliente} estado={c.estado} onToggle={toggleEstado} showConfirmation={true} /></td>
                )}
                <td className="tbl-td">
                  <div className="clientes-action-cell">
                    <button className="clientes-action-btn clientes-view-btn" onClick={() => setVerDetalle(c)} title="Ver detalles"><IconEye /></button>
                    {tienePerm('Clientes.editar') && (
                      <button className="clientes-action-btn clientes-edit-btn" onClick={() => abrirEditar(c)} title="Editar"><IconEdit /></button>
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
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtradosAll.length} registros</span>
          </div>
        )}

        {/* Print button moved to top actions bar */}
      </div>

      {modal && (
        <ModalSteps
          titulo={editar ? "Editar cliente" : "Nuevo cliente"}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          step={pasoModal} onStepChange={setPasoModal}
          onClose={() => setModal(false)}
          onGuardar={guardar}
          validaciones={[validarPasoDatos, validarPasoUbicacion, validarPasoClasificacion]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          {PasoDatos}
          {PasoUbicacion}
          {PasoClasificacion}
        </ModalSteps>
      )}

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle del cliente"
          subtitulo={verDetalle.nombre}
          badge={<span className={`tabla-status ${verDetalle.estado === "Activo" ? 'activo' : 'inactivo'}`}>{verDetalle.estado}</span>}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => setVerDetalle(null)}
          onEditar={tienePerm('Clientes.editar') ? () => { setVerDetalle(null); abrirEditar(verDetalle); } : undefined}
        >
          {DetalleDatos}
          {DetalleUbicacion}
          {DetalleClasificacion}
        </ModalDetalle>
      )}
      <Toast toast={toast} />
    </div>
  );
}