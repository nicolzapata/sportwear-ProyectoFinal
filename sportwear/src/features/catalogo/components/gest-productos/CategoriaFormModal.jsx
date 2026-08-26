import { MAX_LONGITUD_NOMBRE, MAX_LONGITUD_TEXTO_LIBRE } from "../../../../shared/utils/numerico";
import { IconX } from "../../../../shared/components/Icons";

export default function CategoriaFormModal({
  editarCategoria, setModal,
  formCategoria, setFormCategoria,
  erroresCategoria, setErroresCategoria, validarNombreCategoria,
  guardarCategoria,
}) {
  return (
    <div className="gestproductos-modal-overlay" onClick={() => setModal(false)}>
      <div className="gestproductos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gestproductos-modal-header">
          <h2 className="gestproductos-modal-title">{editarCategoria ? "Editar categoría" : "Nueva categoría"}</h2>
          <button className="gestproductos-modal-close" onClick={() => setModal(false)}><IconX /></button>
        </div>
        <div className="gestproductos-modal-body gestproductos-factura-body">
          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Datos de la categoría</h3>
            <div>
              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Nombre de la categoría <span className="gestproductos-required">*</span></label>
                <input type="text" className={`gestproductos-form-input${erroresCategoria.nombre ? " input-error" : ""}`} placeholder="Ej: Ropa Deportiva"
                  value={formCategoria.nombre} maxLength={MAX_LONGITUD_NOMBRE}
                  onChange={e => {
                    const nombre = e.target.value;
                    setFormCategoria({ ...formCategoria, nombre });
                    if (erroresCategoria.nombre) setErroresCategoria(prev => ({ ...prev, nombre: validarNombreCategoria(nombre) }));
                  }}
                  onBlur={() => setErroresCategoria(prev => ({ ...prev, nombre: validarNombreCategoria(formCategoria.nombre) }))} />
                {erroresCategoria.nombre && <p className="gestproductos-field-error">{erroresCategoria.nombre}</p>}
              </div>
              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Descripción</label>
                <textarea className="gestproductos-form-input" rows={3} placeholder="Descripción breve de la categoría (opcional)"
                  value={formCategoria.descripcion || ""} maxLength={MAX_LONGITUD_TEXTO_LIBRE}
                  onChange={e => setFormCategoria({ ...formCategoria, descripcion: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
        <div className="gestproductos-modal-footer">
          <button className="gestproductos-btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="gestproductos-btn-primary" onClick={guardarCategoria}>
            {editarCategoria ? "Actualizar" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
