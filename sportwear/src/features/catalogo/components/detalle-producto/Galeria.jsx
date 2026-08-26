import { IconChevronLeft, IconChevronRight, IconSparkle, IconTagPromo } from "./detalleProductoIcons";

export default function Galeria({
  imgUrls, imgActiva, setImgActiva, producto, prev, next,
  agotado, sinSeleccion, stockMostrado, onPreview,
}) {
  const total = imgUrls.length;

  return (
    <div className="dp-gallery">
      {total > 1 && (
        <div className="dp-thumbs">
          {imgUrls.map((url, i) => (
            <button
              key={i}
              className={`dp-thumb${i === imgActiva ? " active" : ""}`}
              onClick={() => setImgActiva(i)}
            >
              <img src={url} alt={`Vista ${i + 1}`} />
            </button>
          ))}
        </div>
      )}

      <div className="dp-main-img-wrap">
        {total > 0 ? (
          <>
            <img
              className="dp-main-img"
              src={imgUrls[imgActiva]}
              alt={producto.nombre}
              onClick={onPreview}
              style={{ cursor: "zoom-in" }}
            />

            {total > 1 && (
              <>
                <button className="dp-arrow dp-arrow-left" onClick={prev}>
                  <IconChevronLeft />
                </button>
                <button className="dp-arrow dp-arrow-right" onClick={next}>
                  <IconChevronRight />
                </button>
                <div className="dp-img-dots">
                  {imgUrls.map((_, i) => (
                    <button
                      key={i}
                      className={`dp-img-dot${i === imgActiva ? " active" : ""}`}
                      onClick={() => setImgActiva(i)}
                    />
                  ))}
                </div>
              </>
            )}

            {producto.destacado === "Nuevo" && <span className="dp-badge dp-badge-nuevo"><IconSparkle /> Nuevo</span>}
            {producto.destacado === "Promocion" && <span className="dp-badge dp-badge-promo"><IconTagPromo /> Promoción</span>}
            {agotado && !sinSeleccion && (
              <span className="dp-badge dp-badge-out" style={producto.destacado ? { top: 42 } : undefined}>Agotado</span>
            )}
            {!agotado && !sinSeleccion && stockMostrado < 5 && (
              <span className="dp-badge dp-badge-warn" style={producto.destacado ? { top: 42 } : undefined}>Pocas unidades</span>
            )}
          </>
        ) : (
          <div className="dp-no-img">Sin imagen</div>
        )}
      </div>
    </div>
  );
}
