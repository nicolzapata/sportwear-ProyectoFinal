import { IconBox, IconEdit, IconEye } from "../../../../shared/components/Icons";
import { IconSparkle, IconTagPromo } from "./icons";
import { fmt, stockPct, stockClase } from "../../utils/catalogoAdminHelpers";

export default function ProductoCard({ p, tienePerm, setVerRapido, navigate, togglePublicado, toggleEstado }) {
  return (
    <div className="catadmin-card">
      <div className="catadmin-card-img-wrap" onClick={() => setVerRapido(p)}>
        {p.imagenPrincipal ? (
          <img src={p.imagenPrincipal} alt={p.nombre} className="catadmin-card-img" />
        ) : (
          <div className="catadmin-card-img-placeholder"><IconBox /></div>
        )}

        <div className="catadmin-card-top-badges">
          <span className={`catadmin-badge-pill${p.publicado ? " publicado" : ""}`}>
            {p.publicado ? "Publicado" : "Oculto"}
          </span>
          {p.destacado === "Nuevo" && <span className="catadmin-badge-pill nuevo"><IconSparkle /> Nuevo</span>}
          {p.destacado === "Promocion" && <span className="catadmin-badge-pill promo"><IconTagPromo /> Promoción</span>}
          {p.estado === "Inactivo" && <span className="catadmin-badge-pill inactivo">Inactivo</span>}
        </div>

        {/* Overlay de acciones — aparece al hover */}
        <div className="catadmin-card-overlay">
          <button
            className="catadmin-overlay-btn"
            title="Vista rápida"
            onClick={(e) => { e.stopPropagation(); setVerRapido(p); }}
          >
            <IconEye />
          </button>
          {tienePerm('Productos.editar') && (
            <button
              className="catadmin-overlay-btn"
              title="Editar producto"
              onClick={(e) => { e.stopPropagation(); navigate(`/productos?edit=${p.id_producto}`); }}
            >
              <IconEdit />
            </button>
          )}
        </div>
      </div>

      <div className="catadmin-card-body">
        <span className="catadmin-card-categoria">{p.categoria}</span>
        <h3 className="catadmin-card-nombre" title={p.nombre}>{p.nombre}</h3>
        <div className="catadmin-card-precio-row">
          <span className="catadmin-card-precio">{fmt(p.precio)}</span>
          <span className={`catadmin-card-stock-label ${stockClase(p.stock ?? 0)}`}>
            {p.stock === 0 ? "Agotado" : `${p.stock ?? 0} uds`}
          </span>
        </div>
        <div className="catadmin-stock-bar-track">
          <div className={`catadmin-stock-bar-fill ${stockClase(p.stock ?? 0)}`} style={{ width: `${stockPct(p.stock ?? 0)}%` }} />
        </div>
      </div>

      <div className="catadmin-card-footer">
        {tienePerm('Productos.publicar') && (
          <label className={`catadmin-switch${p.estado === "Inactivo" ? " disabled" : ""}`} title={p.estado === "Inactivo" ? "No se puede publicar un producto inactivo" : "Publicar / ocultar del catálogo"}>
            <input
              type="checkbox"
              checked={!!p.publicado}
              disabled={p.estado === "Inactivo"}
              onChange={() => togglePublicado(p)}
            />
            <span className="catadmin-switch-track"><span className="catadmin-switch-thumb" /></span>
            <span className="catadmin-switch-label">{p.publicado ? "Publicado" : "Oculto"}</span>
          </label>
        )}
        {tienePerm('Productos.estado') && (
          <button
            className={`catadmin-footer-estado${p.estado === "Activo" ? " activo" : " inactivo"}`}
            onClick={() => toggleEstado(p)}
          >
            {p.estado}
          </button>
        )}
      </div>
    </div>
  );
}
