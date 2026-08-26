import { MAX_LONGITUD_NOMBRE_COLOR, getBrightness } from "../../utils/gestProductosHelpers.jsx";
import { IconX } from "../../../../shared/components/Icons";

export default function ColorFormModal({
  editarColor, setModal,
  formColor, setFormColor,
  erroresColor, setErroresColor, mensajeErrorNombreColor,
  guardarColor,
}) {
  return (
    <div className="gestproductos-modal-overlay" onClick={() => setModal(false)}>
      <div className="gestproductos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gestproductos-modal-header">
          <h2 className="gestproductos-modal-title">{editarColor ? "Editar color" : "Nuevo color"}</h2>
          <button className="gestproductos-modal-close" onClick={() => setModal(false)}><IconX /></button>
        </div>
        <div className="gestproductos-modal-body gestproductos-factura-body">
          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Color y nombre</h3>
            <div>
              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Color HEX <span className="gestproductos-required">*</span></label>
                <div className="colores-color-picker-wrapper">
                  <input
                    type="color"
                    className={`colores-color-picker${erroresColor.codigo_hex ? " input-error" : ""}`}
                    value={formColor.codigo_hex}
                    onChange={e => {
                      setFormColor({ ...formColor, codigo_hex: e.target.value });
                      if (erroresColor.codigo_hex) setErroresColor(prev => ({ ...prev, codigo_hex: "" }));
                    }}
                  />
                  <span className="colores-color-value">{formColor.codigo_hex}</span>
                </div>
                {erroresColor.codigo_hex && <p className="gestproductos-field-error">{erroresColor.codigo_hex}</p>}
              </div>
              <div className="colores-preview" style={{ marginTop: 8 }}>
                <div className="colores-preview-label">Vista previa</div>
                <div className="colores-preview-sample" style={{ backgroundColor: formColor.codigo_hex }}>
                  <span style={{ color: getBrightness(formColor.codigo_hex) > 128 ? '#000' : '#fff' }}>{formColor.nombre || 'Color'}</span>
                </div>
              </div>
              <div className="gestproductos-form-group">
                <label className="gestproductos-form-label">Nombre del color <span className="gestproductos-required">*</span></label>
                <input type="text" className={`gestproductos-form-input${erroresColor.nombre ? " input-error" : ""}`} placeholder="Ej: Rojo Intenso"
                  value={formColor.nombre} maxLength={MAX_LONGITUD_NOMBRE_COLOR}
                  onChange={e => {
                    const nombre = e.target.value;
                    setFormColor({ ...formColor, nombre });
                    if (erroresColor.nombre) setErroresColor(prev => ({ ...prev, nombre: mensajeErrorNombreColor(nombre) }));
                  }}
                  onBlur={() => setErroresColor(prev => ({ ...prev, nombre: mensajeErrorNombreColor(formColor.nombre) }))} />
                {erroresColor.nombre && <p className="gestproductos-field-error">{erroresColor.nombre}</p>}
              </div>
            </div>
          </div>
        </div>
        <div className="gestproductos-modal-footer">
          <button className="gestproductos-btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
          <button className="gestproductos-btn-primary" onClick={guardarColor}>
            {editarColor ? "Actualizar" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
