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
  "Dashboard", "Usuarios", "Roles", "Clientes", "Productos",
  "Catálogo", "Proveedores", "Compras", "Pedidos", "Pagos", "Configuración"
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

/**
 * FIX BUG 3: normaliza el campo modulos que viene del backend.
 * PostgreSQL con array_agg puede llegar como:
 *   - Array JS real:        ["Usuarios", "Roles"]        ← driver pg lo parsea
 *   - String PG:            "{Usuarios,Roles}"           ← a veces pasa con COALESCE
 *   - null/undefined:       si el rol no tiene permisos
 */
const normalizarModulos = (valor) => {
  if (!valor) return [];
  if (Array.isArray(valor)) return valor.filter(Boolean);
  if (typeof valor === "string") {
    // Formato PostgreSQL: "{Módulo1,Módulo2}"
    return valor
      .replace(/^\{|\}$/g, "")   // quitar llaves
      .split(",")
      .map(s => s.trim().replace(/^"|"$/g, ""))  // quitar comillas si las hay
      .filter(Boolean);
  }
  return [];
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
  // Este cálculo ocurre en CADA render del componente, reactivo a `permisos`
  const modulosDelRol = [...new Set(
    permisos
      .map(p => p.modulo)
      .filter(Boolean)
  )];

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {modulosDelRol.map(m => (
            <span
              key={m}
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11,
                fontFamily: "var(--font-body, inherit)",
                background: rolColor + "33",
                border: `1px solid ${rolColor}`,
                color: "var(--dvna-charcoal, #1a1a1a)"
              }}
            >
              {m}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--dvna-muted, #999)", fontStyle: "italic", margin: 0 }}>
          Sin módulos asignados
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
  const [confirm,            setConfirm]            = useState(null);

  const [form,    setForm]    = useState({
    nombre: "", descripcion: "", estado: "Activo", nivel_acceso: "Editor", permisos: []
  });
  const [errores, setErrores] = useState({});

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
    api.get('/roles/modulos')
      .then(({ data }) => {
        // data puede ser array de strings o array de objetos {modulo: "..."}
        const lista = Array.isArray(data)
          ? data.map(item => (typeof item === 'string' ? item : item.modulo)).filter(Boolean)
          : [];
        setModulosDisponibles(lista.length > 0 ? lista : MODULOS_FALLBACK);
      })
      .catch(() => setModulosDisponibles(MODULOS_FALLBACK));
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
    setModal(true);
  };

  // ── FIX BUG 3: cargar permisos frescos al editar ──────────────────────────
  // En vez de usar r.modulos del listado (que puede tener formato incorrecto),
  // cargamos directamente desde /roles/:id/permisos para tener datos limpios.
  const abrirEditar = async (r) => {
    if (esRolProtegido(r.nombre)) return;
    setEditar(r.id_rol);
    // Ponemos lo que tenemos del listado como base mientras carga
    const modulosBase = normalizarModulos(r.modulos);
    setForm({
      nombre:       r.nombre,
      descripcion:  r.descripcion,
      estado:       r.estado,
      nivel_acceso: r.nivel_acceso || "Editor",
      permisos:     modulosBase,
    });
    setErrores({});
    setModal(true);

    // Carga fresca de permisos reales desde el endpoint específico
    try {
      const { data } = await api.get(`/roles/${r.id_rol}/permisos`);
      if (Array.isArray(data) && data.length > 0) {
        const modulosReales = [...new Set(data.map(p => p.modulo).filter(Boolean))];
        setForm(prev => ({ ...prev, permisos: modulosReales }));
      }
    } catch (err) {
      console.error("Error cargando permisos para edición:", err);
      // Si falla, nos quedamos con modulosBase (mejor que nada)
    }
  };

  // ── Toggle permiso ────────────────────────────────────────────────────────
  const togglePermiso = (modulo) => {
    const ya = form.permisos.includes(modulo);
    setForm(prev => ({
      ...prev,
      permisos: ya ? prev.permisos.filter(p => p !== modulo) : [...prev.permisos, modulo]
    }));
    if (errores.permisos) setErrores(prev => ({ ...prev, permisos: '' }));
  };

  // ── Validación frontend ───────────────────────────────────────────────────
  const validar = () => {
    const e = {};
    if (!form.nombre.trim())        e.nombre      = "El nombre es obligatorio";
    if (!form.descripcion.trim())   e.descripcion = "La descripción es obligatoria";
    if (form.permisos.length === 0) e.permisos    = "Selecciona al menos un módulo";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  // ── Guardar ───────────────────────────────────────────────────────────────
  const guardar = async () => {
    if (!validar()) return;
    try {
      if (editar) await api.put(`/roles/${editar}`, form);
      else        await api.post("/roles", form);
      setModal(false);
      cargar();
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
          Módulos con acceso <span className="ms-req">*</span>
        </label>
        <p className="ms-form-hint" style={{ marginBottom: 10 }}>
          Selecciona los módulos a los que tendrá acceso este rol.
        </p>
        <div className="roles-permisos-grid">
          {modulosDisponibles.map(m => (
            <button
              key={m}
              type="button"
              // FIX BUG 3: form.permisos ya son strings normalizados → .includes() funciona
              className={`roles-permiso-chip${form.permisos.includes(m) ? ' selected' : ''}`}
              onClick={() => togglePermiso(m)}
            >
              {m}
            </button>
          ))}
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