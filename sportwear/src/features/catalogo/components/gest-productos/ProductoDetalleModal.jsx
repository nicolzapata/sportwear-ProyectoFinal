import { useEffect, useState } from "react";
import api from "../../../../shared/services/api";
import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import DetallePanel from "../../../../shared/components/DetallePanel";
import { IconChevronLeft, IconChevronRight, IconImage } from "../../../../shared/components/Icons";
import { getInitials, getAvatarColor } from "../../../../shared/utils/texto";
import { filtrarImagenes } from "../../utils/detalleProductoHelpers";
import { fmt, precioMostrado, agruparVariantesPorColor, esColorClaro } from "../../utils/gestProductosHelpers.jsx";

// Panel acoplado a la tabla (mismo criterio que Usuarios/Proveedores/Colores):
// "Ver detalle" ya no abre un modal centrado, se ve como panel al lado de la
// tabla. La galería va primero (igual que el detalle de Colores) y se
// comporta como en la ficha pública del catálogo: carrusel de a una foto,
// colores clicleables arriba que filtran esas fotos, y tallas que dependen
// del color elegido.
export default function ProductoDetalleModal({ verDetalle, setVerDetalle, tienePerm, abrirEditar }) {
  const [imagenes, setImagenes] = useState([]);
  const [colorSel, setColorSel] = useState(null);
  const [imgActiva, setImgActiva] = useState(0);

  const grupos = verDetalle?.variantes?.length > 0 ? agruparVariantesPorColor(verDetalle.variantes) : [];

  useEffect(() => {
    if (!verDetalle) return;
    setColorSel(grupos[0] || null);
    setImgActiva(0);
    setImagenes([]);
    api.get(`/imagenes?tipo=Producto&id=${verDetalle.id_producto}`)
      .then(({ data }) => setImagenes(data || []))
      .catch(() => setImagenes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verDetalle?.id_producto]);

  if (!verDetalle) return null;

  const imgUrls = filtrarImagenes(imagenes, colorSel?.id_color ?? null);
  const total = imgUrls.length;
  const prev = () => setImgActiva(i => (i - 1 + total) % total);
  const next = () => setImgActiva(i => (i + 1) % total);

  const stockPorColor = new Map();
  verDetalle.variantes?.forEach(v => {
    if (!stockPorColor.has(v.id_color)) stockPorColor.set(v.id_color, new Map());
    stockPorColor.get(v.id_color).set(v.talla, v.stock);
  });
  const mapaStock = stockPorColor.get(colorSel?.id_color) || new Map();

  const seleccionarColor = (g) => {
    setColorSel(g);
    setImgActiva(0);
  };

  const DetalleGaleria = (
    <div className="gestproductos-factura-seccion">
      <div className="gestproductos-detalle-carrusel-wrap">
        {total > 0 ? (
          <>
            <img className="gestproductos-detalle-carrusel-img" src={imgUrls[imgActiva]} alt={verDetalle.nombre} />
            {total > 1 && (
              <>
                <button className="gestproductos-detalle-carrusel-flecha izq" onClick={prev} type="button"><IconChevronLeft /></button>
                <button className="gestproductos-detalle-carrusel-flecha der" onClick={next} type="button"><IconChevronRight /></button>
                <div className="gestproductos-detalle-carrusel-dots">
                  {imgUrls.map((_, i) => (
                    <button key={i} className={`gestproductos-detalle-carrusel-dot${i === imgActiva ? " active" : ""}`} onClick={() => setImgActiva(i)} type="button" />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="gestproductos-detalle-carrusel-vacio"><IconImage /><span>Sin fotos para este color</span></div>
        )}
      </div>

      {grupos.length > 0 && (
        <div className="gestproductos-detalle-color-chips-row">
          {grupos.map(g => {
            const swatchStyle = esColorClaro(g.codigo_hex)
              ? { background: g.codigo_hex || "#ccc", border: "2px solid #ccc" }
              : { background: g.codigo_hex || "#ccc" };
            return (
              <button
                key={g.id_color}
                type="button"
                title={g.nombre}
                className={`gestproductos-detalle-color-chip-btn${colorSel?.id_color === g.id_color ? " selected" : ""}`}
                style={swatchStyle}
                onClick={() => seleccionarColor(g)}
              />
            );
          })}
        </div>
      )}

      {colorSel?.tallas?.length > 0 && (
        <div className="gestproductos-detalle-tallas-row">
          {colorSel.tallas.map(t => {
            const stock = Number(mapaStock.get(t) ?? 0);
            return (
              <span key={t} className={`gestproductos-detalle-talla-chip${stock === 0 ? " agotada" : ""}`} title={stock === 0 ? "Agotada" : `${stock} uds`}>
                {t}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  const DetalleInfoGeneral = (
    <>
      <div className="gestproductos-factura-seccion">
        <h3 className="gestproductos-factura-titulo">Información general</h3>
        <DetalleGrid>
          <DetalleItem label="ID" value={`#${String(verDetalle.id_producto).padStart(3, "0")}`} />
          <DetalleItem label="Código" value={verDetalle.codigo} />
          <DetalleItem label="Categoría" value={verDetalle.categoria} />
          <DetalleItem label="Precio de venta" value={precioMostrado(verDetalle)} />
          <DetalleItem label="Precio base (respaldo sin variante)" value={fmt(verDetalle.precio)} />
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

  return (
    <DetallePanel
      iniciales={getInitials(verDetalle.nombre)}
      avatarColor={getAvatarColor(verDetalle.id_producto)}
      nombre={verDetalle.nombre}
      subtitulo="Detalle del producto"
      onClose={() => setVerDetalle(null)}
      onEditar={tienePerm('Productos.editar') ? () => { setVerDetalle(null); abrirEditar(verDetalle); } : undefined}
      editarLabel="Editar producto"
    >
      {DetalleGaleria}
      {DetalleInfoGeneral}
    </DetallePanel>
  );
}
