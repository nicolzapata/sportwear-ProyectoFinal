import { IconBox, IconEdit, IconX } from "../../../../shared/components/Icons";
import { IconExternalLink } from "./icons";
import { precioMostrado } from "../../utils/catalogoAdminHelpers";

export default function VistaRapidaModal({ verRapido, setVerRapido, tienePerm, navigate }) {
  return (
    <div className="catadmin-modal-overlay" onClick={() => setVerRapido(null)}>
      <div className="catadmin-modal" onClick={(e) => e.stopPropagation()}>
        <button className="catadmin-modal-close" onClick={() => setVerRapido(null)}><IconX /></button>

        <div className="catadmin-modal-img-wrap">
          {verRapido.imagenPrincipal ? (
            <img src={verRapido.imagenPrincipal} alt={verRapido.nombre} className="catadmin-modal-img" />
          ) : (
            <div className="catadmin-modal-img-placeholder"><IconBox /></div>
          )}
        </div>

        <div className="catadmin-modal-body">
          <span className="catadmin-card-categoria">{verRapido.categoria}</span>
          <h2 className="catadmin-modal-nombre">{verRapido.nombre}</h2>
          {verRapido.descripcion && <p className="catadmin-modal-descripcion">{verRapido.descripcion}</p>}

          <div className="catadmin-modal-info-grid">
            <div><span className="catadmin-modal-info-label">Código</span><span className="catadmin-modal-info-valor">{verRapido.codigo || "—"}</span></div>
            <div><span className="catadmin-modal-info-label">Precio</span><span className="catadmin-modal-info-valor">{precioMostrado(verRapido)}</span></div>
            <div><span className="catadmin-modal-info-label">Stock total</span><span className="catadmin-modal-info-valor">{verRapido.stock ?? 0} unidades</span></div>
            <div><span className="catadmin-modal-info-label">Estado</span><span className={`catadmin-modal-info-valor ${verRapido.estado === "Activo" ? "activo" : "inactivo-txt"}`}>{verRapido.estado}</span></div>
          </div>

          {verRapido.variantes?.length > 0 && (
            <div className="catadmin-modal-seccion">
              <h4 className="catadmin-modal-seccion-titulo">Variantes</h4>
              <div className="catadmin-modal-variantes">
                {verRapido.variantes.map(v => (
                  <div key={v.id_variante} className="catadmin-modal-variante-item">
                    <span className="catadmin-modal-variante-dot" style={{ background: v.codigo_hex || "#ccc" }} />
                    <span>{v.color_nombre} · {v.talla}</span>
                    <span className="catadmin-modal-variante-stock">{v.stock} uds</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="catadmin-modal-footer">
            <a
              className="catadmin-modal-link-tienda"
              href={`/catalogo/${verRapido.id_producto}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver en la tienda <IconExternalLink />
            </a>
            {tienePerm('Productos.editar') && (
              <button
                className="catadmin-modal-btn-editar"
                onClick={() => navigate(`/productos?edit=${verRapido.id_producto}`)}
              >
                <IconEdit /> Editar producto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
