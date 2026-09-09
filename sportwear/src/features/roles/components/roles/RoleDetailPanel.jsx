import { PALETAS, esRolProtegido, getRoleIcon, labelAccion } from "../../utils/rolesHelpers";
import { IconEdit } from "../../../../shared/components/Icons";

// Emoji por módulo — mismo lenguaje visual que el menú lateral (MENU_ITEMS),
// solo para dar contexto rápido a cada bloque de la matriz.
const MODULO_EMOJI = {
  Dashboard: "📊", Usuarios: "👤", Clientes: "🧑‍🤝‍🧑", Roles: "🔑", Productos: "👕",
  Categorias: "🗂️", Colores: "🎨", Proveedores: "🏭", Compras: "📦", Pedidos: "🚚",
  Ventas: "💰", Pagos: "💳",
};

export default function RoleDetailPanel({
  rol, index, permisosCatalogo, permisosOtorgados, loadingPermisos,
  totalPermisosCatalogo, onEditar, onCambiarEstado, puedeEditar, puedeEstado,
}) {
  if (!rol) return null;

  const color = PALETAS[index % PALETAS.length];
  const protegido = esRolProtegido(rol.nombre);
  const activo = rol.estado === 'Activo';
  const otorgadosIds = new Set(permisosOtorgados.map(p => p.id_permiso));
  const modulos = Object.entries(permisosCatalogo).filter(([, acciones]) => Array.isArray(acciones) && acciones.length > 0);
  const mostrarAcciones = !protegido && (puedeEditar || puedeEstado);

  return (
    <div className="role-detalle-panel">
      <div className="role-detalle-header">
        <span className="role-detalle-icon" style={{ background: color }}>{getRoleIcon(rol.nombre)}</span>
        <div className="role-detalle-titulo">
          <div className="role-detalle-nombre-row">
            <span className="role-detalle-nombre">{rol.nombre}</span>
            <span className="role-detalle-tipo">{protegido ? 'Sistema' : 'Personalizado'}</span>
          </div>
          <span className="role-detalle-id">ID: #ROL-{String(rol.id_rol).padStart(3, '0')}</span>
        </div>
      </div>

      <p className="role-detalle-desc">{rol.descripcion || 'Sin descripción registrada.'}</p>

      <div className="role-detalle-stats">
        <div className="role-detalle-stat">
          <span className="role-detalle-stat-label">Usuarios asignados</span>
          <span className="role-detalle-stat-valor">{rol.usuarios_activos ?? 0}</span>
          <span className="role-detalle-stat-hint">{activo ? 'Rol activo' : 'Rol inactivo'}</span>
        </div>
        <div className="role-detalle-stat">
          <span className="role-detalle-stat-label">Permisos otorgados</span>
          <span className="role-detalle-stat-valor">{permisosOtorgados.length} / {totalPermisosCatalogo}</span>
        </div>
      </div>

      <div className="role-detalle-matriz">
        <div className="role-detalle-matriz-header">
          <span>Matriz de permisos</span>
          <span className="role-detalle-matriz-modo">Modo lectura</span>
        </div>

        {loadingPermisos ? (
          <div className="role-back-loading"><div className="role-back-spinner" /><span>Cargando permisos...</span></div>
        ) : modulos.length === 0 ? (
          <p className="role-back-empty">No hay módulos con permisos configurados.</p>
        ) : (
          <div className="role-detalle-modulos">
            {modulos.map(([modulo, acciones]) => {
              const otorgadosModulo = acciones.filter(a => otorgadosIds.has(a.id_permiso)).length;
              return (
                <div key={modulo} className="role-detalle-modulo">
                  <div className="role-detalle-modulo-header">
                    <span>{MODULO_EMOJI[modulo] || '•'} {modulo}</span>
                    <span className="role-detalle-modulo-count">{otorgadosModulo} de {acciones.length}</span>
                  </div>
                  <div className="role-detalle-modulo-acciones">
                    {acciones.map(a => {
                      const otorgado = otorgadosIds.has(a.id_permiso);
                      return (
                        <span key={a.id_permiso} className={`role-detalle-accion ${otorgado ? 'otorgado' : 'denegado'}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {otorgado
                              ? <polyline points="20 6 9 17 4 12" />
                              : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
                          </svg>
                          {a.descripcion || labelAccion(a.accion)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {mostrarAcciones && (
        <div className="role-detalle-actions">
          {puedeEditar && (
            <button className="role-detalle-btn-primary" onClick={() => onEditar(rol)}>
              <IconEdit /> Editar permisos del rol
            </button>
          )}
          {puedeEstado && (
            <button className="role-detalle-btn-secondary" onClick={() => onCambiarEstado(rol)}>
              {activo ? 'Desactivar rol' : 'Activar rol'}
            </button>
          )}
        </div>
      )}

      {protegido && (
        <div className="role-back-protected role-detalle-protegido">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Rol protegido del sistema — no editable
        </div>
      )}
    </div>
  );
}
