import { IconWhatsApp, IconInstagram } from "./catalogoIcons";

export default function CatalogoFooter() {
  return (
    <footer className="catalog-footer">
      <div className="catalog-footer-content">
        <div className="catalog-footer-brand">
          <span className="catalog-footer-logo">SPORTWEAR</span>
          <p className="catalog-footer-desc">Moda deportiva para mujer. Confianza y estilo en cada detalle.</p>
        </div>
        <div className="catalog-footer-links">
          <a href="https://wa.link/ts1wmb" target="_blank" rel="noopener noreferrer" className="catalog-footer-link whatsapp">
            <IconWhatsApp />
            <span>WhatsApp</span>
          </a>
          <a href="https://www.instagram.com/dvna.co/?hl=es" target="_blank" rel="noopener noreferrer" className="catalog-footer-link instagram">
            <IconInstagram />
            <span>Instagram</span>
          </a>
        </div>
      </div>
      <div className="catalog-footer-copy">
        &copy; {new Date().getFullYear()} Sportwear. Todos los derechos reservados.
      </div>
    </footer>
  );
}
