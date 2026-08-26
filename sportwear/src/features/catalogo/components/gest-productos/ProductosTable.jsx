import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconEye, IconTrash } from "../../../../shared/components/Icons";
import VariantesMasDropdown from "./VariantesMasDropdown";
import {
  fmt, stockBadge, agruparVariantesPorColor, esColorClaro, anchoChip,
  ANCHO_COL_VARIANTES, ANCHO_CHIP_MAS, GAP_CHIPS,
} from "../../utils/gestProductosHelpers.jsx";

export default function ProductosTable({
  datos, tienePerm,
  variantesDropdownAbierto, setVariantesDropdownAbierto,
  togglePublicado, toggleEstadoProducto,
  abrirDetalle, abrirEditar, setEliminarId,
  totalPaginasProductos, paginaProductos, setPaginaProductos, totalProductos,
}) {
  return (
    <div className="gestproductos-table-container">
      <table className="tbl gestproductos-tabla">
        <thead className="tbl-header">
          <tr>
            <th className="tbl-th gestproductos-th-imagen">Imagen</th>
            <th className="tbl-th gestproductos-th-producto">Producto</th>
            <th className="tbl-th gestproductos-th-compacto gestproductos-th-precio">Precio</th>
            <th className="tbl-th gestproductos-th-compacto gestproductos-th-stock">Stock</th>
            <th className="tbl-th gestproductos-th-variantes">Tallas/Colores</th>
            {tienePerm('Productos.publicar') && <th className="tbl-th gestproductos-th-toggle">Publicado</th>}
            {tienePerm('Productos.estado') && <th className="tbl-th gestproductos-th-toggle">Estado</th>}
            <th className="tbl-th gestproductos-th-acciones">Acciones</th>
          </tr>
        </thead>
        <tbody className="tbl-body">
          {datos.length === 0 ? (
            <tr><td colSpan={8} className="gestproductos-empty-row">No se encontraron productos.</td></tr>
          ) : datos.map((p) => (
            <tr key={p.id_producto} className="tbl-row">
              <td className="tbl-td">
                <div className="gestproductos-img-cell">
                  {p.imagenPrincipal
                    ? <img src={p.imagenPrincipal} alt={p.nombre} className="gestproductos-table-img" />
                    : <div className="gestproductos-img-placeholder">Sin imagen</div>}
                  {p.destacado === "Nuevo" && <span className="gestproductos-img-badge gestproductos-img-badge-nuevo" title="Destacado como Nuevo">N</span>}
                  {p.destacado === "Promocion" && <span className="gestproductos-img-badge gestproductos-img-badge-promo" title="Destacado como Promoción">%</span>}
                </div>
              </td>
              <td className="tbl-td">
                <div className="gestproductos-product-name" title={p.nombre}>{p.nombre}</div>
                <span className="tabla-categoria" title={p.categoria}>{p.categoria}</span>
              </td>
              <td className="tbl-td gestproductos-td-compacto gestproductos-precio-cell">{fmt(p.precio)}</td>
              <td className="tbl-td gestproductos-td-compacto gestproductos-stock-cell">{stockBadge(p.stock ?? 0)}</td>
              <td className="tbl-td">
                {p.variantes?.length > 0 ? (() => {
                  const grupos = agruparVariantesPorColor(p.variantes).map(g => ({ ...g, texto: g.tallas.join(" · ") }));

                  let anchoUsado = 0;
                  let visibles = [];
                  for (let i = 0; i < grupos.length; i++) {
                    const g = grupos[i];
                    const hayMasDespues = i < grupos.length - 1;
                    const anchoNecesario = anchoChip(g.texto) + (visibles.length > 0 ? GAP_CHIPS : 0) + (hayMasDespues ? ANCHO_CHIP_MAS + GAP_CHIPS : 0);
                    if (anchoUsado + anchoNecesario > ANCHO_COL_VARIANTES) break;
                    visibles.push(g);
                    anchoUsado += anchoChip(g.texto) + (visibles.length > 1 ? GAP_CHIPS : 0);
                  }
                  const restantes = grupos.length - visibles.length;

                  return (
                    <div className="gestproductos-variantes-cell">
                      {visibles.map(g => {
                        const swatchStyle = esColorClaro(g.codigo_hex)
                          ? { background: g.codigo_hex || "#ccc", border: "2px solid #ccc" }
                          : { background: g.codigo_hex || "#ccc" };
                        return (
                          <span key={g.id_color} className="gestproductos-variante-chip" title={`${g.nombre}: ${g.tallas.join(", ")}`}>
                            <span className="gestproductos-variante-swatch" style={swatchStyle} />
                            <span className="gestproductos-variante-tallas">{g.texto}</span>
                          </span>
                        );
                      })}
                      {restantes > 0 && (
                        <VariantesMasDropdown
                          grupos={grupos.slice(visibles.length)}
                          restantes={restantes}
                          productoId={p.id_producto}
                          abierto={variantesDropdownAbierto === p.id_producto}
                          onToggle={setVariantesDropdownAbierto}
                        />
                      )}
                    </div>
                  );
                })() : (
                  <span className="gestproductos-sin-variantes">Sin variantes</span>
                )}
              </td>
              {tienePerm('Productos.publicar') && (
                <td className="tbl-td gestproductos-td-toggle">
                  <StatusToggle
                    id={p.id_producto}
                    estado={p.publicado ? "Activo" : "Inactivo"}
                    onToggle={(id) => togglePublicado(id)}
                    showConfirmation={false}
                    labels={{ activo: "Sí", inactivo: "No" }}
                    size="sm"
                  />
                </td>
              )}
              {tienePerm('Productos.estado') && (
                <td className="tbl-td gestproductos-td-toggle">
                  <StatusToggle id={p.id_producto} estado={p.estado} onToggle={toggleEstadoProducto} showConfirmation={true} size="sm" nombreRegistro={p.nombre} />
                </td>
              )}
              <td className="tbl-td">
                <div className="gestproductos-action-cell">
                  <button className="gestproductos-action-btn gestproductos-view-btn" onClick={() => abrirDetalle(p)}><IconEye /></button>
                  {tienePerm('Productos.editar') && (
                    <button className="gestproductos-action-btn gestproductos-edit-btn" onClick={() => abrirEditar(p)}><IconEdit /></button>
                  )}
                  {tienePerm('Productos.eliminar') && (
                    <button className="gestproductos-action-btn gestproductos-delete-btn" title="Eliminar producto" onClick={() => setEliminarId(p.id_producto)}><IconTrash /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPaginasProductos > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPaginaProductos(p => Math.max(p - 1, 1))} disabled={paginaProductos === 1}>‹</button>
          {Array.from({ length: totalPaginasProductos }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === paginaProductos ? "paginador-btn-active" : ""}`} onClick={() => setPaginaProductos(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPaginaProductos(p => Math.min(p + 1, totalPaginasProductos))} disabled={paginaProductos === totalPaginasProductos}>›</button>
          <span className="paginador-info">Página {paginaProductos} de {totalPaginasProductos} · {totalProductos} registros</span>
        </div>
      )}
    </div>
  );
}
