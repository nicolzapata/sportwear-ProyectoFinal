export default function CatalogoHero() {
  return (
    <div className="nov-hero-wrapper">
      <section className="nov-hero">
        <div className="nov-hero-bg" aria-hidden="true">
          <div className="nov-hero-circle c1" />
          <div className="nov-hero-circle c2" />
          <div className="nov-hero-circle c3" />
        </div>

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
