import { createPortal } from "react-dom";
import { MAX_LONGITUD_NOMBRE } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";
import { MODULOS_FALLBACK, validarNombreRol, labelAccion } from "../../utils/rolesHelpers";

export default function RolModal({ titulo, form, setForm, errores, setErrores, modulosDisponibles, permisosCatalogo, onClose, onGuardar, labelGuardar }) {

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
            <div className={`roles-permisos-table-wrap${errores.permisos ? ' error' : ''}`}>
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
          </div>
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
