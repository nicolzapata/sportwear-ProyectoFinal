import { useState, useEffect, useRef } from "react";
import api from "../../../../shared/services/api";

const MS_AUTOPLAY = 6000;

// El fondo del hero es opcional: mientras el Admin no suba ninguna foto desde
// Catálogo admin → Contenido del inicio, se ve el degradado con círculos de
// siempre. En cuanto haya una o más imágenes "Home", se muestran en un
// carrusel (pasa solo cada MS_AUTOPLAY, y también con las flechas/puntos).
export default function CatalogoHero() {
  const [fotos, setFotos] = useState([]);
  const [idx,   setIdx]   = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    let activo = true;
    api.get("/imagenes?tipo=Home&id=1")
      .then(({ data }) => {
        if (!activo || !data?.length) return;
        setFotos(data);
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (fotos.length < 2) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % fotos.length);
    }, MS_AUTOPLAY);
    return () => clearInterval(timerRef.current);
  }, [fotos.length]);

  const irA = (i) => {
    setIdx(i);
    // Reinicia el autoplay para que no salte justo después de un clic manual.
    if (timerRef.current) clearInterval(timerRef.current);
    if (fotos.length > 1) {
      timerRef.current = setInterval(() => setIdx((v) => (v + 1) % fotos.length), MS_AUTOPLAY);
    }
  };
  const anterior = () => irA((idx - 1 + fotos.length) % fotos.length);
  const siguiente = () => irA((idx + 1) % fotos.length);

  return (
    <div className="nov-hero-wrapper">
      <section className={`nov-hero${fotos.length ? " nov-hero-con-foto" : ""}`}>
        {!fotos.length && (
          <div className="nov-hero-bg" aria-hidden="true">
            <div className="nov-hero-circle c1" />
            <div className="nov-hero-circle c2" />
            <div className="nov-hero-circle c3" />
          </div>
        )}

        {fotos.map((f, i) => (
          <div
            key={f.id_imagen}
            className={`nov-hero-slide${i === idx ? " activa" : ""}`}
            style={{ backgroundImage: `url(${f.url})` }}
            aria-hidden={i !== idx}
          />
        ))}

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

        {fotos.length > 1 && (
          <>
            <button type="button" className="nov-hero-flecha izq" onClick={anterior} aria-label="Foto anterior">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" className="nov-hero-flecha der" onClick={siguiente} aria-label="Foto siguiente">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <div className="nov-hero-dots">
              {fotos.map((f, i) => (
                <button
                  key={f.id_imagen}
                  type="button"
                  className={`nov-hero-dot${i === idx ? " activo" : ""}`}
                  onClick={() => irA(i)}
                  aria-label={`Ir a la foto ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

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
