import { IconEdit, IconEye, IconTrash } from "../../../../shared/components/Icons";
import { precioMostrado, agruparVariantesPorColor } from "../../utils/gestProductosHelpers.jsx";

// Antes se cortaba en 2 puntos de color con un "+N" aunque la tarjeta tuviera
// espacio de sobra — se sube el tope para que se aprovechen los ~220px de
// ancho de la tarjeta (ver .gestproductos-grid en GestProductos.grid.css)
// antes de recurrir al "+N".
const MAX_COLORES_VISIBLES = 6;

// ── Tarjeta de producto de la vista de tarjetas de "Productos" ────────────
// Componente independiente del ProductoCard de CatalogoAdmin (esa vitrina es
// de cara al público/otro flujo) — esta tarjeta es específica de la gestión
// interna: badge de stock con punto de color, categoría, chips de color y
// lista de tallas, y las mismas acciones que ya existían en la tabla
// (ver/editar/eliminar), solo que en formato tarjeta.
export default function ProductoCardGestion({ producto: p, tienePerm, abrirDetalle, abrirEditar, setEliminarId, menuAbierto, setMenuAbierto }) {
  const stock = p.stock ?? 0;
  const stockClase = stock === 0 ? "agotado" : stock <= 6 ? "bajo" : "normal";
  const stockTexto = stock === 0 ? "Agotado" : stock <= 6 ? `${stock} uds (Bajo Stock)` : `${stock} uds en stock`;

  const grupos = p.variantes?.length > 0 ? agruparVariantesPorColor(p.variantes) : [];
  const tallasUnicas = [...new Set((p.variantes || []).map(v => v.talla))];
  const menuEstaAbierto = menuAbierto === p.id_producto;

  return (
    <div className="gestproductos-card">
      <div className="gestproductos-card-img-wrap">
        {p.imagenPrincipal
          ? <img src={p.imagenPrincipal} alt={p.nombre} className="gestproductos-card-img" />
          : <div className="gestproductos-card-img-placeholder">Sin imagen</div>}

        <span className={`gestproductos-card-stock-badge ${stockClase}`}>
          <span className="gestproductos-card-stock-dot" />
          {stockTexto}
        </span>
        {p.categoria && <span className="gestproductos-card-cat-badge">{p.categoria}</span>}

        <button type="button" className="gestproductos-card-overlay" onClick={() => abrirDetalle(p)}>
          <IconEye /> Vista rápida
        </button>
      </div>

      <div className="gestproductos-card-body">
        <div className="gestproductos-card-nombre" title={p.nombre}>{p.nombre}</div>
        {p.codigo && <span className="gestproductos-card-sku">#{p.codigo}</span>}

        <div className="gestproductos-card-precio">
          {precioMostrado(p)} <span className="gestproductos-card-precio-moneda">COP</span>
        </div>

        <div className="gestproductos-card-variantes-row">
          <div className="gestproductos-card-colores">
            {grupos.slice(0, MAX_COLORES_VISIBLES).map(c => (
              <span key={c.id_color} className="gestproductos-card-color-dot" style={{ background: c.codigo_hex || "#ccc" }} title={c.nombre} />
            ))}
            {grupos.length > MAX_COLORES_VISIBLES && <span className="gestproductos-card-color-mas">+{grupos.length - MAX_COLORES_VISIBLES}</span>}
            {grupos.length === 0 && <span className="gestproductos-card-sin-variantes">Sin colores</span>}
          </div>
          {tallasUnicas.length > 0 && (
            <span className="gestproductos-card-tallas">{tallasUnicas.join(" · ")}</span>
          )}
        </div>

        <div className="gestproductos-card-footer">
          <span className={`gestproductos-card-estado${p.publicado ? "" : " apagado"}`}>
            {p.publicado ? "Publicado" : "No publicado"}
          </span>
          <div className="gestproductos-card-acciones">
            {tienePerm('Productos.editar') && (
              <button type="button" className="gestproductos-card-btn" title="Editar" onClick={() => abrirEditar(p)}>
                <IconEdit />
              </button>
            )}
            <div className="gestproductos-card-menu-wrap">
              <button type="button" className="gestproductos-card-btn" title="Más acciones" onClick={() => setMenuAbierto(menuEstaAbierto ? null : p.id_producto)}>
                ⋮
              </button>
              {menuEstaAbierto && (
                <div className="gestproductos-card-menu" onMouseLeave={() => setMenuAbierto(null)}>
                  <button type="button" onClick={() => { setMenuAbierto(null); abrirDetalle(p); }}><IconEye /> Ver detalle</button>
                  {tienePerm('Productos.eliminar') && (
                    <button type="button" className="danger" onClick={() => { setMenuAbierto(null); setEliminarId(p.id_producto); }}><IconTrash /> Eliminar</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
