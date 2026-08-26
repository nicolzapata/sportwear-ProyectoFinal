import { createPortal } from "react-dom";
import { IconX } from "../../../../shared/components/Icons";
import { PALETAS, getRoleIcon } from "../../utils/rolesHelpers";

export default function ConfirmEstadoModal({ confirm, setConfirm, datos, confirmarCambioEstado }) {
  if (!confirm) return null;

  return createPortal(
    <div className="roles-modal-overlay" onClick={() => setConfirm(null)}>
      <div className="roles-modal roles-confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="roles-modal-accent" style={{ background: '#b83232' }} />
        <div className="roles-modal-header">
          <div>
            <h2 className="roles-modal-title">¿Deseas inactivar "{confirm.rol.nombre}"?</h2>
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
  );
}
