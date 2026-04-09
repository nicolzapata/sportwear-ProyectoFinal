// src/pages/roles/Roles.jsx
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import './Roles.css';
import { IconEdit, IconCheck, IconBan, IconX, IconSearch } from "../../components/Icons";

const ROLE_ICONS = {
  administrador: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7"/><path d="M9 11.5L6 14l1.5 1.5"/><path d="M15 11.5L18 14l-1.5 1.5"/></svg>),
  cliente: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7"/><path d="M16 3l2 2-5 5"/></svg>),
  bodeguero: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14M5 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/><path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M10 12v4m4-4v4"/></svg>),
  vendedor: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>),
};
const DEFAULT_ICON = (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-7 7-7s7 3 7 7"/></svg>);
const PALETAS = ['#f5ede6','#f0ebe4','#e8f0e8','#ede8f5','#f5f0e0','#e8f0f5'];
const MODULOS = ["Dashboard","Usuarios","Roles","Clientes","Productos","Catálogo","Proveedores","Compras","Pedidos","Pagos","Promociones","Configuración"];

// ── Protección del rol Administrador ──────────────────────────────────────
const esRolProtegido = (nombre = "") => {
  const n = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return n === "administrador" || n === "admin";
};

function getRoleIcon(nombre) {
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  return ROLE_ICONS[key] || DEFAULT_ICON;
}

// ── Card solo frente — al click abre el ModalDetalle ──────────────────────
function RoleCard({ rol, index, onVerDetalle }) {
  const color      = PALETAS[index % PALETAS.length];
  const textColor  = 'rgba(26,26,26,0.75)';
  const textMuted  = 'rgba(26,26,26,0.38)';
  const iconBg     = 'rgba(255,255,255,0.45)';
  const iconBorder = 'rgba(26,26,26,0.15)';
  const nameBg     = 'rgba(255,255,255,0.35)';
  const icon       = getRoleIcon(rol.nombre);
  const protegido  = esRolProtegido(rol.nombre);

  return (
    <div className="role-scene" onClick={() => onVerDetalle(rol)}>
      <div className="role-card">
        <div className="role-face role-front">
          <div className="role-front-bg" style={{ background: color }} />
          <div className="role-front-content">
            <div className="role-front-icon" style={{ color: textColor, background: iconBg, border: `1.5px solid ${iconBorder}` }}>
              {icon}
            </div>
            <span className="role-front-name" style={{ color: textColor, background: nameBg }}>{rol.nombre}</span>
            {protegido ? (
              <span className="role-front-hint" style={{ color: textMuted, display:'flex', alignItems:'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                protegido
              </span>
            ) : (
              <span className="role-front-hint" style={{ color: textMuted }}>ver detalle</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Roles() {
  const [datos,    setDatos]    = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editar,   setEditar]   = useState(null);
  const [detalle,  setDetalle]  = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "", estado: "Activo", nivel_acceso: "Editor", permisos: [] });
  const [errores, setErrores] = useState({});
  const [confirm, setConfirm] = useState(null);

  const filtrados = datos.filter(r =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (r.descripcion && r.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const cargar = async () => {
    try { const { data } = await api.get("/roles"); setDatos(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
  useEffect(() => { cargar(); }, []);

  const abrirDetalle = async (rol) => {
    setDetalle(rol);
    setPermisos([]);
    try { const { data } = await api.get(`/roles/${rol.id_rol}/permisos`); setPermisos(data); }
    catch (err) { console.error(err); }
  };

  const abrirRegistrar = () => {
    setEditar(null);
    setForm({ nombre:"", descripcion:"", estado:"Activo", nivel_acceso:"Editor", permisos:[] });
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (r) => {
    if (esRolProtegido(r.nombre)) return; // protección capa lógica
    setEditar(r.id_rol);
    setForm({ nombre:r.nombre, descripcion:r.descripcion, estado:r.estado, nivel_acceso:r.nivel_acceso||"Editor", permisos:r.permisos||[] });
    setErrores({});
    setModal(true);
  };

  const togglePermiso = (modulo) => {
    const ya = form.permisos.includes(modulo);
    setForm({ ...form, permisos: ya ? form.permisos.filter(p=>p!==modulo) : [...form.permisos, modulo] });
    if (errores.permisos) setErrores({ ...errores, permisos:'' });
  };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim())        e.nombre      = "El nombre es obligatorio";
    if (!form.descripcion.trim())   e.descripcion = "La descripción es obligatoria";
    if (form.permisos.length === 0) e.permisos    = "Selecciona al menos un módulo";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    try {
      if (editar) await api.put(`/roles/${editar}`, form);
      else        await api.post("/roles", form);
      setModal(false); cargar();
    } catch (err) { console.error(err); }
  };

  const solicitarCambioEstado = async (rol) => {
    if (esRolProtegido(rol.nombre)) return; // protección capa lógica
    if (rol.estado === 'Inactivo') {
      try { await api.patch(`/roles/${rol.id_rol}/estado`); cargar(); }
      catch (err) { console.error(err); }
      return;
    }
    setConfirm({ rol, usuariosCount: null });
    try { const { data } = await api.get(`/roles/${rol.id_rol}/usuarios-count`); setConfirm({ rol, usuariosCount: data.total }); }
    catch { setConfirm({ rol, usuariosCount: 0 }); }
  };

  const confirmarCambioEstado = async () => {
    if (!confirm) return;
    try { await api.patch(`/roles/${confirm.rol.id_rol}/estado`); setConfirm(null); cargar(); }
    catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="roles-loading-container">
      <div className="roles-loading-spinner"/>
      <p className="roles-loading-text">Cargando roles...</p>
    </div>
  );

  // ── Pasos formulario ───────────────────────────────────────────────────────
  const PasoInfo = (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Nombre del rol <span className="ms-req">*</span></label>
          <input type="text" className={`ms-form-input${errores.nombre?' error':''}`} placeholder="Ej: Administrador" value={form.nombre}
            onChange={e => { setForm({ ...form, nombre: e.target.value }); if (errores.nombre) setErrores({ ...errores, nombre:'' }); }} />
          {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Nivel de acceso</label>
          <select className="ms-form-select" value={form.nivel_acceso} onChange={e => setForm({ ...form, nivel_acceso: e.target.value })}>
            <option value="Admin">Admin</option>
            <option value="Editor">Editor</option>
            <option value="Observador">Observador</option>
          </select>
        </div>
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">Descripción <span className="ms-req">*</span></label>
        <input type="text" className={`ms-form-input${errores.descripcion?' error':''}`} placeholder="Ej: Acceso total al sistema" value={form.descripcion}
          onChange={e => { setForm({ ...form, descripcion: e.target.value }); if (errores.descripcion) setErrores({ ...errores, descripcion:'' }); }} />
        {errores.descripcion && <span className="ms-form-error">{errores.descripcion}</span>}
      </div>
    </div>
  );

  const PasoPermisos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Módulos con acceso <span className="ms-req">*</span></label>
        <p className="ms-form-hint" style={{ marginBottom:10 }}>Selecciona los módulos a los que tendrá acceso este rol.</p>
        <div className="roles-permisos-grid">
          {MODULOS.map(m => (
            <button key={m} type="button" className={`roles-permiso-chip${form.permisos.includes(m)?' selected':''}`} onClick={() => togglePermiso(m)}>{m}</button>
          ))}
        </div>
        {errores.permisos && <span className="ms-form-error" style={{ marginTop:8, display:'block' }}>{errores.permisos}</span>}
      </div>
    </div>
  );

  // ── Contenido modal detalle ────────────────────────────────────────────────
  const modulosDelRol = detalle ? [...new Set(permisos.map(p => p.modulo))] : [];
  const rolIndex  = detalle ? datos.findIndex(r => r.id_rol === detalle.id_rol) : 0;
  const rolColor  = PALETAS[rolIndex % PALETAS.length];
  const protegido = detalle ? esRolProtegido(detalle.nombre) : false;
  function getRoleIcon(nombre) {
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  return ROLE_ICONS[key] || DEFAULT_ICON;
}

  const DetalleInfo = detalle && (
    <DetalleSeccion>
      <DetalleGrid>
        <DetalleItem label="Nombre"          value={detalle.nombre} />
        <DetalleItem label="Nivel de acceso" value={detalle.nivel_acceso || "No definido"} />
        <DetalleItem label="Estado"          value={detalle.estado} />
        <DetalleItem label="Descripción"     value={detalle.descripcion} full />
      </DetalleGrid>
      {protegido && (
        <div className="roles-protected-notice">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Este rol es protegido del sistema y no puede editarse ni desactivarse.
        </div>
      )}
    </DetalleSeccion>
  );

  const DetallePermisos = detalle && (
    <DetalleSeccion>
      {modulosDelRol.length > 0 ? (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {modulosDelRol.map(m => (
            <span key={m} style={{ display:"inline-block", padding:"4px 12px", borderRadius:20, fontSize:11, fontFamily:"var(--font-body, inherit)", background: rolColor+"33", border:`1px solid ${rolColor}`, color:"var(--dvna-charcoal, #1a1a1a)" }}>{m}</span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize:13, color:"var(--dvna-muted, #999)", fontStyle:"italic", margin:0 }}>
          {permisos.length === 0 ? "Cargando permisos..." : "Sin módulos asignados"}
        </p>
      )}
    </DetalleSeccion>
  );

  return (
    <div className="roles-container">
      <div className="roles-search-bar">
        <div className="roles-search-wrapper">
          <span className="roles-search-icon"><IconSearch /></span>
          <input type="text" className="roles-search-input" placeholder="Buscar rol..." value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)} />
          {busqueda && <button className="roles-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
        </div>
        {busqueda && <span className="roles-search-count">{filtrados.length} resultado{filtrados.length!==1?'s':''}</span>}
      </div>

      <div className="roles-grid">
        {filtrados.map((r, i) => (
          <RoleCard key={r.id_rol} rol={r} index={i} onVerDetalle={abrirDetalle} />
        ))}
        <div className="role-scene">
          <div className="role-add-card" onClick={abrirRegistrar}>
            <div className="role-add-icon">+</div>
            <span className="role-add-label">Nuevo rol</span>
          </div>
        </div>
      </div>

      {/* ── Modal confirmación desactivar ── */}
      {confirm && createPortal(
        <div className="roles-modal-overlay" onClick={() => setConfirm(null)}>
          <div className="roles-modal roles-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="roles-modal-accent" style={{ background:'#b83232' }} />
            <div className="roles-modal-header">
              <div>
                <h2 className="roles-modal-title">Desactivar rol</h2>
                <p className="roles-modal-subtitle">Esta acción afectará a los usuarios asignados</p>
              </div>
              <button className="roles-modal-close" onClick={() => setConfirm(null)}><IconX /></button>
            </div>
            <div className="roles-modal-body">
              <div className="roles-confirm-info">
                <div className="roles-confirm-rol">
                  <div className="roles-confirm-icon" style={{ background:PALETAS[datos.findIndex(r=>r.id_rol===confirm.rol.id_rol)%PALETAS.length]+'22', borderColor:PALETAS[datos.findIndex(r=>r.id_rol===confirm.rol.id_rol)%PALETAS.length] }}>
                    {getRoleIcon(confirm.rol.nombre)}
                  </div>
                  <span className="roles-confirm-nombre">{confirm.rol.nombre}</span>
                </div>
                {confirm.usuariosCount === null ? (
                  <div className="roles-confirm-safe"><span style={{ color:'var(--dvna-muted)' }}>Verificando usuarios afectados...</span></div>
                ) : confirm.usuariosCount > 0 ? (
                  <div className="roles-confirm-warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span><strong>{confirm.usuariosCount} usuario{confirm.usuariosCount!==1?'s':''}</strong> con este rol {confirm.usuariosCount!==1?'quedarán':'quedará'} bloqueado{confirm.usuariosCount!==1?'s':''}.</span>
                  </div>
                ) : (
                  <div className="roles-confirm-safe">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span>Ningún usuario tiene este rol asignado actualmente.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="roles-modal-footer">
              <button className="roles-btn-secondary" onClick={() => setConfirm(null)}>Cancelar</button>
              <button className="roles-btn-danger" onClick={confirmarCambioEstado}>Sí, desactivar</button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ── Modal edición por pasos ── */}
      {modal && (
        <ModalSteps
          titulo={editar ? "Editar rol" : "Nuevo rol"}
          pasos={["Información","Permisos"]}
          onClose={() => setModal(false)}
          onGuardar={guardar}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          {PasoInfo}
          {PasoPermisos}
        </ModalSteps>
      )}

      {/* ── Modal detalle ── */}
      {detalle && (
        <ModalDetalle
          titulo="Detalle del rol"
          subtitulo={detalle.nombre}
          avatar={<span style={{ width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>{getRoleIcon(detalle.nombre)}</span>}
          avatarColor={rolColor}
          badge={<span className={`role-status ${detalle.estado==='Activo'?'status-active':'status-inactive'}`}>{detalle.estado}</span>}
          pasos={["Información", "Módulos y permisos"]}
          onClose={() => setDetalle(null)}
          // Si el rol es protegido, NO se pasan estas props → los botones no se renderizan
          onEditar={protegido ? undefined : () => { setDetalle(null); abrirEditar(detalle); }}
          onCambiarEstado={protegido ? undefined : () => { setDetalle(null); solicitarCambioEstado(detalle); }}
        >
          {DetalleInfo}
          {DetallePermisos}
        </ModalDetalle>
      )}
    </div>
  );
}