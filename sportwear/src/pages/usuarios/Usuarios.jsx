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
const FILAS_POR_PAGINA = 10;

const normalizeM = (v) => v?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export default function Usuarios() {
  const { usuario } = useAuth();

  // ── Permisos del usuario actual ────────────────────────────────────────────
  const modulosUsuario = Array.isArray(usuario?.modulos) ? usuario.modulos.map(normalizeM) : [];
  const esAdmin       = usuario?.rol === 'Admin';
  const tieneUsuarios = esAdmin || modulosUsuario.includes('usuarios');
  const tieneClientes = esAdmin || modulosUsuario.includes('clientes');

  const [usuarios,       setUsuarios]       = useState([]);
  const [clientes,       setClientes]       = useState([]);
  const [roles,          setRoles]          = useState([]);
  const [barrios,        setBarrios]        = useState([]);
  const [zonas,          setZonas]          = useState([]);
  const [barFiltrados,   setBarFiltrados]   = useState([]);
  const [busqueda,       setBusqueda]       = useState("");
  const [modal,          setModal]          = useState(false);
  const [detalle,        setDetalle]        = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [editar,         setEditar]         = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showPassword,   setShowPassword]   = useState(false);
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [paginaClientes, setPaginaClientes] = useState(1);

  // filterType según permisos
  const [filterType, setFilterType] = useState(() =>
    tieneUsuarios ? 'usuarios' : 'clientes'
  );

  const [form, setForm] = useState({
    nombre: "", email: "", contrasena: "", id_rol: 1, estado: "Activo",
    tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín",
    id_barrio: "", direccion: "", permiso_cuotas: true
  });

  const [clienteForm, setClienteForm] = useState({
    nombre: "", tipo_doc: "CC", documento: "", telefono: "", email: "",
    id_barrio: "", direccion: "", tipo_cliente: "Regular",
    permiso_pagos: 1, permiso_cuotas: 1, estado: "Activo"
  });

  // ── Carga inicial ──────────────────────────────────────────────────────────
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

    api.get("/barrios/zonas").then(r => setZonas(r.data)).catch(console.error);
  }, [tieneUsuarios]);

  useEffect(() => {
    if (filterType === "clientes" && tieneClientes) {
      api.get("/clientes/con-ventas").then(r => setClientes(r.data)).catch(console.error);
    }
  }, [filterType, tieneClientes]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter(b => b.zona === zona) : barrios);
    setClienteForm(f => ({ ...f, id_barrio: "" }));
  };

  const tipoBadge = (tipo) => {
    const map = { VIP: "vip", Mayorista: "mayorista", Corporativo: "corporativo" };
    return map[tipo] || "regular";
  };

  const getRoleName = (id_rol) =>
    roles.find(r => Number(r.id_rol) === Number(id_rol))?.nombre || id_rol;

  // ── Filtrado ───────────────────────────────────────────────────────────────
  const filtrados = filterType === "usuarios"
    ? usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : clientes.filter(c =>
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.documento?.includes(busqueda)
      );

  const pagina       = filterType === "usuarios" ? paginaUsuarios : paginaClientes;
  const setPagina    = filterType === "usuarios" ? setPaginaUsuarios : setPaginaClientes;
  const totalPaginas = Math.ceil(filtrados.length / FILAS_POR_PAGINA);
  const filtradosPagina = filtrados.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  // ── Abrir modales ──────────────────────────────────────────────────────────
  const abrirDetalle = async (u) => {
    setDetalle(u);
    try { const { data } = await api.get(`/usuarios/${u.id_usuario}`); setDetalle(data); }
    catch { /* usa datos parciales */ }
  };

  const abrirRegistrar = () => {
    setEditar(null);
    setForm({ nombre: "", email: "", contrasena: "", id_rol: roles[0]?.id_rol || 1, estado: "Activo", tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín", id_barrio: "", direccion: "", permiso_cuotas: true });
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
    setClienteForm({ nombre: c.nombre, tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", id_barrio: c.id_barrio || "", direccion: c.direccion || "", tipo_cliente: c.tipo_cliente, permiso_pagos: c.permiso_pagos, permiso_cuotas: c.permiso_cuotas || 1, estado: c.estado });
    setModal(true);
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!form.nombre || !form.email) return;
    if (!editar) {
      if (!form.contrasena) { alert("La contraseña es requerida"); return; }
      if (form.contrasena.length < 6) { alert("Mínimo 6 caracteres"); return; }
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(form.contrasena)) { alert("Debe contener al menos un símbolo"); return; }
    } else if (form.contrasena) {
      if (form.contrasena.length < 6) { alert("Mínimo 6 caracteres"); return; }
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(form.contrasena)) { alert("Debe contener al menos un símbolo"); return; }
    }
    try {
      if (!editar) { await api.post("/usuarios", form); }
      else         { await api.put(`/usuarios/${editar}`, form); }
      cargar();
      setModal(false);
    } catch (err) { console.error(err); }
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
      alert(err.response?.data?.message || "Error al guardar cliente");
    }
  };

  const cargar = () => {
    if (tieneUsuarios) api.get("/usuarios").then(r => setUsuarios(r.data)).catch(console.error);
  };

  // ── Acciones rápidas ───────────────────────────────────────────────────────
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
}     catch { alert("Error al cambiar permiso de cuotas"); }  };

  if (loading) return (
    <div className="usuarios-loading-container">
      <div className="usuarios-loading-spinner" />
      <p className="usuarios-loading-text">Cargando usuarios...</p>
    </div>
  );

  // ── Pasos formulario usuarios ──────────────────────────────────────────────
  const PasosDocumento = (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group"><label className="ms-form-label">Tipo doc. <span className="ms-req">*</span></label><select className="ms-form-select" value={form.tipo_doc} onChange={e => setForm({ ...form, tipo_doc: e.target.value })}>{TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="1001234567" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} /></div>
      </div>
      <div className="ms-form-group"><label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="Ej: Nicol Zapata" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
    </div>
  );

  const PasosCuenta = (
    <div>
      <div className="ms-form-group"><label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label><input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      <div className="ms-form-group"><label className="ms-form-label">Teléfono</label><input className="ms-form-input" placeholder="3001234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
      {(!editar || editar === usuario?.id_usuario) && (
        <div className="ms-form-group">
          <label className="ms-form-label">Contraseña {!editar && <span className="ms-req">*</span>}</label>
          <div className="input-wrapper">
            <span className="input-icon"><IconLock /></span>
            <input type={showPassword ? "text" : "password"} className="ms-form-input" placeholder={editar ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"} value={form.contrasena} onChange={e => setForm({ ...form, contrasena: e.target.value })} />
            <div className="input-bar" />
            <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <IconEyeOpen /> : <IconEyeClosed />}</span>
          </div>
        </div>
      )}
    </div>
  );

  const PasosUbicacion = (
    <div>
      <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" placeholder="Medellín" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></div>
      <div className="ms-form-group"><label className="ms-form-label">Barrio</label><select className="ms-form-select" value={form.id_barrio} onChange={e => setForm({ ...form, id_barrio: e.target.value })}><option value="">— Selecciona un barrio —</option>{barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} — {b.comuna}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">Dirección</label><input className="ms-form-input" placeholder="Cra 43A # 10-20 Apto 301" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
    </div>
  );

  const PasosRol = (
    <div>
      <div className="ms-form-group"><label className="ms-form-label">Rol</label><select className="ms-form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>{roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={form.permiso_cuotas ? 1 : 0} onChange={e => setForm({ ...form, permiso_cuotas: Number(e.target.value) === 1 })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
      <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
    </div>
  );

  // ── Pasos detalle usuario ──────────────────────────────────────────────────
  const DetalleDocumento  = detalle && (<DetalleSeccion><DetalleGrid><DetalleItem label="Tipo doc." value={detalle.tipo_doc} /><DetalleItem label="Documento" value={detalle.documento} /><DetalleItem label="Nombre completo" value={detalle.nombre} full /></DetalleGrid></DetalleSeccion>);
  const DetalleCuenta     = detalle && (<DetalleSeccion><DetalleGrid><DetalleItem label="Correo electrónico" value={detalle.email} /><DetalleItem label="Teléfono" value={detalle.telefono} /></DetalleGrid></DetalleSeccion>);
  const DetalleUbicacion  = detalle && (<DetalleSeccion><DetalleGrid><DetalleItem label="Ciudad" value={detalle.ciudad} /><DetalleItem label="Barrio" value={detalle.barrio ? `${detalle.barrio}${detalle.comuna ? ` — ${detalle.comuna}` : ''}` : null} /><DetalleItem label="Dirección" value={detalle.direccion} full /></DetalleGrid></DetalleSeccion>);
  const DetalleRol        = detalle && (<DetalleSeccion><DetalleGrid><DetalleItem label="Rol" value={detalle.rol || getRoleName(detalle.id_rol)} /><DetalleItem label="Pago por cuotas" value={detalle.permiso_cuotas !== false ? "Permitido" : "Bloqueado"} /><DetalleItem label="Estado" value={detalle.estado} /></DetalleGrid></DetalleSeccion>);

  // ── Render ─────────────────────────────────────────────────────────────────
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
              onChange={e => { setBusqueda(e.target.value); setPaginaUsuarios(1); setPaginaClientes(1); }}
            />
            {busqueda && (
              <button className="usuarios-search-clear" onClick={() => { setBusqueda(""); setPaginaUsuarios(1); setPaginaClientes(1); }}>
                <IconX />
              </button>
            )}
          </div>

          {/* Toggle solo si tiene ambos módulos */}
          {tieneUsuarios && tieneClientes && (
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
          )}
        </div>

        <button
          className="usuarios-btn-primary"
          onClick={filterType === 'usuarios' ? abrirRegistrar : abrirRegistrarCliente}
        >
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
              filtradosPagina.map(u => (
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
              filtradosPagina.map(c => (
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

        <div className="print-button-container">
          <button className="btn-print" onClick={() => window.print()}><IconPrint /></button>
        </div>
      </div>

      {/* Modal formulario usuarios */}
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

      {/* Modal formulario clientes */}
      {modal && filterType === 'clientes' && (
        <ModalSteps
          titulo={editar ? "Editar cliente" : "Nuevo cliente"}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => setModal(false)}
          onGuardar={guardarCliente}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          <div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="Ej: Juan Pérez" value={clienteForm.nombre} onChange={e => setClienteForm({ ...clienteForm, nombre: e.target.value })} /></div>
              <div className="ms-form-group"><label className="ms-form-label">Tipo documento</label><select className="ms-form-select" value={clienteForm.tipo_doc} onChange={e => setClienteForm({ ...clienteForm, tipo_doc: e.target.value })}>{["CC", "CE", "TI", "NIT", "Pasaporte"].map(t => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="123456789" value={clienteForm.documento} onChange={e => setClienteForm({ ...clienteForm, documento: e.target.value })} /></div>
              <div className="ms-form-group"><label className="ms-form-label">Teléfono</label><input className="ms-form-input" placeholder="3001234567" value={clienteForm.telefono} onChange={e => setClienteForm({ ...clienteForm, telefono: e.target.value })} /></div>
            </div>
            <div className="ms-form-group"><label className="ms-form-label">Correo electrónico</label><input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={clienteForm.email} onChange={e => setClienteForm({ ...clienteForm, email: e.target.value })} /></div>
          </div>
          <div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" value="Medellín" disabled style={{ opacity: 0.55 }} /></div>
              <div className="ms-form-group"><label className="ms-form-label">Zona / Área</label><select className="ms-form-select" onChange={e => handleZona(e.target.value)}><option value="">— Todas las zonas —</option>{zonas.map(z => <option key={z} value={z}>{z}</option>)}</select></div>
            </div>
            <div className="ms-form-group"><label className="ms-form-label">Barrio / Comuna</label><select className="ms-form-select" value={clienteForm.id_barrio} onChange={e => setClienteForm({ ...clienteForm, id_barrio: Number(e.target.value) })}><option value="">— Seleccionar —</option>{barFiltrados.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre} — {b.comuna}</option>)}</select></div>
            <div className="ms-form-group"><label className="ms-form-label">Dirección completa</label><input className="ms-form-input" placeholder="Cra 70 # 48-15 Apto 201" value={clienteForm.direccion} onChange={e => setClienteForm({ ...clienteForm, direccion: e.target.value })} /></div>
          </div>
          <div>
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

      {/* Modal detalle usuario */}
      {detalle && (
        <ModalDetalle
          titulo="Perfil del usuario"
          subtitulo={detalle.nombre}
          badge={<span className={`tabla-status ${detalle.estado === "Activo" ? "activo" : "inactivo"}`}>{detalle.estado}</span>}
          pasos={["Documento", "Cuenta", "Ubicación", "Rol"]}
          onClose={() => setDetalle(null)}
          onEditar={() => { setDetalle(null); abrirEditar(detalle); }}
        >
          {DetalleDocumento}
          {DetalleCuenta}
          {DetalleUbicacion}
          {DetalleRol}
        </ModalDetalle>
      )}

      {/* Modal detalle cliente */}
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
            <DetalleItem label="Nombre completo"    value={clienteDetalle.nombre} full />
            <DetalleItem label="Tipo documento"     value={clienteDetalle.tipo_doc} />
            <DetalleItem label="N° documento"       value={clienteDetalle.documento} />
            <DetalleItem label="Teléfono"           value={clienteDetalle.telefono} />
            <DetalleItem label="Correo electrónico" value={clienteDetalle.email} />
          </DetalleGrid></DetalleSeccion>
          <DetalleSeccion><DetalleGrid>
            <DetalleItem label="Ciudad"             value={clienteDetalle.ciudad} />
            <DetalleItem label="Barrio"             value={clienteDetalle.barrio_nombre ? `${clienteDetalle.barrio_nombre} (${clienteDetalle.comuna})` : null} />
            <DetalleItem label="Dirección completa" value={clienteDetalle.direccion} full />
          </DetalleGrid></DetalleSeccion>
          <DetalleSeccion><DetalleGrid>
            <DetalleItem label="Tipo de cliente"  value={clienteDetalle.tipo_cliente} />
            <DetalleItem label="Permiso de pagos" value={clienteDetalle.permiso_pagos ? "Permitido" : "Bloqueado"} />
            <DetalleItem label="Pago por cuotas"  value={clienteDetalle.permiso_cuotas ? "Permitido" : "Bloqueado"} />
            <DetalleItem label="Estado"           value={clienteDetalle.estado} />
          </DetalleGrid></DetalleSeccion>
        </ModalDetalle>
      )}
    </div>
  );
}