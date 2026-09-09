// Panel de detalle acoplado — se muestra al lado de una tabla (no flotando
// encima), igual que el panel de Roles. Sirve tanto para "ver" (secciones de
// solo lectura) como de cascarón para un formulario de edición (children +
// footer propios).
import { IconX, IconEdit } from "./Icons";
import "./DetallePanel.css";

export default function DetallePanel({
  iniciales, avatarColor = "var(--dvna-circle, #b49780)",
  nombre, subtitulo, secciones, children, onClose, onEditar, editarLabel = "Editar", footer,
}) {
  return (
    <div className="detalle-panel">
      <div className="detalle-panel-header">
        <div className="detalle-panel-avatar" style={{ background: avatarColor }}>{iniciales}</div>
        <div className="detalle-panel-titulo">
          <span className="detalle-panel-nombre">{nombre}</span>
          {subtitulo && <span className="detalle-panel-subtitulo">{subtitulo}</span>}
        </div>
        <button className="detalle-panel-close" onClick={onClose} title="Cerrar"><IconX /></button>
      </div>

      <div className="detalle-panel-body">
        {children ?? secciones.map((sec, i) => (
          <div key={i} className="detalle-panel-seccion">
            <div className="detalle-panel-seccion-header">
              <span>{sec.titulo}</span>
              {sec.icono && <span className="detalle-panel-seccion-icono">{sec.icono}</span>}
            </div>
            <div className="detalle-panel-grid">
              {sec.campos.map((campo, j) => (
                <div key={j} className={`detalle-panel-campo${campo.full ? ' full' : ''}`}>
                  <span className="detalle-panel-campo-label">{campo.label}</span>
                  <span className="detalle-panel-campo-valor">
                    {campo.value || campo.value === 0 ? campo.value : <span className="detalle-panel-vacio">No registrado</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="detalle-panel-footer">
        {footer ?? (
          <>
            <button className="detalle-panel-btn-secundario" onClick={onClose}>Cerrar</button>
            {onEditar && (
              <button className="detalle-panel-btn-primario" onClick={onEditar}><IconEdit /> {editarLabel}</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
