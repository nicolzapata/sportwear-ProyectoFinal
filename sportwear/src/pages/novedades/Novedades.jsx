// src/pages/novedades/Novedades.jsx
import { useState } from "react";
import "./Novedades.css";

const NOVEDADES = [
  { id: 1,  nombre: "Top Deportivo DVNA Active",       categoria: "Tops",      precio: 85000,  badge: "Nuevo",        color: "#d4a5a5" },
  { id: 2,  nombre: "Leggins Seamless DVNA Fit",       categoria: "Leggins",   precio: 135000, badge: "Más vendido",  color: "#a5b4d4" },
  { id: 3,  nombre: "Buzo Crop DVNA Fleece",           categoria: "Abrigos",   precio: 165000, badge: "Nuevo",        color: "#b4d4a5" },
  { id: 4,  nombre: "Short Deportivo DVNA Run",        categoria: "Shorts",    precio: 70000,  badge: "Nuevo",        color: "#d4cda5" },
  { id: 5,  nombre: "Top Deportivo Alto Impacto DVNA", categoria: "Tops",      precio: 95000,  badge: "Trending",     color: "#c4a5d4" },
  { id: 6,  nombre: "Leggins Compresión DVNA Flex",    categoria: "Leggins",   precio: 125000, badge: "Nuevo",        color: "#a5d4cd" },
  { id: 7,  nombre: "Chaqueta Deportiva DVNA Wind",    categoria: "Abrigos",   precio: 198000, badge: "Exclusivo",    color: "#d4b8a5" },
  { id: 8,  nombre: "Conjunto Deportivo DVNA Set",     categoria: "Sets",      precio: 210000, badge: "Promo",        color: "#d4a5b8" },
];

const CATEGORIAS = ["Todas", "Tops", "Leggins", "Abrigos", "Shorts", "Sets"];

const fmt = (n) => new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0
}).format(n);

export default function Novedades() {
  const [activa, setActiva] = useState("Todas");

  const filtradas = activa === "Todas"
    ? NOVEDADES
    : NOVEDADES.filter((p) => p.categoria === activa);

  return (
    <div className="nov-page">

      {/* ── Hero ── */}
      <section className="nov-hero">
        <div className="nov-hero-tape" aria-hidden="true">
          {Array(6).fill("DVNA · NUEVA COLECCIÓN · SPORTWEAR · ").map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>

        <div className="nov-hero-content">
          <span className="nov-eyebrow">DVNA 2026</span>
          <h1 className="nov-hero-title">
            Lo nuevo de<br /><em>DVNA</em>
          </h1>
          <p className="nov-hero-sub">
            Ropa deportiva femenina diseñada para tu estilo y comodidad.<br />
            Calidad, tendencia y confianza en cada prenda.
          </p>
        </div>

        <div className="nov-hero-strip">
          <div className="nov-strip-item"><span>⚡</span> Control de inventario en tiempo real</div>
          <div className="nov-strip-sep" />
          <div className="nov-strip-item"><span>💳</span> Compra a crédito y paga a cuotas</div>
          <div className="nov-strip-sep" />
          <div className="nov-strip-item"><span>✦</span> Marca colombiana DVNA</div>
        </div>
      </section>

      {/* ── Filtros ── */}
      <div className="nov-filters">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            className={`nov-filter-btn ${activa === cat ? "active" : ""}`}
            onClick={() => setActiva(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Contador ── */}
      <div className="nov-count">
        {filtradas.length} prenda{filtradas.length !== 1 ? "s" : ""} nuevas
      </div>

      {/* ── Grid productos ── */}
      <div className="nov-grid">
        {filtradas.map((p, i) => (
          <article
            key={p.id}
            className="nov-card"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            {/* Imagen */}
            <div className="nov-card-img" style={{ background: `${p.color}30` }}>
              <div
                className="nov-card-img-inner"
                style={{ background: p.color }}
              />
              <span
                className={`nov-badge ${
                  p.badge === "Trending"
                    ? "badge-trend"
                    : p.badge === "Exclusivo"
                    ? "badge-excl"
                    : p.badge === "Más vendido"
                    ? "badge-top"
                    : ""
                }`}
              >
                {p.badge}
              </span>
            </div>

            {/* Info */}
            <div className="nov-card-body">
              <span className="nov-card-cat">{p.categoria}</span>
              <h3 className="nov-card-name">{p.nombre}</h3>

              <div className="nov-card-footer">
                <span className="nov-card-price">
                  {fmt(p.precio)}
                </span>

                <button
                  className="nov-card-btn"
                  title="Agregar al carrito"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </svg>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ── Newsletter ── */}
      <section className="nov-newsletter">
        <div className="nov-newsletter-inner">
          <div>
            <h2 className="nov-nl-title">Sé parte de DVNA</h2>
            <p className="nov-nl-sub">
              Recibe promociones, descuentos y novedades exclusivas en tu correo.
            </p>
          </div>

          <form
            className="nov-nl-form"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              className="nov-nl-input"
              placeholder="tu@correo.com"
            />
            <button
              type="submit"
              className="nov-nl-btn"
            >
              Suscribirme
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}