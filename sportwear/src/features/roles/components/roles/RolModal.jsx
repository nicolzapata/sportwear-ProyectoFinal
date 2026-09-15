import { createPortal } from "react-dom";
import { MAX_LONGITUD_NOMBRE } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";
import { MODULOS_FALLBACK, validarNombreRol, labelAccion } from "../../utils/rolesHelpers";

export default function RolModal({ titulo, form, setForm, errores, setErrores, modulosDisponibles, permisosCatalogo, onClose, onGuardar, labelGuardar }) {

  const modulosParaMostrar = modulosDisponibles.length > 0 ? modulosDisponibles : MODULOS_FALLBACK;

  const idsDeModulo = (modulo) => (permisosCatalogo[modulo] || []).map(a => a.id_permiso);
  const idsDeTodosLosModulos = modulosParaMostrar.flatMap(idsDeModulo);

  // "Seleccionar todo" (global) y "Todo" por módulo son toggles: si ya están
  // todos activos, el mismo botón los quita — no hace falta un botón aparte
  // para deseleccionar.
  const marcarPermisos = (ids, activar) => {
    setForm(prev => ({
      ...prev,
      permisos: activar
        ? [...new Set([...prev.permisos, ...ids])]
        : prev.permisos.filter(p => !ids.includes(p)),
    }));
    if (errores.permisos) setErrores(prev => ({ ...prev, permisos: '' }));
  };

  const todosActivos = idsDeTodosLosModulos.length > 0 && idsDeTodosLosModulos.every(id => form.permisos.includes(id));
  const toggleSeleccionarTodo = () => marcarPermisos(idsDeTodosLosModulos, !todosActivos);

  const moduloEstaCompleto = (modulo) => {
    const ids = idsDeModulo(modulo);
    return ids.length > 0 && ids.every(id => form.permisos.includes(id));
  };
  const toggleSeleccionarModulo = (modulo) => marcarPermisos(idsDeModulo(modulo), !moduloEstaCompleto(modulo));

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
            <div className="roles-permisos-label-row">
              <label className="ms-form-label">Permisos del rol <span className="ms-req">*</span></label>
              <button type="button" className="roles-btn-seleccionar-todo" onClick={toggleSeleccionarTodo}>
                {todosActivos ? 'Quitar todo' : 'Seleccionar todo'}
              </button>
            </div>
            <p className="ms-form-hint">Selecciona los módulos y acciones. Al elegir cualquier acción, "ver" se activa automáticamente.</p>
            <div className={`roles-permisos-table-wrap${errores.permisos ? ' error' : ''}`}>
              <table className="roles-permisos-table">
                <thead>
                  <tr><th>Módulo</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {modulosParaMostrar.map((modulo, idx) => {
                    const accionesDelModulo = permisosCatalogo[modulo] || [];
                    const completo = moduloEstaCompleto(modulo);
                    return (
                      <tr key={modulo} className={idx % 2 === 0 ? '' : 'roles-tr-alt'}>
                        <td className="roles-td-modulo">{modulo}</td>
                        <td className="roles-td-acciones">
                          <div className="roles-chips-wrap">
                            {accionesDelModulo.length > 0 && (
                              <button type="button"
                                className={`roles-permiso-chip roles-permiso-chip-todo${completo ? ' selected' : ''}`}
                                onClick={() => toggleSeleccionarModulo(modulo)}
                                title={completo ? 'Quitar todas las acciones de este módulo' : 'Seleccionar todas las acciones de este módulo'}
                              >
                                Todo
                              </button>
                            )}
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
