import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconEdit, IconX } from "../../../../shared/components/Icons";
import { fmt } from "../../utils/gestProductosHelpers.jsx";

export default function CategoriaDetalleModal({ verDetalleCategoria, setVerDetalleCategoria, tienePerm, abrirEditarCategoria }) {
  if (!verDetalleCategoria) return null;

  return (
    <div className="gestproductos-modal-overlay" onClick={() => setVerDetalleCategoria(null)}>
      <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="gestproductos-modal-header">
          <div>
            <h2 className="gestproductos-modal-title">{verDetalleCategoria.nombre}</h2>
            <p className="gestproductos-modal-subtitulo">Detalle de la categoría</p>
          </div>
          <button className="gestproductos-modal-close" onClick={() => setVerDetalleCategoria(null)}><IconX /></button>
        </div>

        <div className="gestproductos-modal-body gestproductos-factura-body">
          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Información general</h3>
            <DetalleGrid>
              <DetalleItem label="Descripción" value={verDetalleCategoria.descripcion} full />
              <DetalleItem label="Fecha de creación" value={verDetalleCategoria.fecha_creacion ? new Date(verDetalleCategoria.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null} />
              <DetalleItem label="Estado" value={<span className={`tabla-status${verDetalleCategoria.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalleCategoria.estado}</span>} />
            </DetalleGrid>
          </div>

          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Productos en esta categoría ({verDetalleCategoria.productos?.length ?? 0})</h3>
            {verDetalleCategoria.productos?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {verDetalleCategoria.productos.map(p => (
                  <div key={p.id_producto} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 13 }}>
                    <span>{p.nombre} <span style={{ color: "var(--dvna-muted)" }}>· {p.codigo}</span></span>
                    <span style={{ fontWeight: 600 }}>{fmt(p.precio)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--dvna-muted)", fontSize: 13 }}>Esta categoría todavía no tiene productos.</p>
            )}
          </div>
        </div>

        <div className="gestproductos-modal-footer">
          <button className="gestproductos-btn-secondary" onClick={() => setVerDetalleCategoria(null)}>Cerrar</button>
          {tienePerm('Categorias.editar') && (
            <button className="gestproductos-btn-primary" onClick={() => { setVerDetalleCategoria(null); abrirEditarCategoria(verDetalleCategoria); }}>
              <IconEdit /> Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
