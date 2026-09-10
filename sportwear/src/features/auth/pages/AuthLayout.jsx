// src/features/auth/pages/AuthLayout.jsx
/* ======================================
   MÓDULO: ACCESOS - LAYOUT COMPARTIDO (Login · RecuperarContrasena)
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { Link } from "react-router-dom";
import logo from "../../../shared/assets/LOGO.png";
import { useThemeScope } from "../../../shared/contexts/ThemeContext";
import ThemeToggle from "../../../shared/components/ThemeToggle";
import "./AuthLayout.css";

export default function AuthLayout({ badge, title, description, stats, note, children }) {
  useThemeScope("sw-scope-auth");
  return (
    <div className="auth-split-page">
      <header className="auth-topbar">
        <div className="auth-topbar-brand">
          <span className="auth-logo-ring">
            <img src={logo} alt="SportWear" onError={(e) => { e.target.style.display = "none"; }} />
          </span>
          <span className="auth-topbar-name">SPORT<span>WEAR</span></span>
        </div>
        <nav className="auth-topbar-nav">
          <ThemeToggle />
          <span>MEDELLÍN /</span>
          <Link to="/catalogo">← Explorar Catálogo</Link>
        </nav>
      </header>

      <div className="auth-split-body">
        <div className="auth-info-panel">
          {badge && <span className="auth-badge">{badge}</span>}
          <h1 className="auth-headline">{title}</h1>
          {description && <p className="auth-description">{description}</p>}

          {stats?.length > 0 && (
            <div className="auth-stats-row">
              {stats.map((s) => (
                <div className="auth-stat" key={s.label}>
                  <strong>{s.value}<small>{s.unit}</small></strong>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {note && (
            <div className="auth-note">
              <span className="auth-note-icon">🛡</span>
              <p>{note}</p>
            </div>
          )}
        </div>

        <div className="auth-card-panel">
          {children}
        </div>
      </div>

      <footer className="auth-footer">
        <span>SPORTWEAR © 2026</span>
        <nav>
          <span>Privacidad</span>
          <span>Términos de Servicio</span>
          <span>Centro de Asistencia</span>
        </nav>
      </footer>
    </div>
  );
}
