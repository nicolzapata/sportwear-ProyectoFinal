import { useState, useEffect } from "react";
import api from "../../../../shared/services/api";

// El fondo del hero es opcional: mientras el Admin no suba ninguna foto desde
// Catálogo admin → Contenido del inicio, se ve el degradado con círculos de
// siempre. En cuanto haya al menos una imagen "Home", se usa la marcada como
// principal (o la primera) como foto de fondo.
export default function CatalogoHero() {
  const [fotoFondo, setFotoFondo] = useState(null);

  useEffect(() => {
    let activo = true;
    api.get("/imagenes?tipo=Home&id=1")
      .then(({ data }) => {
        if (!activo || !data?.length) return;
        const principal = data.find(i => i.es_principal) || data[0];
        setFotoFondo(principal?.url || null);
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  return (
    <div className="nov-hero-wrapper">
      <section
        className={`nov-hero${fotoFondo ? " nov-hero-con-foto" : ""}`}
        style={fotoFondo ? { backgroundImage: `url(${fotoFondo})` } : undefined}
      >
        {!fotoFondo && (
          <div className="nov-hero-bg" aria-hidden="true">
            <div className="nov-hero-circle c1" />
            <div className="nov-hero-circle c2" />
            <div className="nov-hero-circle c3" />
          </div>
        )}

        <div className="nov-hero-content">
          <span className="sn-eyebrow">DVNA 2026</span>
          <h1 className="nov-hero-title">
            Lo nuevo de<br /><em>DVNA</em>
          </h1>
          <p className="nov-hero-sub">
            Ropa deportiva femenina diseñada para tu estilo y comodidad.<br />
            Calidad, tendencia y confianza en cada prenda.
          </p>
        </div>

        <div className="nov-hero-strip">
          <div className="nov-strip-item">
            <span className="nov-strip-num">2026</span>
            <span className="nov-stat-label">Control</span>
          </div>
          <div className="nov-strip-sep" />
          <div className="nov-strip-item">
            <span className="nov-strip-num">+500</span>
            <span className="nov-stat-label">Productos</span>
          </div>
          <div className="nov-strip-sep" />
          <div className="nov-strip-item">
            <span className="nov-strip-num">100%</span>
            <span className="nov-stat-label">Calidad</span>
          </div>
        </div>
      </section>
    </div>
  );
}
