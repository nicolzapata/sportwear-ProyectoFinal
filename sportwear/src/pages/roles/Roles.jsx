// src/pages/roles/Roles.jsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";  // ← AGREGAR
import { MAX_LONGITUD_NOMBRE } from "../../utils/numerico";
import Loader from "../../components/Loader";
import Toast from "../../components/Toast";
import './Roles.css';
import { IconX, IconSearch } from "../../components/Icons";

// ── Iconos por rol ────────────────────────────────────────────────────────────
const ROLE_ICONS = {
  administrador: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5 20c0-4 3-7 7-7s7 3 7 7"/>
      <path d="M9 11.5L6 14l1.5 1.5"/><path d="M15 11.5L18 14l-1.5 1.5"/>
    </svg>
  ),
  cliente: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5"/>
      <path d="M5 20c0-4 3-7 7-7s7 3 7 7"/>
      <path d="M16 3l2 2-5 5"/>
    </svg>
  ),
  bodeguero: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14M5 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
      <path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M10 12v4m4-4v4"/>
    </svg>
  ),
  vendedor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
};

const DEFAULT_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5"/>
    <path d="M5 20c0-4 3-7 7-7s7 3 7 7"/>
  </svg>
);

const PALETAS = ['#f5ede6', '#f0ebe4', '#e8f0e8', '#ede8f5', '#f5f0e0', '#e8f0f5'];

const MODULOS_FALLBACK = [
  "Dashboard", "Usuarios", "Clientes", "Roles", "Productos", "Categorias", "Colores", "Proveedores", "Compras", "Pedidos", "Ventas", "Pagos",
];

const esRolProtegido = (nombre = "") => {
  const n = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return n === "administrador" || n === "admin";
};

// La acción "estado" (activar/desactivar) se confunde fácilmente con el
// campo "Estado" (Activo/Inactivo) del rol, así que se muestra con una
// etiqueta más clara sin tocar el nombre real de la acción en el backend.
const ACCION_LABELS = { ver: "Ver", crear: "Crear", editar: "Editar", estado: "Cambiar estado" };
const labelAccion = (accion = "") => ACCION_LABELS[accion] || accion;

const validarNombreRol = (valor) => {
  const texto = (valor ?? "").trim();
  if (!texto) return "El nombre es obligatorio";
  if (texto.length > MAX_LONGITUD_NOMBRE) return `No puede tener m\u00e1s de ${MAX_LONGITUD_NOMBRE} caracteres.`;
  return "";
};

const getRoleIcon = (nombre = "") => {
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return ROLE_ICONS[key] || DEFAULT_ICON;
};

const normalizeModulo = (value) =>
  value?.toString?.().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const mergeModulos = (backendModulos) => {
  const raw = Array.isArray(backendModulos)
    ? backendModulos.map((m) => {
        if (typeof m === 'string') return m.trim();
        if (m && typeof m === 'object') return (m.modulo || m.nombre || '').trim();
        return '';
      }).filter(Boolean)
    : [];

  const allowed = new Set(MODULOS_FALLBACK.map((modulo) => normalizeModulo(modulo)));
  const seen = new Set();
  const result = [];

  const pushIfNew = (modulo) => {
    const key = normalizeModulo(modulo);
    if (!key || seen.has(key) || !allowed.has(key)) return;
    seen.add(key);
    result.push(modulo);
  };

  MODULOS_FALLBACK.forEach((modulo) => {
    if (raw.length === 0 || raw.some((item) => normalizeModulo(item) === normalizeModulo(modulo))) {
      pushIfNew(modulo);
    }
  });
  raw.forEach((modulo) => pushIfNew(modulo));
  MODULOS_FALLBACK.forEach((modulo) => pushIfNew(modulo));

  return result;
};

// ── RoleCard ──────────────────────────────────────────────────────────────────
const formatFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

function RoleCard({ rol, index, onEditar, onCambiarEstado, puedeEditar, puedeEstado }) {
  const [flipped,         setFlipped]         = useState(false);
  const [permisos,        setPermisos]        = useState([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState([]);
  const [loadingDetalle,  setLoadingDetalle]  = useState(false);
  const [detalleLoaded,   setDetalleLoaded]   = useState(false);

  const color     = PALETAS[index % PALETAS.length];
  const icon      = getRoleIcon(rol.nombre);
  const protegido = esRolProtegido(rol.nombre);
  const activo    = rol.estado === 'Activo';

  const permisosPorModulo = permisos.reduce((acc, p) => {
    const mod = p?.modulo || 'Sin módulo';
    if (!acc[mod]) acc[mod] = [];
    const accion = p?.accion?.toString?.().trim();
    if (accion && !acc[mod].includes(accion)) acc[mod].push(accion);
    return acc;
  }, {});
  const modulos = Object.keys(permisosPorModulo);

  const handleFlipOpen = async (e) => {
    e.stopPropagation();
    if (!detalleLoaded) {
      setLoadingDetalle(true);
      try {
        const [permisosRes, usuariosRes] = await Promise.all([
          api.get(`/roles/${rol.id_rol}/permisos`),
          api.get(`/roles/${rol.id_rol}/usuarios`),
        ]);
        setPermisos(Array.isArray(permisosRes.data) ? permisosRes.data : []);
        setUsuariosAsignados(Array.isArray(usuariosRes.data) ? usuariosRes.data : []);
      } catch { setPermisos([]); setUsuariosAsignados([]); }
      finally { setLoadingDetalle(false); setDetalleLoaded(true); }
    }
    setFlipped(true);
  };

  const handleFlipClose = (e) => { e.stopPropagation(); setFlipped(false); };

  // Mostrar acciones solo si no es protegido Y tiene al menos un permiso
  const mostrarAcciones = !protegido && (puedeEditar || puedeEstado);

  return (
    <div className="role-scene">
      <div className={`role-card${flipped ? ' flipped' : ''}`}>
        <div className="role-face role-front">
          <div className="role-front-bg" style={{ background: color }} />
          <button className="role-front-detail-btn" onClick={handleFlipOpen} title="Ver detalle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
            <span>ver detalle</span>
          </button>
          <div className="role-front-content">
            <div className="role-front-icon">{icon}</div>
            <span className="role-front-name">{rol.nombre}</span>
            <span className={`role-front-estado ${activo ? 'estado-activo' : 'estado-inactivo'}`}>
              <svg width="5" height="5" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>
              {rol.estado}
            </span>
            {rol.usuarios_activos !== undefined && (
              <span className="role-front-usuarios">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {rol.usuarios_activos} usuario{Number(rol.usuarios_activos) !== 1 ? 's' : ''}
              </span>
            )}
            {protegido && (
              <span className="role-front-hint">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                protegido
              </span>
            )}
          </div>
        </div>

        <div className="role-face role-back" style={{ borderTop: `3px solid ${color}` }}>
          <div className="role-back-header">
            <div className="role-back-title">
              <span className="role-back-dot" style={{ background: color }} />
              {rol.nombre}
              <span className={`role-back-badge ${activo ? 'estado-activo' : 'estado-inactivo'}`}>{rol.estado}</span>
            </div>
            <button className="role-back-close" onClick={handleFlipClose} title="Cerrar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="role-back-body">
            <div className="role-back-meta">
              <span className="role-back-meta-label">Creado</span>
              <span className="role-back-meta-valor">{formatFecha(rol.fecha_creacion)}</span>
            </div>

            {loadingDetalle ? (
              <div className="role-back-loading">
                <div className="role-back-spinner" />
                <span>Cargando permisos...</span>
              </div>
            ) : modulos.length > 0 ? (
              <div className="role-back-permisos">
                {modulos.map((mod) => (
                  <div key={mod} className="role-back-modulo" style={{ borderColor: color, background: color + '18' }}>
                    <span className="role-back-modulo-nombre">{mod}</span>
                    <div className="role-back-chips">
                      {permisosPorModulo[mod].map((accion, i) => (
                        <span key={i} className="role-back-chip" style={{ borderColor: color }}>{labelAccion(accion)}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : detalleLoaded ? (
              <p className="role-back-empty">Sin permisos asignados</p>
            ) : null}

            {!loadingDetalle && detalleLoaded && (
              <div className="role-back-usuarios">
                <span className="role-back-usuarios-titulo">Usuarios asignados ({usuariosAsignados.length})</span>
                {usuariosAsignados.length > 0 ? (
                  <ul className="role-back-usuarios-list">
                    {usuariosAsignados.map((u) => (
                      <li key={u.id_usuario} className="role-back-usuario-item">
                        <span className="role-back-usuario-nombre" title={u.email}>{u.nombre}</span>
                        <span className={`role-back-usuario-estado ${u.estado === 'Activo' ? 'estado-activo' : 'estado-inactivo'}`}>{u.estado}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="role-back-empty">Sin usuarios asignados</p>
                )}
              </div>
            )}

            {protegido && (
              <div className="role-back-protected">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Rol protegido — no editable
              </div>
            )}
          </div>

          {mostrarAcciones && (
            <div className="role-back-actions">
              {puedeEditar && (
                <button className="role-flip-btn" onClick={(e) => { e.stopPropagation(); setFlipped(false); onEditar(rol); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Editar
                </button>
              )}
              {puedeEstado && (
                <button
                  className={`role-flip-btn ${activo ? 'role-flip-deactivate' : 'role-flip-activate'}`}
                  onClick={(e) => { e.stopPropagation(); setFlipped(false); onCambiarEstado(rol); }}
                >
                  {activo ? (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Desactivar</>
                  ) : (
                    <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Activar</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RolModal ──────────────────────────────────────────────────────────────────
function RolModal({ titulo, form, setForm, errores, setErrores, modulosDisponibles, permisosCatalogo, onClose, onGuardar, labelGuardar }) {

  const togglePermiso = (id_permiso, modulo, accion) => {
    const ya = form.permisos.includes(id_permiso);
    const accionesDelModulo = permisosCatalogo[modulo] || [];
    const permisoVer = accionesDelModulo.find(a => a.accion === 'ver');

    setForm(prev => {
      let nuevosPermisos;
      if (accion === 'ver') {
        if (ya) {
          const otrasAccionesActivas = accionesDelModulo.some(a => a.accion !== 'ver' && prev.permisos.includes(a.id_permiso));
          if (otrasAccionesActivas) return prev;
          nuevosPermisos = prev.permisos.filter(p => p !== id_permiso);
        } else {
          nuevosPermisos = [...prev.permisos, id_permiso];
        }
      } else {
        if (ya) {
          nuevosPermisos = prev.permisos.filter(p => p !== id_permiso);
        } else {
          nuevosPermisos = [...prev.permisos, id_permiso];
          if (permisoVer && !nuevosPermisos.includes(permisoVer.id_permiso)) {
            nuevosPermisos.push(permisoVer.id_permiso);
          }
        }
      }
      return { ...prev, permisos: nuevosPermisos };
    });

    if (errores.permisos) setErrores(prev => ({ ...prev, permisos: '' }));
  };

  return createPortal(
    <div className="roles-modal-overlay">
      <div className="roles-modal roles-form-modal" onClick={e => e.stopPropagation()}>
        <div className="roles-modal-accent" />
        <div className="roles-modal-header">
          <div>
            <h2 className="roles-modal-title">{titulo}</h2>
            <p className="roles-modal-subtitle">Completa la información y los permisos del rol</p>
          </div>
          <button className="roles-modal-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="roles-modal-body roles-form-body">
          <div className="ms-form-group">
            <label className="ms-form-label">Nombre del rol <span className="ms-req">*</span></label>
            <input type="text" maxLength={MAX_LONGITUD_NOMBRE} className={`ms-form-input${errores.nombre ? ' error' : ''}`} placeholder="Ej: Vendedor" value={form.nombre}
              onChange={e => { const nombre = e.target.value; setForm(prev => ({ ...prev, nombre })); if (errores.nombre) setErrores(prev => ({ ...prev, nombre: validarNombreRol(nombre) })); }}
              onBlur={() => setErrores(prev => ({ ...prev, nombre: validarNombreRol(form.nombre) }))} />
            {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
          </div>

          <div className="ms-form-group">
            <label className="ms-form-label">Permisos del rol <span className="ms-req">*</span></label>
            <p className="ms-form-hint">Selecciona los módulos y acciones. Al elegir cualquier acción, "ver" se activa automáticamente.</p>
            <div className="roles-permisos-table-wrap">
              <table className="roles-permisos-table">
                <thead>
                  <tr><th>Módulo</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {(modulosDisponibles.length > 0 ? modulosDisponibles : MODULOS_FALLBACK).map((modulo, idx) => {
                    const accionesDelModulo = permisosCatalogo[modulo] || [];
                    return (
                      <tr key={modulo} className={idx % 2 === 0 ? '' : 'roles-tr-alt'}>
                        <td className="roles-td-modulo">{modulo}</td>
                        <td className="roles-td-acciones">
                          <div className="roles-chips-wrap">
                            {accionesDelModulo.map(accion => {
                              const otrasActivas = accion.accion === 'ver' && accionesDelModulo.some(
                                a => a.accion !== 'ver' && form.permisos.includes(a.id_permiso)
                              );
                              return (
                                <button key={accion.id_permiso} type="button"
                                  className={`roles-permiso-chip${form.permisos.includes(accion.id_permiso) ? ' selected' : ''}`}
                                  onClick={() => togglePermiso(accion.id_permiso, modulo, accion.accion)}
                                  disabled={otrasActivas}
                                  style={{ opacity: otrasActivas ? 0.6 : 1, cursor: otrasActivas ? 'not-allowed' : 'pointer' }}
                                  title={otrasActivas ? 'No se puede quitar "ver" mientras haya otras acciones activas' : (accion.descripcion || labelAccion(accion.accion))}
                                >
                                  {labelAccion(accion.accion)}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {errores.permisos && <span className="ms-form-error" style={{ marginTop: 8, display: 'block' }}>{errores.permisos}</span>}
          </div>

          {errores._general && <p style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{errores._general}</p>}
        </div>

        <div className="roles-modal-footer">
          <button className="roles-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="roles-btn-primary" onClick={onGuardar}>{labelGuardar}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Roles() {
  const { usuario } = useAuth();
  const tienePerm   = (p) => (usuario?.permisos || []).includes(p);

  const [datos,              setDatos]              = useState([]);
  const [busqueda,           setBusqueda]           = useState("");
  const [filtroEstado,       setFiltroEstado]       = useState("todos");
  const [loading,            setLoading]            = useState(true);
  const [modal,              setModal]              = useState(false);
  const [editar,             setEditar]             = useState(null);
  const [modulosDisponibles, setModulosDisponibles] = useState([]);
  const [permisosCatalogo,   setPermisosCatalogo]   = useState({});
  const [confirm,            setConfirm]            = useState(null);
  const [form,    setForm]    = useState({ nombre: "", estado: "Activo", permisos: [] });
  const [errores, setErrores] = useState({});
  const [toast,   setToast]   = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const filtrados = datos
    .filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter(r => filtroEstado === "todos" ? true : r.estado === (filtroEstado === "activos" ? "Activo" : "Inactivo"));

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get("/roles");
      setDatos(data);
    } catch (err) { console.error("Error cargando roles:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    cargar();
    api.get('/roles/modulos').then(({ data }) => setModulosDisponibles(mergeModulos(data))).catch(() => setModulosDisponibles(MODULOS_FALLBACK));
    api.get('/roles/permisos').then(({ data }) => setPermisosCatalogo(data || {})).catch(() => setPermisosCatalogo({}));
  }, [cargar]);

  const abrirRegistrar = () => {
    setEditar(null); setForm({ nombre: "", estado: "Activo", permisos: [] }); setErrores({}); setModal(true);
  };

  const abrirEditar = async (r) => {
    if (esRolProtegido(r.nombre)) return;
    setEditar(r.id_rol); setForm({ nombre: r.nombre, estado: r.estado, permisos: [] }); setErrores({}); setModal(true);
    try {
      const { data } = await api.get(`/roles/${r.id_rol}/permisos`);
      if (Array.isArray(data) && data.length > 0) {
        setForm(prev => ({ ...prev, permisos: data.map(p => p.id_permiso).filter(Boolean) }));
      }
    } catch (err) { console.error("Error cargando permisos:", err); }
  };

  const validar = () => {
    const e = {};
    const msgNombre = validarNombreRol(form.nombre);
    if (msgNombre) e.nombre = msgNombre;
    if (form.permisos.length === 0) e.permisos = "Selecciona al menos un permiso";
    setErrores(e);
    return e;
  };

  const guardar = async () => {
    const erroresValidacion = validar();
    if (Object.keys(erroresValidacion).length > 0) return;
    try {
      if (editar) await api.put(`/roles/${editar}`, form);
      else        await api.post("/roles", form);
      setModal(false); cargar();
      showToast('exito', editar ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) setErrores(prev => ({ ...prev, ...backendErrors }));
      else setErrores(prev => ({ ...prev, _general: err.response?.data?.message || 'Ocurrió un error al guardar.' }));
      showToast('error', err.response?.data?.message || 'Ocurrió un error al guardar el rol.');
    }
  };

  const solicitarCambioEstado = async (rol) => {
    if (esRolProtegido(rol.nombre)) return;
    if (rol.estado === 'Inactivo') {
      try {
        await api.patch(`/roles/${rol.id_rol}/estado`);
        cargar();
        showToast('exito', `Rol "${rol.nombre}" activado correctamente.`);
      } catch (err) {
        console.error("Error activando rol:", err);
        showToast('error', err.response?.data?.message || 'Error al activar el rol.');
      }
      return;
    }
    setConfirm({ rol, usuariosCount: null });
    try {
      const { data } = await api.get(`/roles/${rol.id_rol}/usuarios-count`);
      setConfirm({ rol, usuariosCount: data.total });
    } catch { setConfirm({ rol, usuariosCount: 0 }); }
  };

  const confirmarCambioEstado = async () => {
    if (!confirm) return;
    try {
      await api.patch(`/roles/${confirm.rol.id_rol}/estado`);
      const nombreRol = confirm.rol.nombre;
      setConfirm(null);
      cargar();
      showToast('exito', `Rol "${nombreRol}" desactivado correctamente.`);
    } catch (err) {
      console.error("Error cambiando estado:", err);
      showToast('error', err.response?.data?.message || 'Error al cambiar el estado del rol.');
    }
  };

  if (loading) return <Loader text="Cargando roles..." />;

  return (
    <div className="roles-container">
      <div className="roles-actions-bar">
        <div className="roles-actions-left">
          <div className="roles-search-wrapper">
            <span className="roles-search-icon"><IconSearch /></span>
            <input type="text" className="roles-search-input" placeholder="Buscar rol..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            {busqueda && <button className="roles-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>

          <div className="roles-filter-toggle">
            <button className={`roles-filter-btn${filtroEstado === "todos" ? " active" : ""}`} onClick={() => setFiltroEstado("todos")}>Todos</button>
            <button className={`roles-filter-btn${filtroEstado === "activos" ? " active" : ""}`} onClick={() => setFiltroEstado("activos")}>Activos</button>
            <button className={`roles-filter-btn${filtroEstado === "inactivos" ? " active" : ""}`} onClick={() => setFiltroEstado("inactivos")}>Inactivos</button>
          </div>

          {(busqueda || filtroEstado !== "todos") && <span className="roles-search-count">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>}
        </div>

        {tienePerm('Roles.crear') && (
          <button className="roles-btn-nuevo" onClick={abrirRegistrar}><span>+</span> Nuevo rol</button>
        )}
      </div>

      <div className="roles-grid">
        {filtrados.map((r, i) => (
          <RoleCard
            key={r.id_rol} rol={r} index={i}
            onEditar={abrirEditar}
            onCambiarEstado={solicitarCambioEstado}
            puedeEditar={tienePerm('Roles.editar')}
            puedeEstado={tienePerm('Roles.estado')}
          />
        ))}
      </div>

      {confirm && createPortal(
        <div className="roles-modal-overlay" onClick={() => setConfirm(null)}>
          <div className="roles-modal roles-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="roles-modal-accent" style={{ background: '#b83232' }} />
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
                  <div className="roles-confirm-icon" style={{ background: PALETAS[datos.findIndex(r => r.id_rol === confirm.rol.id_rol) % PALETAS.length] + '22', borderColor: PALETAS[datos.findIndex(r => r.id_rol === confirm.rol.id_rol) % PALETAS.length] }}>
                    {getRoleIcon(confirm.rol.nombre)}
                  </div>
                  <span className="roles-confirm-nombre">{confirm.rol.nombre}</span>
                </div>
                {confirm.usuariosCount === null ? (
                  <div className="roles-confirm-safe"><span style={{ color: 'var(--dvna-muted)' }}>Verificando usuarios afectados...</span></div>
                ) : confirm.usuariosCount > 0 ? (
                  <div className="roles-confirm-warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span><strong>{confirm.usuariosCount} usuario{confirm.usuariosCount !== 1 ? 's' : ''}</strong>{' '}con este rol {confirm.usuariosCount !== 1 ? 'quedarán' : 'quedará'} bloqueado{confirm.usuariosCount !== 1 ? 's' : ''}.</span>
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
        </div>,
        document.body
      )}

      {modal && (
        <RolModal
          titulo={editar ? "Editar rol" : "Nuevo rol"}
          form={form} setForm={setForm} errores={errores} setErrores={setErrores}
          modulosDisponibles={modulosDisponibles} permisosCatalogo={permisosCatalogo}
          onClose={() => setModal(false)} onGuardar={guardar}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}