// src/pages/sobre-nosotros/SobreNosotros.jsx
import "./SobreNosotros.css";
import { IconBolt, IconShield, IconStar, IconHeart, IconCheck } from "../../components/Icons";

const VALORES = [
  {
    icon: <IconBolt />,
    titulo: "Eficiencia",
    texto: "Optimizamos cada proceso para garantizar una gestión ágil de inventarios, ventas y pedidos en tiempo real.",
  },
  {
    icon: <IconShield />,
    titulo: "Seguridad",
    texto: "Protegemos la información de clientes, proveedores y ventas mediante controles de acceso y respaldo de datos.",
  },
  {
    icon: <IconStar />,
    titulo: "Organización",
    texto: "Centralizamos toda la información en un solo sistema, evitando errores, duplicidad y pérdida de datos.",
  },
  {
    icon: <IconHeart />,
    titulo: "Confianza",
    texto: "Brindamos transparencia en pedidos, pagos y créditos, fortaleciendo la relación con nuestros clientes.",
  },
];

const EQUIPO = [
  { nombre: "Nicol D. Zapata Tilano", rol: "Desarrolladora Frontend y Backend", inicial: "N" },
  { nombre: "Sofía Suaza Guzmán", rol: "Análisis y Diseño", inicial: "S" },
];

export default function SobreNosotros() {
  return (
    <div className="sn-page">

      {/* ── Hero ── */}
      <section className="sn-hero">
        <div className="sn-hero-bg" aria-hidden="true">
          <div className="sn-hero-circle c1" />
          <div className="sn-hero-circle c2" />
          <div className="sn-hero-circle c3" />
        </div>

        <div className="sn-hero-content">
          <span className="sn-eyebrow">Nuestra historia</span>
          <h1 className="sn-hero-title">
            Transformando<br />
            <em>DVNA</em>
          </h1>
          <p className="sn-hero-desc">
            SportWear es una solución tecnológica creada en Medellín para la empresa DVNA,
            con el objetivo de optimizar la gestión de inventarios, ventas, compras y clientes,
            mejorando la eficiencia operativa y la toma de decisiones.
          </p>
        </div>

        <div className="sn-hero-stat-row">
          <div className="sn-stat">
            <span className="sn-stat-num">2020</span>
            <span className="sn-stat-label">Inicio DVNA</span>
          </div>
          <div className="sn-stat-divider" />
          <div className="sn-stat">
            <span className="sn-stat-num">+4 K</span>
            <span className="sn-stat-label">Clientes</span>
          </div>
          <div className="sn-stat-divider" />
          <div className="sn-stat">
            <span className="sn-stat-num">100 %</span>
            <span className="sn-stat-label">Digitalización</span>
          </div>
        </div>
      </section>

      {/* ── Manifiesto ── */}
      <section className="sn-manifiesto">
        <div className="sn-manifiesto-inner">
          <div className="sn-manifiesto-line" aria-hidden="true" />
          <blockquote className="sn-quote">
            "No solo gestionamos datos.<br />
            Transformamos la forma en que <strong>DVNA crece</strong>."
          </blockquote>
          <div className="sn-manifiesto-line" aria-hidden="true" />
        </div>
      </section>

      {/* ── Valores ── */}
      <section className="sn-section">
        <div className="sn-section-header">
          <span className="sn-eyebrow">Lo que nos define</span>
          <h2 className="sn-section-title">Nuestros valores</h2>
        </div>

        <div className="sn-valores-grid">
          {VALORES.map((v, i) => (
            <div key={v.titulo} className="sn-valor-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="sn-valor-icon">{v.icon}</span>
              <h3 className="sn-valor-titulo">{v.titulo}</h3>
              <p className="sn-valor-texto">{v.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Historia timeline ── */}
      <section className="sn-section sn-section-dark">
        <div className="sn-section-header">
          <span className="sn-eyebrow light">Evolución del proyecto</span>
          <h2 className="sn-section-title light">Nuestra trayectoria</h2>
        </div>

        <div className="sn-timeline">
          {[
            { año: "2025", hito: "Inicio del análisis del proyecto y levantamiento de requisitos para DVNA." },
            { año: "2025", hito: "Definición de historias de usuario, diagramas y estructura del sistema." },
            { año: "2026", hito: "Desarrollo del sistema con módulos de inventario, ventas y clientes." },
            { año: "2026", hito: "Implementación de reportes automáticos y control de créditos y abonos." },
            { año: "2026", hito: "Entrega final del software y capacitación al cliente DVNA." },
          ].map((item) => (
            <div key={item.año + item.hito} className="sn-timeline-item">
              <div className="sn-timeline-año">{item.año}</div>
              <div className="sn-timeline-dot" />
              <div className="sn-timeline-hito">{item.hito}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Equipo ── */}
      <section className="sn-section">
        <div className="sn-section-header">
          <span className="sn-eyebrow">Equipo de desarrollo</span>
          <h2 className="sn-section-title">Nuestro equipo</h2>
        </div>

        <div className="sn-equipo-grid">
          {EQUIPO.map((p) => (
            <div key={p.nombre} className="sn-equipo-card">
              <div className="sn-equipo-avatar">{p.inicial}</div>
              <div className="sn-equipo-nombre">{p.nombre}</div>
              <div className="sn-equipo-rol">{p.rol}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="sn-cta">
        <h2 className="sn-cta-title">Explora DVNA</h2>
        <p className="sn-cta-sub">
          Descubre cómo la tecnología mejora la gestión y experiencia de compra.
        </p>
        <a href="/catalogo" className="sn-cta-btn">Ver catálogo</a>
      </section>

    </div>
  );
}