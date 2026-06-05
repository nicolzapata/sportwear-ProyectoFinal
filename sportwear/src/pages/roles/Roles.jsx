// src/pages/roles/Roles.jsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
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
  "Dashboard",
  "Usuarios",
  "Roles",
  "Productos",
  "Colores",
  "Catálogo",
  "Proveedores",
  "Compras",
  "PedidosVentas",
  "Pagos",
  "Configuración",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const esRolProtegido = (nombre = "") => {
  const n = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return n === "administrador" || n === "admin";
};

const getRoleIcon = (nombre = "") => {
  const key = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return ROLE_ICONS[key] || DEFAULT_ICON;
};

const normalizeModulo = (value) =>
  value?.toString?.().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const mergeModulos = (backendModulos) => {
  const raw = Array.isArray(backendModulos)
    ? backendModulos
        .map((m) => {
          if (typeof m === 'string') return m.trim();
          if (m && typeof m === 'object') return (m.modulo || m.nombre || '').trim();
          return '';
        })
        .filter(Boolean)
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

  // Preferir el orden oficial siempre que haya coincidencia
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
            <div
              className="role-front-icon"
              style={{ color: textColor, background: iconBg, border: `1.5px solid ${iconBorder}` }}
            >
              {icon}
            </div>
            <span className="role-front-name" style={{ color: textColor, background: nameBg }}>
              {rol.nombre}
            </span>
            {protegido ? (
              <span className="role-front-hint" style={{ color: textMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
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

// ── FIX BUG 1 & 2: SubComponente reactivo para la sección de permisos ─────────
// Al ser un componente React real, se re-renderiza cuando cambian sus props.
// Antes era una variable JSX calculada una vez → no reactiva.
function SeccionPermisos({ permisos, loadingPermisos, rolColor }) {
  const permisosPorModulo = permisos.reduce((acc, permiso) => {
    const modulo = permiso?.modulo || 'Sin módulo';
    if (!acc[modulo]) acc[modulo] = [];
    const accion = permiso?.accion?.toString?.().trim();
    if (accion && !acc[modulo].includes(accion)) acc[modulo].push(accion);
    return acc;
  }, {});

  const modulosDelRol = Object.keys(permisosPorModulo);

  if (loadingPermisos) {
    return (
      <DetalleSeccion>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 14, height: 14,
            border: '1.5px solid var(--dvna-border)',
            borderTopColor: 'var(--dvna-circle)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0
          }} />
          <p style={{ fontSize: 13, color: 'var(--dvna-muted, #999)', margin: 0 }}>
            Cargando permisos...
          </p>
        </div>
      </DetalleSeccion>
    );
  }

  return (
    <DetalleSeccion>
      {modulosDelRol.length > 0 ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {modulosDelRol.map((modulo) => (
            <div key={modulo} style={{ padding: 12, borderRadius: 14, border: `1px solid ${rolColor}`, background: `${rolColor}15` }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--dvna-charcoal, #1a1a1a)' }}>
                {modulo}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {permisosPorModulo[modulo].map((accion, index) => (
                  <span
                    key={`${modulo}-${accion}-${index}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'white',
                      border: `1px solid ${rolColor}`,
                      color: 'var(--dvna-charcoal, #1a1a1a)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {accion}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--dvna-muted, #999)', fontStyle: 'italic', margin: 0 }}>
          Sin permisos asignados
        </p>
      )}
    </DetalleSeccion>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Roles() {
  const [datos,              setDatos]              = useState([]);
  const [busqueda,           setBusqueda]           = useState("");
  const [loading,            setLoading]            = useState(true);
  const [modal,              setModal]              = useState(false);
  const [editar,             setEditar]             = useState(null);
  const [detalle,            setDetalle]            = useState(null);
  // FIX BUG 1: estado separado para permisos del detalle
  const [permisos,           setPermisos]           = useState([]);
  const [loadingPermisos,    setLoadingPermisos]    = useState(false);
  const [modulosDisponibles, setModulosDisponibles] = useState([]);
  const [permisosCatalogo,   setPermisosCatalogo]   = useState({});
  const [confirm,            setConfirm]            = useState(null);

  const [form,    setForm]    = useState({
    nombre: "", descripcion: "", estado: "Activo", nivel_acceso: "Editor", permisos: []
  });
  const [errores, setErrores] = useState({});
  const [modalStep, setModalStep] = useState(0);

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtrados = datos.filter(r =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (r.descripcion && r.descripcion.toLowerCase().includes(busqueda.toLowerCase()))
  );

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get("/roles");
      setDatos(data);
    } catch (err) {
      console.error("Error cargando roles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Cargar módulos disponibles
    api.get('/roles/modulos')
      .then(({ data }) => {
        setModulosDisponibles(mergeModulos(data));
      })
      .catch(() => setModulosDisponibles(MODULOS_FALLBACK));
    
    // Cargar catálogo granular de permisos (módulo × acción)
    api.get('/roles/permisos')
      .then(({ data }) => {
        setPermisosCatalogo(data || {});
      })
      .catch(err => {
        console.error("Error cargando catálogo de permisos:", err);
        setPermisosCatalogo({});
      });
  }, [cargar]);

  // ── FIX BUG 1: cargar permisos del detalle con estado de carga propio ─────
  const abrirDetalle = async (rol) => {
    setDetalle(rol);
    setPermisos([]);
    setLoadingPermisos(true);
    try {
      const { data } = await api.get(`/roles/${rol.id_rol}/permisos`);
      // data debe ser array de { id_permiso, nombre, modulo, accion }
      setPermisos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando permisos del detalle:", err);
      setPermisos([]);
    } finally {
      setLoadingPermisos(false);
    }
  };

  // ── Abrir modal registrar ─────────────────────────────────────────────────
  const abrirRegistrar = () => {
    setEditar(null);
    setForm({ nombre: "", descripcion: "", estado: "Activo", nivel_acceso: "Editor", permisos: [] });
    setErrores({});
    setModalStep(0);
    setModal(true);
  };

  // ── FIX BUG 3: cargar permisos frescos al editar ──────────────────────────
  // Ahora cargamos los id_permiso específicos (granular), no solo módulos.
  const abrirEditar = async (r) => {
    if (esRolProtegido(r.nombre)) return;
    setEditar(r.id_rol);
    // Inicializar con permisos vacíos mientras carga
    setForm({
      nombre:       r.nombre,
      descripcion:  r.descripcion,
      estado:       r.estado,
      nivel_acceso: r.nivel_acceso || "Editor",
      permisos:     [],
    });
    setErrores({});
    setModalStep(0);
    setModal(true);

    // Carga fresca de permisos reales desde el endpoint específico
    try {
      const { data } = await api.get(`/roles/${r.id_rol}/permisos`);
      if (Array.isArray(data) && data.length > 0) {
        // Extraer id_permiso de los permisos devueltos
        const idsPermiso = data.map(p => p.id_permiso).filter(Boolean);
        setForm(prev => ({ ...prev, permisos: idsPermiso }));
      }
    } catch (err) {
      console.error("Error cargando permisos para edición:", err);
      // Si falla, nos quedamos con permisos vacío
    }
  };

  // ── Toggle permiso granular ──────────────────────────────────────────────
  // Ahora trabaja con id_permiso (números) en lugar de módulos (strings)
  const togglePermiso = (id_permiso) => {
    const ya = form.permisos.includes(id_permiso);
    setForm(prev => ({
      ...prev,
      permisos: ya ? prev.permisos.filter(p => p !== id_permiso) : [...prev.permisos, id_permiso]
    }));
    if (errores.permisos) setErrores(prev => ({ ...prev, permisos: '' }));
  };

  // ── Validación frontend ───────────────────────────────────────────────────
  const validar = () => {
    const e = {};
    if (!form.nombre.trim())        e.nombre      = "El nombre es obligatorio";
    if (!form.descripcion.trim())   e.descripcion = "La descripción es obligatoria";
    if (form.permisos.length === 0) e.permisos    = "Selecciona al menos un permiso";
    setErrores(e);
    return e;
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async () => {
    const erroresValidacion = validar();
    if (Object.keys(erroresValidacion).length > 0) {
      if (erroresValidacion.nombre || erroresValidacion.descripcion) setModalStep(0);
      else if (erroresValidacion.permisos) setModalStep(1);
      return false;
    }
    try {
      if (editar) await api.put(`/roles/${editar}`, form);
      else        await api.post("/roles", form);
      setModal(false);
      cargar();
      return true;
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) {
        setErrores(prev => ({ ...prev, ...backendErrors }));
      } else {
        setErrores(prev => ({
          ...prev,
          _general: err.response?.data?.message || 'Ocurrió un error al guardar.'
        }));
      }
      return false;
    }
  };

  // ── Cambio de estado ──────────────────────────────────────────────────────
  const solicitarCambioEstado = async (rol) => {
    if (esRolProtegido(rol.nombre)) return;
    if (rol.estado === 'Inactivo') {
      try { await api.patch(`/roles/${rol.id_rol}/estado`); cargar(); }
      catch (err) { console.error("Error activando rol:", err); }
      return;
    }
    setConfirm({ rol, usuariosCount: null });
    try {
      const { data } = await api.get(`/roles/${rol.id_rol}/usuarios-count`);
      setConfirm({ rol, usuariosCount: data.total });
    } catch {
      setConfirm({ rol, usuariosCount: 0 });
    }
  };

  const confirmarCambioEstado = async () => {
    if (!confirm) return;
    try {
      await api.patch(`/roles/${confirm.rol.id_rol}/estado`);
      setConfirm(null);
      cargar();
    } catch (err) {
      console.error("Error cambiando estado:", err);
    }
  };

  // ── Loading inicial ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="roles-loading-container">
      <div className="roles-loading-spinner" />
      <p className="roles-loading-text">Cargando roles...</p>
    </div>
  );

  // ── Pasos del formulario ──────────────────────────────────────────────────
  const PasoInfo = (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">
            Nombre del rol <span className="ms-req">*</span>
          </label>
          <input
            type="text"
            className={`ms-form-input${errores.nombre ? ' error' : ''}`}
            placeholder="Ej: Vendedor"
            value={form.nombre}
            onChange={e => {
              setForm(prev => ({ ...prev, nombre: e.target.value }));
              if (errores.nombre) setErrores(prev => ({ ...prev, nombre: '' }));
            }}
          />
          {errores.nombre && <span className="ms-form-error">{errores.nombre}</span>}
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Nivel de acceso</label>
          <select
            className="ms-form-select"
            value={form.nivel_acceso}
            onChange={e => setForm(prev => ({ ...prev, nivel_acceso: e.target.value }))}
          >
            <option value="Admin">Admin</option>
            <option value="Editor">Editor</option>
            <option value="Observador">Observador</option>
          </select>
        </div>
      </div>
      <div className="ms-form-group">
        <label className="ms-form-label">
          Descripción <span className="ms-req">*</span>
        </label>
        <input
          type="text"
          className={`ms-form-input${errores.descripcion ? ' error' : ''}`}
          placeholder="Ej: Acceso a ventas y pedidos"
          value={form.descripcion}
          onChange={e => {
            setForm(prev => ({ ...prev, descripcion: e.target.value }));
            if (errores.descripcion) setErrores(prev => ({ ...prev, descripcion: '' }));
          }}
        />
        {errores.descripcion && <span className="ms-form-error">{errores.descripcion}</span>}
      </div>
      {errores._general && (
        <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
          {errores._general}
        </p>
      )}
    </div>
  );

  const PasoPermisos = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">
          Permisos del rol <span className="ms-req">*</span>
        </label>
        <p className="ms-form-hint" style={{ marginBottom: 10 }}>
          Selecciona los módulos y acciones específicas para este rol.
        </p>
        {modulosDisponibles.length > 0 && permisosCatalogo && Object.keys(permisosCatalogo).length === 0 && (
          <p className="ms-form-hint" style={{ marginBottom: 10, color: 'var(--dvna-muted)' }}>
            No se encontraron permisos por módulo. Verifica la configuración del backend.
          </p>
        )}
        {modulosDisponibles.length === 0 && (
          <p className="ms-form-hint" style={{ marginBottom: 10, color: 'var(--dvna-muted)' }}>
            Usando módulos predefinidos por defecto mientras se carga el catálogo.
          </p>
        )}
        
        {/* Matriz de módulos × acciones */}
        <div style={{ overflowX: 'auto', marginBottom: 10 }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--dvna-border)', backgroundColor: 'var(--dvna-bg2)' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600 }}>Módulo</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(modulosDisponibles.length > 0 ? modulosDisponibles : MODULOS_FALLBACK).map((modulo, idx) => {
                const accionesDelModulo = permisosCatalogo[modulo] || [];
                return (
                  <tr key={modulo} style={{
                    borderBottom: '1px solid var(--dvna-border)',
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--dvna-bg2)'
                  }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>{modulo}</td>
                    <td style={{ padding: '8px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {accionesDelModulo.map(accion => (
                          <button
                            key={accion.id_permiso}
                            type="button"
                            className={`roles-permiso-chip${form.permisos.includes(accion.id_permiso) ? ' selected' : ''}`}
                            onClick={() => togglePermiso(accion.id_permiso)}
                            style={{
                              fontSize: 11,
                              padding: '4px 8px',
                              minWidth: 'auto'
                            }}
                            title={accion.descripcion || accion.accion}
                          >
                            {accion.accion}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {errores.permisos && (
          <span className="ms-form-error" style={{ marginTop: 8, display: 'block' }}>
            {errores.permisos}
          </span>
        )}
      </div>
    </div>
  );

  // ── Datos del detalle ─────────────────────────────────────────────────────
  const rolIndex  = detalle ? datos.findIndex(r => r.id_rol === detalle.id_rol) : 0;
  const rolColor  = PALETAS[rolIndex % PALETAS.length];
  const protegido = detalle ? esRolProtegido(detalle.nombre) : false;

  // FIX BUG 2: DetalleInfo sigue siendo JSX variable (no necesita ser reactivo,
  // solo depende de `detalle` que cambia al abrir el modal, no de `permisos`)
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Este rol es protegido del sistema y no puede editarse ni desactivarse.
        </div>
      )}
    </DetalleSeccion>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="roles-container">

      {/* Barra de búsqueda */}
      <div className="roles-search-bar">
        <div className="roles-search-wrapper">
          <span className="roles-search-icon"><IconSearch /></span>
          <input
            type="text"
            className="roles-search-input"
            placeholder="Buscar rol..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="roles-search-clear" onClick={() => setBusqueda("")}>
              <IconX />
            </button>
          )}
        </div>
        {busqueda && (
          <span className="roles-search-count">
            {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grid de cards */}
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
          <div className="roles-modal roles-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="roles-modal-accent" style={{ background: '#b83232' }} />
            <div className="roles-modal-header">
              <div>
                <h2 className="roles-modal-title">Desactivar rol</h2>
                <p className="roles-modal-subtitle">Esta acción afectará a los usuarios asignados</p>
              </div>
              <button className="roles-modal-close" onClick={() => setConfirm(null)}>
                <IconX />
              </button>
            </div>
            <div className="roles-modal-body">
              <div className="roles-confirm-info">
                <div className="roles-confirm-rol">
                  <div
                    className="roles-confirm-icon"
                    style={{
                      background: PALETAS[datos.findIndex(r => r.id_rol === confirm.rol.id_rol) % PALETAS.length] + '22',
                      borderColor: PALETAS[datos.findIndex(r => r.id_rol === confirm.rol.id_rol) % PALETAS.length]
                    }}
                  >
                    {getRoleIcon(confirm.rol.nombre)}
                  </div>
                  <span className="roles-confirm-nombre">{confirm.rol.nombre}</span>
                </div>
                {confirm.usuariosCount === null ? (
                  <div className="roles-confirm-safe">
                    <span style={{ color: 'var(--dvna-muted)' }}>Verificando usuarios afectados...</span>
                  </div>
                ) : confirm.usuariosCount > 0 ? (
                  <div className="roles-confirm-warning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>
                      <strong>{confirm.usuariosCount} usuario{confirm.usuariosCount !== 1 ? 's' : ''}</strong>
                      {' '}con este rol {confirm.usuariosCount !== 1 ? 'quedarán' : 'quedará'} bloqueado{confirm.usuariosCount !== 1 ? 's' : ''}.
                    </span>
                  </div>
                ) : (
                  <div className="roles-confirm-safe">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
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

      {/* ── Modal formulario por pasos ── */}
      {modal && (
        <ModalSteps
          titulo={editar ? "Editar rol" : "Nuevo rol"}
          pasos={["Información", "Permisos"]}
          step={modalStep}
          onStepChange={setModalStep}
          onClose={() => setModal(false)}
          onGuardar={guardar}
          onValidationFail={() => {
            const erroresValidacion = validar();
            if (erroresValidacion.nombre || erroresValidacion.descripcion) setModalStep(0);
            else if (erroresValidacion.permisos) setModalStep(1);
          }}
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
          avatar={
            <span style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {getRoleIcon(detalle.nombre)}
            </span>
          }
          avatarColor={rolColor}
          badge={
            <span className={`role-status ${detalle.estado === 'Activo' ? 'status-active' : 'status-inactive'}`}>
              {detalle.estado}
            </span>
          }
          pasos={["Información", "Módulos y permisos"]}
          onClose={() => { setDetalle(null); setPermisos([]); }}
          onEditar={protegido ? undefined : () => { setDetalle(null); abrirEditar(detalle); }}
          onCambiarEstado={protegido ? undefined : () => { setDetalle(null); solicitarCambioEstado(detalle); }}
        >
          {DetalleInfo}
          {/* FIX BUG 1 & 2: componente React real, reactivo a cambios de permisos */}
          <SeccionPermisos
            permisos={permisos}
            loadingPermisos={loadingPermisos}
            rolColor={rolColor}
          />
        </ModalDetalle>
      )}

    </div>
  );
}