// src/pages/usuarios/Usuarios.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import './Usuarios.css';
import { IconBan, IconCheck, IconEdit, IconEye, IconSearch, IconX } from "../../components/Icons";

const TIPOS_DOC = ["CC", "CE", "TI", "NIT", "PP"];

const fmtFecha = (f) => f ? new Date(f).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;

export default function Usuarios() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState([]);
  const [roles, setRoles] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [editar, setEditar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: "", email: "", contrasena: "", id_rol: 1, estado: "Activo", tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín", id_barrio: "", direccion: "", permiso_cuotas: true });

  useEffect(() => {
    Promise.all([
      api.get("/usuarios"),
      api.get("/roles"),
      api.get("/barrios")
    ]).then(([usuariosRes, rolesRes, barriosRes]) => {
      setDatos(usuariosRes.data);
      setRoles(rolesRes.data);
      setBarrios(barriosRes.data);
    }).catch(err => console.error(err)).finally(() => setLoading(false));
  }, []);

  const filtrados = datos.filter((u) =>
    u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

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

  const guardar = async () => {
    if (!form.nombre || !form.email) return;
    if (!editar) {
      try { await api.post("/usuarios", form); cargar(); }
      catch (err) { console.error(err); }
      setModal(false); return;
    }
    try { await api.put(`/usuarios/${editar}`, form); cargar(); }
    catch (err) { console.error(err); }
    setModal(false);
  };

  const cambiarEstado = async (id) => {
    try { await api.patch(`/usuarios/${id}/estado`); cargar(); } catch (err) { console.error(err); }
  };

  const togglePermisoCuotas = async (id) => {
    try {
      await api.patch(`/usuarios/${id}/permiso-cuotas`);
      setDatos(prev => prev.map(u => u.id_usuario === id ? { ...u, permiso_cuotas: u.permiso_cuotas ? false : true } : u));
    } catch (err) { console.error(err); alert("Error al cambiar permiso de cuotas"); }
  };

  const getRoleName = (id_rol) => roles.find(r => Number(r.id_rol) === Number(id_rol))?.nombre || id_rol;

  if (loading) return (<div className="usuarios-loading-container"><div className="usuarios-loading-spinner" /><p className="usuarios-loading-text">Cargando usuarios...</p></div>);

  // ── Pasos formulario ───────────────────────────────────────────────────────
  const PasosCuenta = (<div>
    <div className="ms-form-group"><label className="ms-form-label">Nombre completo <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="Ej: Nicol Zapata" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
    <div className="ms-form-group"><label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label><input type="email" className="ms-form-input" placeholder="ejemplo@correo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
    {(!editar || editar === usuario?.id_usuario) && (<div className="ms-form-group"><label className="ms-form-label">Contraseña {!editar && <span className="ms-req">*</span>}</label><input type="password" className="ms-form-input" placeholder={editar ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"} value={form.contrasena} onChange={e => setForm({ ...form, contrasena: e.target.value })} /></div>)}
  </div>);

  const PasosDocumento = (<div>
    <div className="ms-form-row">
      <div className="ms-form-group"><label className="ms-form-label">Tipo doc. <span className="ms-req">*</span></label><select className="ms-form-select" value={form.tipo_doc} onChange={e => setForm({ ...form, tipo_doc: e.target.value })}>{TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
      <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className="ms-form-input" placeholder="1001234567" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} /></div>
    </div>
    <div className="ms-form-group"><label className="ms-form-label">Teléfono</label><input className="ms-form-input" placeholder="3001234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
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
  const detalleId = detalle ? `#${String(detalle.id_usuario).padStart(3,'0')}` : '';

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
        <div className="usuarios-search-wrapper">
          <span className="usuarios-search-icon"><IconSearch /></span>
          <input type="text" className="usuarios-search-input" placeholder="Buscar por nombre o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {busqueda && <button className="usuarios-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
        </div>
        <button className="usuarios-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo usuario</button>
      </div>

      <div className="usuarios-results-count">{filtrados.length} usuario{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}</div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr><th className="tbl-th">Usuario</th><th className="tbl-th">Email</th><th className="tbl-th">Rol</th><th className="tbl-th">Cuotas</th><th className="tbl-th">Estado</th><th className="tbl-th">Acciones</th></tr>
          </thead>
          <tbody className="tbl-body">
            {filtrados.map((u) => (
              <tr key={u.id_usuario} className="tbl-row">
                <td className="tbl-td">
                  <div className="usuarios-user-cell">
                    <div className="usuarios-user-avatar">{u.nombre[0].toUpperCase()}</div>
                    <div className="usuarios-user-info">
                      <div className="usuarios-user-name">{u.nombre}</div>
                    </div>
                  </div>
                </td>
                <td className="tbl-td usuarios-email-cell">{u.email}</td>
                <td className="tbl-td"><span className="usuarios-role-badge">{u.rol || getRoleName(u.id_rol)}</span></td>
                <td className="tbl-td"><span className={`usuarios-status-badge ${u.permiso_cuotas !== false ? "active" : "inactive"}`} onClick={() => togglePermisoCuotas(u.id_usuario)} style={{ cursor: 'pointer' }} title="Click para cambiar">{u.permiso_cuotas !== false ? "Sí" : "No"}</span></td>
                <td className="tbl-td"><span className={`usuarios-status-badge ${u.estado === "Activo" ? "active" : "inactive"}`}>{u.estado}</span></td>
                <td className="tbl-td">
                  <div className="usuarios-action-cell">
                    <button className="usuarios-action-btn usuarios-view-btn" onClick={() => abrirDetalle(u)} title="Ver detalles"><IconEye /></button>
                    <button className="usuarios-action-btn usuarios-edit-btn" onClick={() => abrirEditar(u)} title="Editar"><IconEdit /></button>
                    <button className={`usuarios-action-btn ${u.estado === "Activo" ? "usuarios-deactivate-btn" : "usuarios-activate-btn"}`} onClick={() => cambiarEstado(u.id_usuario)} title={u.estado === "Activo" ? "Desactivar" : "Activar"}>{u.estado === "Activo" ? <IconBan /> : <IconCheck />}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (<ModalSteps titulo={editar ? "Editar usuario" : "Nuevo usuario"} pasos={["Cuenta", "Documento", "Ubicación", "Rol"]} onClose={() => setModal(false)} onGuardar={guardar} labelGuardar={editar ? "Actualizar" : "Registrar"}>{PasosCuenta}{PasosDocumento}{PasosUbicacion}{PasosRol}</ModalSteps>)}

      {detalle && (
        <ModalDetalle
          titulo="Perfil del usuario"
          subtitulo={detalle.nombre}
          avatar={detalle.nombre?.[0]?.toUpperCase()}
          badge={<span className={`usuarios-status-badge ${detalle.estado === "Activo" ? "active" : "inactive"}`}>{detalle.estado}</span>}
          pasos={["Cuenta", "Datos personales", "Ubicación"]}
          onClose={() => setDetalle(null)}
          onEditar={() => { setDetalle(null); abrirEditar(detalle); }}
        >
          {DetalleCuenta}
          {DetallePersonal}
          {DetalleUbicacion}
        </ModalDetalle>
      )}
    </div>
  );
}