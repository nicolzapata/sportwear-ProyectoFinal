// src/shared/components/ThemeToggle.jsx
// Botón de alternar claro/oscuro — pill con track+thumb deslizante, mismo
// lenguaje visual que StatusToggle.jsx. Se usa en el Navbar admin, en
// PublicNavbar (solo en /checkout y /carrito) y en las páginas de acceso.
import { useTheme } from "../contexts/ThemeContext";
import { IconSun, IconMoon } from "./Icons";
import "./ThemeToggle.css";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const esOscuro = theme === "dark";

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${esOscuro ? "oscuro" : "claro"} ${className}`}
      onClick={toggleTheme}
      role="switch"
      aria-checked={esOscuro}
      title={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span className="theme-toggle-track" />
      <span className="theme-toggle-thumb">
        {esOscuro ? <IconMoon /> : <IconSun />}
      </span>
    </button>
  );
}
