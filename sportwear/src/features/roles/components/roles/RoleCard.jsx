import { useState } from "react";
import api from "../../../../shared/services/api";
import { PALETAS, esRolProtegido, getRoleIcon, labelAccion, formatFecha } from "../../utils/rolesHelpers";

export default function RoleCard({ rol, index, onEditar, onCambiarEstado, puedeEditar, puedeEstado }) {
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
