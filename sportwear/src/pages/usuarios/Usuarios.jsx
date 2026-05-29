// src/pages/usuarios/Usuarios.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import StatusToggle from "../../components/StatusToggle";
import './Usuarios.css';
import { IconEdit, IconEyeOpen, IconEyeClosed, IconLock, IconPrint, IconSearch, IconX } from "../../components/Icons";

const TIPOS_DOC = ["CC", "CE", "TI", "NIT", "PP"];

const fmtFecha = (f) => f ? new Date(f).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

const FILAS_POR_PAGINA = 10;

export default function Usuarios() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [barFiltrados, setBarFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [editar, setEditar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", contrasena: "", id_rol: 1, estado: "Activo", tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín", id_barrio: "", direccion: "", permiso_cuotas: true });
  const [filterType, setFilterType] = useState("usuarios");
  const [clienteForm, setClienteForm] = useState({ nombre: "", tipo_doc: "CC", documento: "", telefono: "", email: "", id_barrio: "", direccion: "", tipo_cliente: "Regular", permiso_pagos: 1, permiso_cuotas: 1, estado: "Activo" });
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [paginaClientes, setPaginaClientes] = useState(1);

  useEffect(() => {
    Promise.all([
      api.get("/usuarios"),
      api.get("/roles"),
      api.get("/barrios")
    ]).then(([usuariosRes, rolesRes, barriosRes]) => {
      setUsuarios(usuariosRes.data);
      setRoles(rolesRes.data);
      setBarrios(barriosRes.data);
    }).catch(err => console.error(err)).finally(() => setLoading(false));

    api.get("/barrios/zonas").then((res) => {
      setZonas(res.data);
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (filterType === "clientes") {
      api.get("/clientes/con-ventas").then((res) => {
        setClientes(res.data);
      }).catch(err => console.error(err));
    }
  }, [filterType]);

  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter(b => b.zona === zona) : barrios);
    setClienteForm(f => ({ ...f, id_barrio: "" }));
  };

  const tipoBadge = (tipo) => {
    const map = { VIP: "vip", Mayorista: "mayorista", Corporativo: "corporativo" };
    return map[tipo] || "regular";
  };

  const filtrados = filterType === "usuarios"
    ? usuarios.filter((u) =>
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : clientes.filter((c) =>
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
    catch { /* usa los datos parciales ya seteados */ }
  };

  const abrirRegistrar = () => {
    setEditar(null);
    setForm({ nombre: "", email: "", contrasena: "", id_rol: roles[0]?.id_rol || 1, estado: "Activo", tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín", id_barrio: "", direccion: "" });
    setModal(true);
  };

  const abrirRegistrarCliente = () => {
    setEditar(null);
    setClienteForm({ nombre: "", tipo_doc: "CC", documento: "", telefono: "", email: "", id_barrio: "", direccion: "", tipo_cliente: "Regular", permiso_pagos: 1, permiso_cuotas: 1, estado: "Activo" });
    setModal(true);
  };

  const abrirEditar = async (u) => {
    setEditar(u.id_usuario);
    setForm({ nombre: u.nombre || "", email: u.email || "", contrasena: "", id_rol: u.id_rol || roles[0]?.id_rol || 1, estado: u.estado || "Activo", tipo_doc: u.tipo_doc || "CC", documento: u.documento || "", telefono: u.telefono || "", ciudad: u.ciudad || "Medellín", id_barrio: u.id_barrio || "", direccion: u.direccion || "", permiso_cuotas: u.permiso_cuotas !== false });
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
    setClienteForm({
      nombre: c.nombre,
      tipo_doc: c.tipo_doc,
      documento: c.documento,
      telefono: c.telefono || "",
      email: c.email || "",
      id_barrio: c.id_barrio || "",
      direccion: c.direccion || "",
      tipo_cliente: c.tipo_cliente,
      permiso_pagos: c.permiso_pagos,
      permiso_cuotas: c.permiso_cuotas || 1,
      estado: c.estado
    });
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre || !form.email) return;
    if (!editar) {
      if (!form.contrasena) { alert("La contraseña es requerida"); return; }
      if (form.contrasena.length < 6) { alert("La contraseña debe tener al menos 6 caracteres"); return; }
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(form.contrasena)) { alert("La contraseña debe contener al menos un signo (símbolo)"); return; }
    } else {
      if (form.contrasena) {
        if (form.contrasena.length < 6) { alert("La contraseña debe tener al menos 6 caracteres"); return; }
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(form.contrasena)) { alert("La contraseña debe contener al menos un signo (símbolo)"); return; }
      }
    }
    if (!editar) {
      try { await api.post("/usuarios", form); cargar(); }
      catch (err) { console.error(err); }
      setModal(false); return;
    }
    try { await api.put(`/usuarios/${editar}`, form); cargar(); }
    catch (err) { console.error(err); }
    setModal(false);
  };

  const guardarCliente = async () => {
    if (!clienteForm.nombre || !clienteForm.documento) return;
    try {
      if (editar) {
        const { data } = await api.put(`/clientes/${editar}`, clienteForm);
        setClientes(prev => prev.map(c => c.id_cliente === editar ? { ...c, ...data } : c));
      } else {
        const { data } = await api.post("/clientes", clienteForm);
        setClientes(prev => [...prev, { ...data, barrio_nombre: "", comuna: "", ciudad: "Medellín" }]);
      }
      setModal(false);
    } catch (err) {
      console.error("Error guardando:", err);
      alert(err.response?.data?.message || "Error al guardar cliente");
    }
  };

  const cargar = () => {
    api.get("/usuarios").then(res => setUsuarios(res.data)).catch(err => console.error(err));
  };

  const toggleEstadoUsuario = async (id, nuevoEstado) => {
    await api.patch(`/usuarios/${id}/estado`);
    setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, estado: nuevoEstado } : u));
  };

  const toggleEstadoCliente = async (id, nuevoEstado) => {
    await api.patch(`/clientes/${id}/estado`);
    setClientes(prev => prev.map(c => c.id_cliente === id ? { ...c, estado: nuevoEstado } : c));
  };

  const togglePermisoCuotas = async (id) => {
    try {
      await api.patch(`/usuarios/${id}/permiso-cuotas`);
      setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, permiso_cuotas: !u.permiso_cuotas } : u));
    } catch (err) { console.error(err); alert("Error al cambiar permiso de cuotas"); }
  };

  const getRoleName = (id_rol) => roles.find(r => Number(r.id_rol) === Number(id_rol))?.nombre || id_rol;

  if (loading) return (<div className="usuarios-loading-container"><div className="usuarios-loading-spinner" /><p className="usuarios-loading-text">Cargando usuarios...</p></div>);

  // ── Pasos formulario ───────────────────────────────────────────────────────
  const PasosDocumento = (<div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Tipo doc. <span className="ms-req">*</span></label><select className="ms-form-select" value={form.tipo_doc} onChange={e => setForm({ ...form, tipo_doc: e.target.value })}>{TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="1001234567" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} /></div>
    </div>
    <div className="ms-form-group"><label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="Ej: Nicol Zapata" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
  </div>);

  const PasosCuenta = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label><input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
    <div className="ms-form-group"><label className="ms-form-label">Teléfono</label><input className="ms-form-input" placeholder="3001234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
    {(!editar || editar === usuario?.id_usuario) && (<div className="ms-form-group"><label className="ms-form-label">Contraseña {!editar && <span className="ms-req">*</span>}</label>
      <div className="input-wrapper">
        <span className="input-icon"><IconLock /></span>
        <input type={showPassword ? "text" : "password"} className="ms-form-input" placeholder={editar ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
          value={form.contrasena} onChange={e => setForm({ ...form, contrasena: e.target.value })} />
        <div className="input-bar" />
        <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? <IconEyeOpen /> : <IconEyeClosed />}
        </span>
      </div>
    </div>)}
  </div>);

  const PasosUbicacion = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" placeholder="Medellín" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></div>
    <div className="ms-form-group"><label className="ms-form-label">Barrio</label><select className="ms-form-select" value={form.id_barrio} onChange={e => setForm({ ...form, id_barrio: e.target.value })}><option value="">— Selecciona un barrio —</option>{barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} — {b.comuna}</option>)}</select></div>
    <div className="ms-form-group"><label className="ms-form-label">Dirección</label><input className="ms-form-input" placeholder="Cra 43A # 10-20 Apto 301" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
  </div>);

  const PasosRol = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Rol</label><select className="ms-form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>{roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}</select></div>
    <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={form.permiso_cuotas ? 1 : 0} onChange={e => setForm({ ...form, permiso_cuotas: Number(e.target.value) === 1 })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
    <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
  </div>);

  // ── Pasos detalle ──────────────────────────────────────────────────────────
  const detalleId = detalle ? `#${String(detalle.id_usuario).padStart(3, '0')}` : '';

  const DetalleCuenta = detalle && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="ID" value={detalleId} />
    <DetalleItem label="Email" value={detalle.email} />
    <DetalleItem label="Rol" value={detalle.rol || getRoleName(detalle.id_rol)} />
    <DetalleItem label="Estado" value={detalle.estado} />
    <DetalleItem label="Último acceso" value={fmtFecha(detalle.ultimo_acceso)} />
    <DetalleItem label="Fecha registro" value={fmtFecha(detalle.fecha_creacion)} />
    <DetalleItem label="Intentos fallidos" value={String(detalle.intentos_fallidos ?? 0)} />
  </DetalleGrid></DetalleSeccion>);

  const DetallePersonal = detalle && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="Tipo doc." value={detalle.tipo_doc} />
    <DetalleItem label="Documento" value={detalle.documento} />
    <DetalleItem label="Teléfono" value={detalle.telefono} />
  </DetalleGrid></DetalleSeccion>);

  const DetalleUbicacion = detalle && (<DetalleSeccion><DetalleGrid>
    <DetalleItem label="Ciudad" value={detalle.ciudad} />
    <DetalleItem label="Barrio" value={detalle.barrio ? `${detalle.barrio}${detalle.comuna ? ` — ${detalle.comuna}` : ''}` : null} />
    <DetalleItem label="Dirección" value={detalle.direccion} full />
  </DetalleGrid></DetalleSeccion>);

  return (
    <div className="usuarios-container">
      <div className="usuarios-actions-bar">
        <div className="usuarios-actions-left">
          <div className="usuarios-search-wrapper">
            <span className="usuarios-search-icon"><IconSearch /></span>
            <input
              type="text"
              className="usuarios-search-input"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaUsuarios(1); setPaginaClientes(1); }}
            />
            {busqueda && (
              <button className="usuarios-search-clear" onClick={() => { setBusqueda(""); setPaginaUsuarios(1); setPaginaClientes(1); }}>
                <IconX />
              </button>
            )}
          </div>
          <div className="usuarios-filter-toggle">
            <button
              className={`usuarios-filter-btn ${filterType === 'usuarios' ? 'active' : ''}`}
              onClick={() => { setFilterType('usuarios'); setPaginaUsuarios(1); }}
            >
              Usuarios
            </button>
            <button
              className={`usuarios-filter-btn ${filterType === 'clientes' ? 'active' : ''}`}
              onClick={() => { setFilterType('clientes'); setPaginaClientes(1); }}
            >
              Clientes
            </button>
          </div>
        </div>
        <button className="usuarios-btn-primary" onClick={filterType === 'usuarios' ? abrirRegistrar : abrirRegistrarCliente}>
          <span>+</span> Nuevo {filterType === 'usuarios' ? 'usuario' : 'cliente'}
        </button>
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            {filterType === 'usuarios' ? (
              <tr>
                <th className="tbl-th">Usuario</th>
                <th className="tbl-th">Email</th>
                <th className="tbl-th">Rol</th>
                <th className="tbl-th">Cuotas</th>
                <th className="tbl-th">Estado</th>
                <th className="tbl-th">Acciones</th>
              </tr>
            ) : (
              <tr>
                <th className="tbl-th">Cliente</th>
                <th className="tbl-th">Documento</th>
                <th className="tbl-th">Teléfono</th>
                <th className="tbl-th">Barrio</th>
                <th className="tbl-th">Tipo</th>
                <th className="tbl-th">Compras</th>
                <th className="tbl-th">Total</th>
                <th className="tbl-th">Estado</th>
                <th className="tbl-th">Acciones</th>
              </tr>
            )}
          </thead>
          <tbody className="tbl-body">
            {filterType === 'usuarios' ? (
              filtradosPagina.map((u) => (
                <tr key={u.id_usuario} className="tbl-row">
                  <td className="tbl-td"><div className="usuarios-user-info"><div className="usuarios-user-name">{u.nombre}</div></div></td>
                  <td className="tbl-td usuarios-email-cell">{u.email}</td>
                  <td className="tbl-td"><span className="tabla-rol">{u.rol || getRoleName(u.id_rol)}</span></td>
                  <td className="tbl-td"><span className={`tabla-status ${u.permiso_cuotas !== false ? "activo" : "inactivo"}`} onClick={() => togglePermisoCuotas(u.id_usuario)} style={{ cursor: 'pointer' }} title="Click para cambiar">{u.permiso_cuotas !== false ? "Sí" : "No"}</span></td>
                  <td className="tbl-td"><StatusToggle id={u.id_usuario} estado={u.estado} onToggle={toggleEstadoUsuario} showConfirmation={true} /></td>
                  <td className="tbl-td">
                    <div className="usuarios-action-cell">
                      <button className="usuarios-action-btn usuarios-view-btn" onClick={() => abrirDetalle(u)} title="Ver detalles"><IconEyeOpen /></button>
                      <button className="usuarios-action-btn usuarios-edit-btn" onClick={() => abrirEditar(u)} title="Editar"><IconEdit /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              filtradosPagina.map((c) => (
                <tr key={c.id_cliente} className="tbl-row">
                  <td className="tbl-td"><div className="clientes-user-info"><div className="clientes-user-name">{c.nombre}</div><div className="clientes-user-email">{c.email}</div></div></td>
                  <td className="tbl-td"><span className="clientes-doc-badge">{c.tipo_doc} {c.documento}</span></td>
                  <td className="tbl-td clientes-phone-cell">{c.telefono || '—'}</td>
                  <td className="tbl-td">{c.barrio_nombre ? <div><div className="clientes-barrio-name">{c.barrio_nombre}</div><div className="clientes-comuna-name">{c.comuna}</div></div> : <span className="clientes-empty">—</span>}</td>
                  <td className="tbl-td"><span className={`clientes-tipo-badge ${tipoBadge(c.tipo_cliente)}`}>{c.tipo_cliente}</span></td>
                  <td className="tbl-td">{c.total_compras || 0}</td>
                  <td className="tbl-td">${Number(c.total_gastado || 0).toLocaleString('es-CO')}</td>
                  <td className="tbl-td"><StatusToggle id={c.id_cliente} estado={c.estado} onToggle={toggleEstadoCliente} showConfirmation={true} /></td>
                  <td className="tbl-td">
                    <div className="clientes-action-cell">
                      <button className="clientes-action-btn clientes-view-btn" onClick={() => setClienteDetalle(c)} title="Ver detalles"><IconEyeOpen /></button>
                      <button className="clientes-action-btn clientes-edit-btn" onClick={() => abrirEditarCliente(c)} title="Editar"><IconEdit /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
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
              Página {pagina} de {totalPaginas} · {filtrados.length} registros
            </span>
          </div>
        )}

        <div className="print-button-container">
          <button className="btn-print" onClick={() => window.print()}>
            <IconPrint />
          </button>
        </div>
      </div>

      {modal && filterType === 'usuarios' && (
        <ModalSteps
          titulo={editar ? "Editar usuario" : "Nuevo usuario"}
          pasos={["Documento", "Cuenta", "Ubicación", "Rol"]}
          onClose={() => setModal(false)}
          onGuardar={guardar}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          {PasosDocumento}
          {PasosCuenta}
          {PasosUbicacion}
          {PasosRol}
        </ModalSteps>
      )}

      {modal && filterType === 'clientes' && (
        <ModalSteps
          titulo={editar ? "Editar cliente" : "Nuevo cliente"}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => setModal(false)}
          onGuardar={guardarCliente}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          <div className="ms-form-row">
            <div className="ms-form-group"><label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="Ej: Juan Pérez" value={clienteForm.nombre} onChange={e => setClienteForm({ ...clienteForm, nombre: e.target.value })} /></div>
            <div className="ms-form-group"><label className="ms-form-label">Tipo documento</label><select className="ms-form-select" value={clienteForm.tipo_doc} onChange={e => setClienteForm({ ...clienteForm, tipo_doc: e.target.value })}>{["CC", "CE", "TI", "NIT", "Pasaporte"].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="ms-form-row">
            <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="123456789" value={clienteForm.documento} onChange={e => setClienteForm({ ...clienteForm, documento: e.target.value })} /></div>
            <div className="ms-form-group"><label className="ms-form-label">Teléfono</label><input className="ms-form-input" placeholder="3001234567" value={clienteForm.telefono} onChange={e => setClienteForm({ ...clienteForm, telefono: e.target.value })} /></div>
          </div>
          <div className="ms-form-row">
            <div className="ms-form-group"><label className="ms-form-label">Correo electrónico</label><input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={clienteForm.email} onChange={e => setClienteForm({ ...clienteForm, email: e.target.value })} /></div>
          </div>
          <div className="ms-form-row">
            <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" value="Medellín" disabled style={{ opacity: 0.55 }} /></div>
            <div className="ms-form-group"><label className="ms-form-label">Zona / Área</label><select className="ms-form-select" onChange={e => handleZona(e.target.value)}><option value="">— Todas las zonas —</option>{zonas.map(z => <option key={z} value={z}>{z}</option>)}</select></div>
          </div>
          <div className="ms-form-group"><label className="ms-form-label">Barrio / Comuna</label><select className="ms-form-select" value={clienteForm.id_barrio} onChange={e => setClienteForm({ ...clienteForm, id_barrio: Number(e.target.value) })}><option value="">— Seleccionar —</option>{barFiltrados.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} — {b.comuna}</option>)}</select></div>
          <div className="ms-form-group"><label className="ms-form-label">Dirección completa</label><input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={clienteForm.direccion} onChange={e => setClienteForm({ ...clienteForm, direccion: e.target.value })} /></div>
          <div className="ms-form-row">
            <div className="ms-form-group"><label className="ms-form-label">Tipo de cliente</label><select className="ms-form-select" value={clienteForm.tipo_cliente} onChange={e => setClienteForm({ ...clienteForm, tipo_cliente: e.target.value })}>{["Regular", "VIP", "Mayorista", "Corporativo"].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="ms-form-group"><label className="ms-form-label">Permiso de pagos</label><select className="ms-form-select" value={clienteForm.permiso_pagos} onChange={e => setClienteForm({ ...clienteForm, permiso_pagos: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
          </div>
          <div className="ms-form-row">
            <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={clienteForm.permiso_cuotas} onChange={e => setClienteForm({ ...clienteForm, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
            <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={clienteForm.estado} onChange={e => setClienteForm({ ...clienteForm, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
          </div>
        </ModalSteps>
      )}

      {detalle && (
        <ModalDetalle
          titulo="Perfil del usuario"
          subtitulo={detalle.nombre}
          badge={<span className={`tabla-status ${detalle.estado === "Activo" ? "activo" : "inactivo"}`}>{detalle.estado}</span>}
          pasos={["Cuenta", "Datos personales", "Ubicación"]}
          onClose={() => setDetalle(null)}
          onEditar={() => { setDetalle(null); abrirEditar(detalle); }}
        >
          {DetalleCuenta}
          {DetallePersonal}
          {DetalleUbicacion}
        </ModalDetalle>
      )}

      {clienteDetalle && (
        <ModalDetalle
          titulo="Detalle del cliente"
          subtitulo={clienteDetalle.nombre}
          badge={<span className={`tabla-status ${clienteDetalle.estado === "Activo" ? "activo" : "inactivo"}`}>{clienteDetalle.estado}</span>}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => setClienteDetalle(null)}
          onEditar={() => { setClienteDetalle(null); abrirEditarCliente(clienteDetalle); }}
        >
          <DetalleSeccion><DetalleGrid>
            <DetalleItem label="ID" value={`#${String(clienteDetalle.id_cliente).padStart(3, '0')}`} />
            <DetalleItem label="Nombre" value={clienteDetalle.nombre} />
            <DetalleItem label="Tipo doc." value={clienteDetalle.tipo_doc} />
            <DetalleItem label="Documento" value={clienteDetalle.documento} />
            <DetalleItem label="Teléfono" value={clienteDetalle.telefono} />
            <DetalleItem label="Email" value={clienteDetalle.email} />
          </DetalleGrid></DetalleSeccion>

          <DetalleSeccion><DetalleGrid>
            <DetalleItem label="Ciudad" value={clienteDetalle.ciudad} />
            <DetalleItem label="Barrio" value={clienteDetalle.barrio_nombre ? `${clienteDetalle.barrio_nombre} (${clienteDetalle.comuna})` : null} />
            <DetalleItem label="Dirección" value={clienteDetalle.direccion} full />
          </DetalleGrid></DetalleSeccion>

          <DetalleSeccion><DetalleGrid>
            <DetalleItem label="Tipo cliente" value={clienteDetalle.tipo_cliente} />
            <DetalleItem label="Estado" value={clienteDetalle.estado} />
          </DetalleGrid></DetalleSeccion>
        </ModalDetalle>
      )}
    </div>
  );
}