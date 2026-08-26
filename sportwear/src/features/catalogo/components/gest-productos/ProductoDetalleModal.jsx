import GaleriaImagenes from "../../../../shared/components/GaleriaImagenes";
import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconEdit, IconX } from "../../../../shared/components/Icons";
import { fmt, agruparVariantesPorColor, esColorClaro } from "../../utils/gestProductosHelpers.jsx";

export default function ProductoDetalleModal({ verDetalle, setVerDetalle, tienePerm, abrirEditar }) {
  if (!verDetalle) return null;

  const DetalleInfoGeneral = (
    <>
      <div className="gestproductos-factura-seccion">
        <h3 className="gestproductos-factura-titulo">Información general</h3>
        <DetalleGrid>
          <DetalleItem label="ID" value={`#${String(verDetalle.id_producto).padStart(3, "0")}`} />
          <DetalleItem label="Código" value={verDetalle.codigo} />
          <DetalleItem label="Categoría" value={verDetalle.categoria} />
          <DetalleItem label="Precio base" value={fmt(verDetalle.precio)} />
          <DetalleItem label="Stock total" value={`${verDetalle.stock ?? 0} unidades`} />
          <DetalleItem label="Publicado" value={verDetalle.publicado ? "Sí, visible en catálogo" : "No publicado"} />
          <DetalleItem label="Estado" value={<span className={`tabla-status${verDetalle.estado === "Activo" ? " activo" : " inactivo"}`}>{verDetalle.estado}</span>} />
          <DetalleItem label="Destacado" value={verDetalle.destacado === "Nuevo" ? "Nuevo" : verDetalle.destacado === "Promocion" ? "Promoción" : "Ninguno"} />
        </DetalleGrid>
      </div>
      {verDetalle.historialPrecios?.length > 0 && (
        <div className="gestproductos-factura-seccion">
          <h3 className="gestproductos-factura-titulo">Historial de precios</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {verDetalle.historialPrecios.map(h => (
              <div key={h.id_historial} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 12 }}>
                <span>{new Date(h.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })} {h.usuario ? `· ${h.usuario}` : ""}</span>
                <span>{fmt(h.precio_anterior)} <span style={{ color: "var(--dvna-muted)" }}>→</span> <b>{fmt(h.precio_nuevo)}</b></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const DetalleVariantesImagenes = (
    <>
      {verDetalle.variantes?.length > 0 && (() => {
        const conStock = verDetalle.variantes.filter(v => v.stock > 0);
        const sinStock = verDetalle.variantes.filter(v => v.stock === 0);
        const gruposConStock = agruparVariantesPorColor(conStock);
        const gruposSinStock = agruparVariantesPorColor(sinStock);
        // ── NUEVO: cada variante (talla) puede tener su propio precio —
        // antes el chip solo mostraba "L, M, S" sin decir a qué precio
        // vende cada una. Se arma un mapa talla->precio por color para
        // mostrar el precio de cada talla individualmente cuando alguna
        // difiere del precio base del producto. ──
        const preciosPorColor = new Map();
        verDetalle.variantes.forEach(v => {
          if (!preciosPorColor.has(v.id_color)) preciosPorColor.set(v.id_color, new Map());
          preciosPorColor.get(v.id_color).set(v.talla, v.precio);
        });
        const renderChip = (g, agotada) => {
          const swatchStyle = esColorClaro(g.codigo_hex)
            ? { background: g.codigo_hex || "#ccc", border: "2px solid #ccc" }
            : { background: g.codigo_hex || "#ccc" };
          const mapaPrecios = preciosPorColor.get(g.id_color) || new Map();
          // Si TODAS las tallas de este color tienen el mismo precio (o
          // ninguna tiene precio propio), se muestra un solo precio al
          // final. Si varían entre sí, se muestra el precio junto a cada talla.
          const preciosDistintos = new Set(
            g.tallas.map(t => Number(mapaPrecios.get(t) ?? verDetalle.precio))
          );
          const hayVariacion = preciosDistintos.size > 1;
          return (
            <div key={g.id_color} className={`gestproductos-detalle-variante-chip${agotada ? " agotada" : ""}`}>
              <span className="gestproductos-detalle-variante-dot" style={swatchStyle} />
              {hayVariacion ? (
                <span>
                  {g.nombre}: {g.tallas.map((t, i) => (
                    <span key={t}>
                      {i > 0 && ", "}
                      {t} <span style={{ color: "var(--dvna-circle)", fontWeight: 600 }}>({fmt(mapaPrecios.get(t) ?? verDetalle.precio)})</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span>
                  {g.nombre}: {g.tallas.join(", ")}
                  {" "}<span style={{ color: "var(--dvna-circle)", fontWeight: 600 }}>({fmt([...preciosDistintos][0])})</span>
                </span>
              )}
              {agotada && <span className="gestproductos-detalle-variante-stock"> · Agotado</span>}
            </div>
          );
        };
        return (
          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Variantes</h3>
            <p style={{ fontSize: 11, color: "var(--dvna-muted)", margin: "0 0 10px" }}>
              Si una talla no tiene precio propio, se usa el precio base del producto (mostrado arriba).
            </p>
            <div className="gestproductos-detalle-variantes-cell">
              {gruposConStock.map(g => renderChip(g, false))}
            </div>
            {gruposSinStock.length > 0 && (
              <>
                <div className="gestproductos-detalle-variantes-divider"><span>Sin stock</span></div>
                <div className="gestproductos-detalle-variantes-cell">
                  {gruposSinStock.map(g => renderChip(g, true))}
                </div>
              </>
            )}
          </div>
        );
      })()}
      <div className="gestproductos-factura-seccion">
        <h3 className="gestproductos-factura-titulo">Imágenes</h3>
        <GaleriaImagenes tipoReferencia="Producto" idReferencia={verDetalle.id_producto} soloLectura />
      </div>
    </>
  );

  return (
    <div className="gestproductos-modal-overlay" onClick={() => setVerDetalle(null)}>
      <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="gestproductos-modal-header">
          <div>
            <h2 className="gestproductos-modal-title">{verDetalle.nombre}</h2>
            <p className="gestproductos-modal-subtitulo">Detalle del producto</p>
          </div>
          <button className="gestproductos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
        </div>

        <div className="gestproductos-modal-body gestproductos-factura-body">
          {DetalleInfoGeneral}
          {DetalleVariantesImagenes}
        </div>

        <div className="gestproductos-modal-footer">
          <button className="gestproductos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
          {tienePerm('Productos.editar') && (
            <button className="gestproductos-btn-primary" onClick={() => { setVerDetalle(null); abrirEditar(verDetalle); }}>
              <IconEdit /> Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
