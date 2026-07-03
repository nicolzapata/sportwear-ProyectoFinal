// src/pages/usuarios/Usuarios.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import StatusToggle from "../../components/StatusToggle";
import Toast from "../../components/Toast";
import Loader from "../../components/Loader";
import ExportButtons from "../../components/ExportButtons";
import { soloDigitos } from "../../utils/numerico";
import './Usuarios.css';
import { IconEdit, IconEyeOpen, IconEyeClosed, IconLock, IconSearch, IconX } from "../../components/Icons";

const TIPOS_DOC = ["CC", "CE", "TI", "NIT", "PP"];
const FILAS_POR_PAGINA = 10;
const normalizeM = (v) => v?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export default function Usuarios() {
  const { usuario } = useAuth();

  const modulosUsuario = Array.isArray(usuario?.modulos) ? usuario.modulos.map(normalizeM) : [];
  const esAdmin        = usuario?.rol === 'Admin';
  const tieneUsuarios  = esAdmin || modulosUsuario.includes('usuarios');
  const tieneClientes  = esAdmin || modulosUsuario.includes('clientes');
  const tienePerm      = (p) => (usuario?.permisos || []).includes(p);

  const [usuarios,       setUsuarios]       = useState([]);
  const [clientes,       setClientes]       = useState([]);
  const [roles,          setRoles]          = useState([]);
  const esRolAdmin = (id_rol) => {
    const nombre = normalizeM(roles.find(r => r.id_rol === Number(id_rol))?.nombre);
    return nombre === 'administrador' || nombre === 'admin';
  };
  const [barrios,        setBarrios]        = useState([]);
  const [busqueda,       setBusqueda]       = useState("");
  const [modal,          setModal]          = useState(false);
  const [detalle,        setDetalle]        = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [editar,         setEditar]         = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showPassword,   setShowPassword]   = useState(false);
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [toast,          setToast]          = useState(null);

  const [filterType, setFilterType] = useState(() =>
    tieneUsuarios ? 'usuarios' : 'clientes'
  );

  const [form, setForm] = useState({
    nombre: "", email: "", contrasena: "", id_rol: 1, estado: "Activo",
    tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín",
    id_barrio: "", direccion: ""
  });

  const [errores, setErrores] = useState({ nombre: "", documento: "", email: "", contrasena: "", telefono: "", direccion: "", id_barrio: "" });

  const [clienteForm, setClienteForm] = useState({
    nombre: "", tipo_doc: "CC", documento: "", telefono: "", email: "",
    id_barrio: "", direccion: "", tipo_cliente: "Regular",
    permiso_pagos: 1, permiso_cuotas: 1, estado: "Activo"
  });
  const [erroresCliente, setErroresCliente] = useState({ nombre: "", documento: "", telefono: "", email: "", direccion: "", id_barrio: "" });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const promesas = [api.get("/roles"), api.get("/barrios")];
    if (tieneUsuarios) promesas.unshift(api.get("/usuarios"));

    Promise.all(promesas).then((res) => {
      if (tieneUsuarios) {
        setUsuarios(res[0].data);
        setRoles(res[1].data);
        setBarrios(res[2].data);
      } else {
        setRoles(res[0].data);
        setBarrios(res[1].data);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [tieneUsuarios]);

  useEffect(() => {
    if (filterType === "clientes" && tieneClientes) {
      api.get("/clientes/rol-cliente").then(r => setClientes(r.data)).catch(console.error);
    }
  }, [filterType, tieneClientes]);

  const tipoBadge = (tipo) => {
    const map = { VIP: "vip", Mayorista: "mayorista", Corporativo: "corporativo" };
    return map[tipo] || "regular";
  };

  const getRoleName = (id_rol) =>
    roles.find(r => Number(r.id_rol) === Number(id_rol))?.nombre || id_rol;

  const filtrados = filterType === "usuarios"
    ? usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(u.id_usuario).includes(busqueda.trim())
      )
    : clientes.filter(c =>
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.documento?.includes(busqueda)
      );

  const pagina       = filterType === "usuarios" ? paginaUsuarios : paginaClientes;
  const setPagina    = filterType === "usuarios" ? setPaginaUsuarios : setPaginaClientes;
  const totalPaginas = Math.ceil(filtrados.length / FILAS_POR_PAGINA);
  const filtradosPagina = filtrados.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const abrirDetalle = async (u) => {
    setDetalle(u);
    try { const { data } = await api.get(`/usuarios/${u.id_usuario}`); setDetalle(data); }
    catch { showToast("error", "No se pudo cargar el detalle completo del usuario."); }
  };

  const abrirRegistrar = () => {
    setEditar(null);
    setErrores({ nombre: "", documento: "", email: "", contrasena: "", telefono: "", direccion: "", id_barrio: "" });
    setForm({ nombre: "", email: "", contrasena: "", id_rol: roles[0]?.id_rol || 1, estado: "Activo", tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín", id_barrio: "", direccion: "" });
    setModal(true);
  };

  const abrirRegistrarCliente = () => {
    setEditar(null);
    setErroresCliente({ nombre: "", documento: "", telefono: "", email: "", direccion: "", id_barrio: "" });
    setClienteForm({ nombre: "", tipo_doc: "CC", documento: "", telefono: "", email: "", id_barrio: "", direccion: "", tipo_cliente: "Regular", permiso_pagos: 1, permiso_cuotas: 1, estado: "Activo" });
    setModal(true);
  };

  const abrirEditar = async (u) => {
    setEditar(u.id_usuario);
    setErrores({ nombre: "", documento: "", email: "", contrasena: "", telefono: "", direccion: "", id_barrio: "" });
    setForm({ nombre: u.nombre || "", email: u.email || "", contrasena: "", id_rol: u.id_rol || roles[0]?.id_rol || 1, estado: u.estado || "Activo", tipo_doc: u.tipo_doc || "CC", documento: u.documento || "", telefono: u.telefono || "", ciudad: u.ciudad || "Medellín", id_barrio: u.id_barrio || "", direccion: u.direccion || "" });
    if (!u.tipo_doc) {
      try {
        const { data } = await api.get(`/usuarios/${u.id_usuario}`);
        setForm(f => ({ ...f, tipo_doc: data.tipo_doc || "CC", documento: data.documento || "", telefono: data.telefono || "", ciudad: data.ciudad || "Medellín", id_barrio: data.id_barrio || "", direccion: data.direccion || "" }));
      } catch (err) { console.error(err); }
    }
    setModal(true);
  };

  const abrirEditarCliente = (c) => {
    setEditar(c.id_cliente);
    setErroresCliente({ nombre: "", documento: "", telefono: "", email: "", direccion: "", id_barrio: "" });
    setClienteForm({ nombre: c.nombre, tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", id_barrio: c.id_barrio || "", direccion: c.direccion || "", tipo_cliente: c.tipo_cliente, permiso_pagos: c.permiso_pagos, permiso_cuotas: c.permiso_cuotas || 1, estado: c.estado });
    setModal(true);
  };

  // ── Validaciones usuario (combinadas, sin funciones sueltas sin usar) ──────
  const validarPasoDatosCuenta = () => {
    const e = {};
    if (!form.documento.trim()) e.documento = "El documento es obligatorio";
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!form.email.trim()) e.email = "El correo electrónico es obligatorio";
    if (!form.telefono.trim()) e.telefono = "El teléfono es obligatorio";
    if (!editar && !form.contrasena) e.contrasena = "La contraseña es obligatoria";
    if (form.contrasena && form.contrasena.length < 6) e.contrasena = "La contraseña debe tener al menos 6 caracteres";
    if (form.contrasena && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(form.contrasena)) e.contrasena = "La contraseña debe contener un símbolo";
    setErrores(prev => ({ ...prev, ...e, ...(!e.documento && { documento: "" }), ...(!e.nombre && { nombre: "" }), ...(!e.email && { email: "" }), ...(!e.telefono && { telefono: "" }), ...(!e.contrasena && { contrasena: "" }) }));
    return Object.keys(e).length === 0;
  };

  const validarPasoUbicacionRol = () => {
    const e = {};
    if (!form.id_barrio) e.id_barrio = "Selecciona un barrio";
    if (!form.direccion.trim()) e.direccion = "La dirección es obligatoria";
    setErrores(prev => ({ ...prev, ...e, ...(!e.id_barrio && { id_barrio: "" }), ...(!e.direccion && { direccion: "" }) }));
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    try {
      if (!editar) await api.post("/usuarios", form);
      else         await api.put(`/usuarios/${editar}`, form);
      cargar();
      setModal(false);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al guardar usuario");
      return false;
    }
  };

  // ── Validaciones cliente (embebido) ────────────────────────────────────────
  const validarPasoClienteDatos = () => {
    const e = {};
    if (!clienteForm.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!clienteForm.documento.trim()) e.documento = "El documento es obligatorio";
    if (!clienteForm.telefono.trim()) e.telefono = "El teléfono es obligatorio";
    if (!clienteForm.email.trim()) e.email = "El correo electrónico es obligatorio";
    setErroresCliente(prev => ({ ...prev, ...e, ...(!e.nombre && { nombre: "" }), ...(!e.documento && { documento: "" }), ...(!e.telefono && { telefono: "" }), ...(!e.email && { email: "" }) }));
    return Object.keys(e).length === 0;
  };

  const validarPasoClienteUbicacionClasificacion = () => {
    const e = {};
    if (!clienteForm.id_barrio) e.id_barrio = "Selecciona un barrio";
    if (!clienteForm.direccion.trim()) e.direccion = "La dirección es obligatoria";
    setErroresCliente(prev => ({ ...prev, ...e, ...(!e.id_barrio && { id_barrio: "" }), ...(!e.direccion && { direccion: "" }) }));
    return Object.keys(e).length === 0;
  };

  const guardarCliente = async () => {
    try {
      if (editar) {
        const { data } = await api.put(`/clientes/${editar}`, clienteForm);
        setClientes(prev => prev.map(c => c.id_cliente === editar ? { ...c, ...data } : c));
        showToast("exito", "Cliente actualizado correctamente.");
      } else {
        const { data } = await api.post("/clientes", clienteForm);
        setClientes(prev => [...prev, { ...data, barrio_nombre: "", ciudad: "Medellín" }]);
        showToast("exito", "Cliente registrado correctamente.");
      }
      setModal(false);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al guardar cliente");
      return false;
    }
  };

  const cargar = () => {
    if (tieneUsuarios) api.get("/usuarios").then(r => setUsuarios(r.data)).catch(console.error);
  };

  const toggleEstadoUsuario = async (id, nuevoEstado) => {
    await api.patch(`/usuarios/${id}/estado`);
    setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, estado: nuevoEstado } : u));
  };

  const toggleEstadoCliente = async (id, nuevoEstado) => {
    await api.patch(`/clientes/${id}/estado`);
    setClientes(prev => prev.map(c => c.id_cliente === id ? { ...c, estado: nuevoEstado } : c));
  };

  const toggleClientePermisoCuotas = async (id) => {
    try {
      await api.patch(`/clientes/${id}/permiso-cuotas`);
      setClientes(prev => prev.map(c => c.id_cliente === id ? { ...c, permiso_cuotas: !c.permiso_cuotas } : c));
    } catch { showToast("error", "Error al cambiar permiso de cuotas"); }
  };

  if (loading) return <Loader text="Cargando usuarios..." />;

  // ── Paso 1 (combinado): Documento + Cuenta ────────────────────────────────
  const PasosDatosCuenta = (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Tipo doc. <span className="ms-req">*</span></label>
          <select className="ms-form-select" value={form.tipo_doc} onChange={e => setForm({ ...form, tipo_doc: e.target.value })}>
            {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">N° documento <span className="ms-req">*</span></label>
          <input className={`ms-form-input${errores.documento ? " input-error" : ""}`} placeholder="1001234567" value={form.documento}
            disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined} inputMode="numeric"
            onChange={e => { setForm({ ...form, documento: soloDigitos(e.target.value) }); if (errores.documento) setErrores(prev => ({ ...prev, documento: "" })); }} />
          {errores.documento && <span className="ms-form-error">{errores.documento}</span>}
        </div>
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label>
        <input className={`ms-form-input${errores.nombre ? " input-error" : ""}`} placeholder="Ej: Nicol Zapata" value={form.nombre}
          onChange={e => { setForm({ ...form, nombre: e.target.value }); if (errores.nombre) setErrores(prev => ({ ...prev, nombre: "" })); }} />
        {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
      </div>

      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label>
          <input type="email" className={`ms-form-input${errores.email ? " input-error" : ""}`} placeholder="ejemplo@correo.com" value={form.email}
            disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined}
            onChange={e => { setForm({ ...form, email: e.target.value }); if (errores.email) setErrores(prev => ({ ...prev, email: "" })); }} />
          {errores.email && <span className="ms-form-error">{errores.email}</span>}
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Teléfono <span className="ms-req">*</span></label>
          <input className={`ms-form-input${errores.telefono ? " input-error" : ""}`} placeholder="3001234567" value={form.telefono} inputMode="numeric"
            onChange={e => { setForm({ ...form, telefono: soloDigitos(e.target.value) }); if (errores.telefono) setErrores(prev => ({ ...prev, telefono: "" })); }} />
          {errores.telefono && <span className="ms-form-error">{errores.telefono}</span>}
        </div>
      </div>
      {(!editar || editar === usuario?.id_usuario) && (
        <div className="ms-form-group">
          <label className="ms-form-label">Contraseña {!editar && <span className="ms-req">*</span>}</label>
          <div className="input-wrapper">
            <span className="input-icon"><IconLock /></span>
            <input type={showPassword ? "text" : "password"}
              className={`ms-form-input${errores.contrasena ? " input-error" : ""}`}
              placeholder={editar ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
              value={form.contrasena}
              onChange={e => { setForm({ ...form, contrasena: e.target.value }); if (errores.contrasena) setErrores(prev => ({ ...prev, contrasena: "" })); }} />
            <div className="input-bar" />
            <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <IconEyeOpen /> : <IconEyeClosed />}</span>
          </div>
          {errores.contrasena && <span className="ms-form-error">{errores.contrasena}</span>}
        </div>
      )}
    </div>
  );

  // ── Paso 2 (combinado): Ubicación + Rol ───────────────────────────────────
  const PasosUbicacionRol = (
    <div>
      <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" placeholder="Medellín" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></div>
      <div className="ms-form-group">
        <label className="ms-form-label">Barrio <span className="ms-req">*</span></label>
        <select className={`ms-form-select${errores.id_barrio ? " input-error" : ""}`} value={form.id_barrio}
          onChange={e => { setForm({ ...form, id_barrio: e.target.value }); if (errores.id_barrio) setErrores(prev => ({ ...prev, id_barrio: "" })); }}>
          <option value="">— Selecciona un barrio —</option>
          {barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
        </select>
        {errores.id_barrio && <span className="ms-form-error">{errores.id_barrio}</span>}
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">Dirección <span className="ms-req">*</span></label>
        <input className={`ms-form-input${errores.direccion ? " input-error" : ""}`} placeholder="Cra 43A # 10-20 Apto 301" value={form.direccion}
          onChange={e => { setForm({ ...form, direccion: e.target.value }); if (errores.direccion) setErrores(prev => ({ ...prev, direccion: "" })); }} />
        {errores.direccion && <span className="ms-form-error">{errores.direccion}</span>}
      </div>

      <div className="ms-form-group">
        <label className="ms-form-label">Rol</label>
        <select className="ms-form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>
          {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
        </select>
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">Estado</label>
        <select
          className="ms-form-select"
          value={esRolAdmin(form.id_rol) ? "Activo" : form.estado}
          disabled={esRolAdmin(form.id_rol)}
          title={esRolAdmin(form.id_rol) ? "Un administrador siempre permanece activo" : undefined}
          onChange={e => setForm({ ...form, estado: e.target.value })}
        >
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>
      </div>
    </div>
  );

  const DetalleDatosCuenta = detalle && (
    <>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Tipo doc." value={detalle.tipo_doc} />
        <DetalleItem label="Documento" value={detalle.documento} />
        <DetalleItem label="Nombre completo" value={detalle.nombre} full />
      </DetalleGrid></DetalleSeccion>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Correo electrónico" value={detalle.email} />
        <DetalleItem label="Teléfono" value={detalle.telefono} />
      </DetalleGrid></DetalleSeccion>
    </>
  );

  const DetalleUbicacionRol = detalle && (
    <>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Ciudad" value={detalle.ciudad} />
        <DetalleItem label="Barrio" value={detalle.barrio || null} />
        <DetalleItem label="Dirección" value={detalle.direccion} full />
      </DetalleGrid></DetalleSeccion>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Rol" value={detalle.rol || getRoleName(detalle.id_rol)} />
        <DetalleItem label="Estado" value={detalle.estado} />
        <DetalleItem label="Fecha de creación" value={detalle.fecha_creacion ? new Date(detalle.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null} />
      </DetalleGrid></DetalleSeccion>
    </>
  );

  return (
    <div className="usuarios-container">
      <div className="usuarios-actions-bar">
        <div className="usuarios-actions-left">
          <div className="usuarios-search-wrapper">
            <span className="usuarios-search-icon"><IconSearch /></span>
            <input type="text" className="usuarios-search-input" placeholder={filterType === 'usuarios' ? "Buscar por nombre, email o ID..." : "Buscar por nombre o documento..."} value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPaginaUsuarios(1); setPaginaClientes(1); }} />
            {busqueda && <button className="usuarios-search-clear" onClick={() => { setBusqueda(""); setPaginaUsuarios(1); setPaginaClientes(1); }}><IconX /></button>}
          </div>

          {tieneUsuarios && tieneClientes && (
            <div className="usuarios-filter-toggle">
              <button className={`usuarios-filter-btn ${filterType === 'usuarios' ? 'active' : ''}`} onClick={() => { setFilterType('usuarios'); setPaginaUsuarios(1); }}>Usuarios</button>
              <button className={`usuarios-filter-btn ${filterType === 'clientes' ? 'active' : ''}`} onClick={() => { setFilterType('clientes'); setPaginaClientes(1); }}>Clientes</button>
            </div>
          )}
        </div>

        <div className="usuarios-actions-right">
          {filterType === 'usuarios' && tienePerm('Usuarios.crear') && (
            <button className="usuarios-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo usuario</button>
          )}
          {filterType === 'clientes' && tienePerm('Clientes.crear') && (
            <button className="usuarios-btn-primary" onClick={abrirRegistrarCliente}><span>+</span> Nuevo cliente</button>
          )}
          <ExportButtons
            datos={filtrados}
            columnas={filterType === 'usuarios' ? [
              { header: "Usuario", key: "nombre" },
              { header: "Email", key: "email" },
              { header: "Rol", key: "rol" },
              { header: "Estado", key: "estado" },
            ] : [
              { header: "Cliente", key: "nombre" },
              { header: "Documento", key: "documento" },
              { header: "Teléfono", key: "telefono" },
              { header: "Barrio", key: "barrio_nombre" },
              { header: "Tipo", key: "tipo_cliente" },
              { header: "Cuotas", value: (c) => c.permiso_cuotas !== false ? "Sí" : "No" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo={filterType === 'usuarios' ? "usuarios" : "clientes"}
            titulo={filterType === 'usuarios' ? "Usuarios" : "Clientes"}
          />
        </div>
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            {filterType === 'usuarios' ? (
              <tr>
                <th className="tbl-th">Usuario</th>
                <th className="tbl-th">Email</th>
                <th className="tbl-th">Rol</th>
                {tienePerm('Usuarios.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            ) : (
              <tr>
                <th className="tbl-th">Cliente</th>
                <th className="tbl-th">Documento</th>
                <th className="tbl-th">Teléfono</th>
                <th className="tbl-th">Barrio</th>
                <th className="tbl-th">Tipo</th>
                <th className="tbl-th">Cuotas</th>
                {tienePerm('Clientes.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            )}
          </thead>
          <tbody className="tbl-body">
            {filtradosPagina.length === 0 ? (
              <tr><td colSpan="100%" className="tbl-td usuarios-empty-row">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay registros para mostrar."}</td></tr>
            ) : filterType === 'usuarios' ? (
              filtradosPagina.map(u => (
                <tr key={u.id_usuario} className="tbl-row">
                  <td className="tbl-td"><div className="usuarios-user-info"><div className="usuarios-user-name">{u.nombre}</div></div></td>
                  <td className="tbl-td usuarios-email-cell">{u.email}</td>
                  <td className="tbl-td"><span className="tabla-rol">{u.rol || getRoleName(u.id_rol)}</span></td>
                  {tienePerm('Usuarios.estado') && (
                    <td className="tbl-td">
                      <StatusToggle
                        id={u.id_usuario}
                        estado={u.estado}
                        onToggle={toggleEstadoUsuario}
                        showConfirmation={true}
                        disabled={esRolAdmin(u.id_rol)}
                        disabledReason="Un administrador siempre permanece activo"
                      />
                    </td>
                  )}
                  <td className="tbl-td">
                    <div className="usuarios-action-cell">
                      <button className="usuarios-action-btn usuarios-view-btn" onClick={() => abrirDetalle(u)} title="Ver detalles"><IconEyeOpen /></button>
                      {tienePerm('Usuarios.editar') && (
                        <button className="usuarios-action-btn usuarios-edit-btn" onClick={() => abrirEditar(u)} title="Editar"><IconEdit /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              filtradosPagina.map(c => (
                <tr key={c.id_cliente} className="tbl-row">
                  <td className="tbl-td"><div className="clientes-user-info"><div className="clientes-user-name">{c.nombre}</div><div className="clientes-user-email">{c.email}</div></div></td>
                  <td className="tbl-td"><span className="clientes-doc-badge">{c.tipo_doc} {c.documento}</span></td>
                  <td className="tbl-td clientes-phone-cell">{c.telefono || '—'}</td>
                  <td className="tbl-td">{c.barrio_nombre ? <div className="clientes-barrio-name">{c.barrio_nombre}</div> : <span className="clientes-empty">—</span>}</td>
                  <td className="tbl-td"><span className={`clientes-tipo-badge ${tipoBadge(c.tipo_cliente)}`}>{c.tipo_cliente}</span></td>
                  <td className="tbl-td">
                    {tienePerm('Clientes.editar')
                      ? <span className={`tabla-status ${c.permiso_cuotas !== false ? "activo" : "inactivo"}`} onClick={() => toggleClientePermisoCuotas(c.id_cliente)} style={{ cursor: 'pointer' }} title="Click para cambiar">{c.permiso_cuotas !== false ? "Sí" : "No"}</span>
                      : <span className={`tabla-status ${c.permiso_cuotas !== false ? "activo" : "inactivo"}`}>{c.permiso_cuotas !== false ? "Sí" : "No"}</span>
                    }
                  </td>
                  {tienePerm('Clientes.estado') && (
                    <td className="tbl-td"><StatusToggle id={c.id_cliente} estado={c.estado} onToggle={toggleEstadoCliente} showConfirmation={true} /></td>
                  )}
                  <td className="tbl-td">
                    <div className="clientes-action-cell">
                      <button className="clientes-action-btn clientes-view-btn" onClick={() => setClienteDetalle(c)} title="Ver detalles"><IconEyeOpen /></button>
                      {tienePerm('Clientes.editar') && (
                        <button className="clientes-action-btn clientes-edit-btn" onClick={() => abrirEditarCliente(c)} title="Editar"><IconEdit /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtrados.length} registros</span>
          </div>
        )}
      </div>

      {modal && filterType === 'usuarios' && (
        <ModalSteps titulo={editar ? "Editar usuario" : "Nuevo usuario"} pasos={["Datos y cuenta", "Ubicación y rol"]}
          onClose={() => setModal(false)} onGuardar={guardar}
          validaciones={[validarPasoDatosCuenta, validarPasoUbicacionRol]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}>
          {PasosDatosCuenta}{PasosUbicacionRol}
        </ModalSteps>
      )}

      {modal && filterType === 'clientes' && (
        <ModalSteps titulo={editar ? "Editar cliente" : "Nuevo cliente"} pasos={["Datos personales", "Ubicación y clasificación"]}
          onClose={() => setModal(false)} onGuardar={guardarCliente}
          validaciones={[validarPasoClienteDatos, validarPasoClienteUbicacionClasificacion]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}>
          <div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.nombre ? " input-error" : ""}`} placeholder="Ej: Juan Pérez" value={clienteForm.nombre} onChange={e => { setClienteForm({ ...clienteForm, nombre: e.target.value }); if (erroresCliente.nombre) setErroresCliente(prev => ({ ...prev, nombre: "" })); }} />{erroresCliente.nombre && <span className="ms-form-error">{erroresCliente.nombre}</span>}</div>
              <div className="ms-form-group"><label className="ms-form-label">Tipo documento</label><select className="ms-form-select" value={clienteForm.tipo_doc} disabled={!!editar} onChange={e => setClienteForm({ ...clienteForm, tipo_doc: e.target.value })}>{["CC", "CE", "TI", "NIT", "Pasaporte"].map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.documento ? " input-error" : ""}`} placeholder="123456789" value={clienteForm.documento} disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined} inputMode="numeric" onChange={e => { setClienteForm({ ...clienteForm, documento: soloDigitos(e.target.value) }); if (erroresCliente.documento) setErroresCliente(prev => ({ ...prev, documento: "" })); }} />{erroresCliente.documento && <span className="ms-form-error">{erroresCliente.documento}</span>}</div>
              <div className="ms-form-group"><label className="ms-form-label">Teléfono <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.telefono ? " input-error" : ""}`} placeholder="3001234567" value={clienteForm.telefono} inputMode="numeric" onChange={e => { setClienteForm({ ...clienteForm, telefono: soloDigitos(e.target.value) }); if (erroresCliente.telefono) setErroresCliente(prev => ({ ...prev, telefono: "" })); }} />{erroresCliente.telefono && <span className="ms-form-error">{erroresCliente.telefono}</span>}</div>
            </div>
            <div className="ms-form-group"><label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label><input type="email" className={`ms-form-input${erroresCliente.email ? " input-error" : ""}`} placeholder="ejemplo@correo.com" value={clienteForm.email} disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined} onChange={e => { setClienteForm({ ...clienteForm, email: e.target.value }); if (erroresCliente.email) setErroresCliente(prev => ({ ...prev, email: "" })); }} />{erroresCliente.email && <span className="ms-form-error">{erroresCliente.email}</span>}</div>
          </div>
          <div>
            <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" value="Medellín" disabled style={{ opacity: 0.55 }} /></div>
            <div className="ms-form-group">
              <label className="ms-form-label">Barrio <span className="ms-req">*</span></label>
              <select className={`ms-form-select${erroresCliente.id_barrio ? " input-error" : ""}`} value={clienteForm.id_barrio}
                onChange={e => { setClienteForm({ ...clienteForm, id_barrio: Number(e.target.value) }); if (erroresCliente.id_barrio) setErroresCliente(prev => ({ ...prev, id_barrio: "" })); }}>
                <option value="">— Seleccionar —</option>
                {barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
              </select>
              {erroresCliente.id_barrio && <span className="ms-form-error">{erroresCliente.id_barrio}</span>}
            </div>
            <div className="ms-form-group">
              <label className="ms-form-label">Dirección completa <span className="ms-req">*</span></label>
              <input className={`ms-form-input${erroresCliente.direccion ? " input-error" : ""}`} placeholder="Cra 70 # 48-15 Apto 201" value={clienteForm.direccion}
                onChange={e => { setClienteForm({ ...clienteForm, direccion: e.target.value }); if (erroresCliente.direccion) setErroresCliente(prev => ({ ...prev, direccion: "" })); }} />
              {erroresCliente.direccion && <span className="ms-form-error">{erroresCliente.direccion}</span>}
            </div>

            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">Tipo de cliente</label><select className="ms-form-select" value={clienteForm.tipo_cliente} onChange={e => setClienteForm({ ...clienteForm, tipo_cliente: e.target.value })}>{["Regular", "VIP", "Mayorista", "Corporativo"].map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="ms-form-group"><label className="ms-form-label">Permiso de pagos</label><select className="ms-form-select" value={clienteForm.permiso_pagos} onChange={e => setClienteForm({ ...clienteForm, permiso_pagos: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
            </div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={clienteForm.permiso_cuotas} onChange={e => setClienteForm({ ...clienteForm, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
              <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={clienteForm.estado} onChange={e => setClienteForm({ ...clienteForm, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
            </div>
          </div>
        </ModalSteps>
      )}

      {detalle && (
        <ModalDetalle titulo="Perfil del usuario" subtitulo={detalle.nombre}
          badge={<span className={`tabla-status ${detalle.estado === "Activo" ? "activo" : "inactivo"}`}>{detalle.estado}</span>}
          pasos={["Datos y cuenta", "Ubicación y rol"]}
          onClose={() => setDetalle(null)}
          onEditar={tienePerm('Usuarios.editar') ? () => { setDetalle(null); abrirEditar(detalle); } : undefined}
        >
          {DetalleDatosCuenta}{DetalleUbicacionRol}
        </ModalDetalle>
      )}

      {clienteDetalle && (
        <ModalDetalle titulo="Detalle del cliente" subtitulo={clienteDetalle.nombre}
          badge={<span className={`tabla-status ${clienteDetalle.estado === "Activo" ? "activo" : "inactivo"}`}>{clienteDetalle.estado}</span>}
          pasos={["Datos personales", "Ubicación y clasificación"]}
          onClose={() => setClienteDetalle(null)}
          onEditar={tienePerm('Clientes.editar') ? () => { setClienteDetalle(null); abrirEditarCliente(clienteDetalle); } : undefined}
        >
          <DetalleSeccion><DetalleGrid>
            <DetalleItem label="Nombre completo"    value={clienteDetalle.nombre} full />
            <DetalleItem label="Tipo documento"     value={clienteDetalle.tipo_doc} />
            <DetalleItem label="N° documento"       value={clienteDetalle.documento} />
            <DetalleItem label="Teléfono"           value={clienteDetalle.telefono} />
            <DetalleItem label="Correo electrónico" value={clienteDetalle.email} />
          </DetalleGrid></DetalleSeccion>
          <>
            <DetalleSeccion><DetalleGrid>
              <DetalleItem label="Ciudad"             value={clienteDetalle.ciudad} />
              <DetalleItem label="Barrio"             value={clienteDetalle.barrio_nombre || null} />
              <DetalleItem label="Dirección completa" value={clienteDetalle.direccion} full />
            </DetalleGrid></DetalleSeccion>
            <DetalleSeccion><DetalleGrid>
              <DetalleItem label="Tipo de cliente"  value={clienteDetalle.tipo_cliente} />
              <DetalleItem label="Permiso de pagos" value={clienteDetalle.permiso_pagos ? "Permitido" : "Bloqueado"} />
              <DetalleItem label="Pago por cuotas"  value={clienteDetalle.permiso_cuotas ? "Permitido" : "Bloqueado"} />
              <DetalleItem label="Estado"           value={clienteDetalle.estado} />
            </DetalleGrid></DetalleSeccion>
          </>
        </ModalDetalle>
      )}

      <Toast toast={toast} />
    </div>
  );
}