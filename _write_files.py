import pathlib

# --- Login.jsx -----------------------------------------------
login = pathlib.Path(r'C:\Users\zapat\OneDrive\Documentos\5totrimestre\Modelado\sportwear\src\pages\accesos\Login.jsx')
login.write_text(r'''// src/pages/accesos/Login.jsx
// ======================================
// MODULO: ACCESOS - LOGIN
// ======================================
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import logo from "../../assets/LOGO.png";
import "./Login.css";

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4l6 5 6-5M2 4h12v9H2V4z" stroke="#b49780" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#b49780" strokeWidth="1.4"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="#b49780" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: "", contrasena: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validateForm = () => {
    if (!form.email.trim()) return "Por favor, ingresa tu correo electrónico.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "El formato del correo electrónico no es v\u00E1lido.";
    if (!form.contrasena) return "Por favor, ingresa tu contrase\u00F1a.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateForm();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.usuario, data.token);
      const esCliente = data.usuario?.rol === "Cliente";
      navigate(esCliente ? "/catalogo" : "/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Credenciales incorrectas. Intenta de nuevo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onFocus = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(1)";
  };
  const onBlur = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(0)";
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo */}
        <div className="card-logo">
          <div className="brand-logo-ring">
            <img src={logo} alt="DVNA" onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}/>
            <span className="logo-fallback" style={{ display: "none" }}>DVNA</span>
          </div>
          <p className="card-brand-name">SPORT<span>WEAR</span></p>
        </div>

        <div className="card-divider" />

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate>

          <div className="form-group">
            <label><IconMail /> correo electrónico</label>
            <div className="input-wrapper">
              <span className="input-icon"><IconMail /></span>
              <input type="email" name="email" placeholder="correo@gmail.com"
                value={form.email} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
                autoComplete="email" />
              <div className="input-bar" />
            </div>
          </div>

          <div className="form-group">
            <label><IconLock /> contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon"><IconLock /></span>
              <input type={verPassword ? "text" : "password"} name="contrasena" placeholder="••••••••"
                value={form.contrasena} onChange={handleChange} onFocus={onFocus} onBlur={onBlur}
                autoComplete="current-password" />
              <button type="button" className="password-toggle"
                onClick={() => setVerPassword(v => !v)}
                aria-label={verPassword ? "Ocultar contrase\u00F1a" : "Mostrar contrase\u00F1a"}
                tabIndex={-1}>
                {verPassword ? <IconEyeOff /> : <IconEye />}
              </button>
              <div className="input-bar" />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-links">
            <Link to="/recuperar">¿olvidaste tu contrase&ntilde;a?</Link>
            <Link to="/registro">¿no tienes cuenta? reg&iacute;strate</Link>
          </div>
          <div className="catalog-link">
            <Link to="/catalogo">&larr; ver cat&aacute;logo</Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "verificando..." : "ingresar &rarr;"}
          </button>
        </form>

        <div className="form-footer-mark">
          <span>dvna &middot; sportwear</span>
        </div>
      </div>
    </div>
  );
}
''', encoding='utf-8')
print('Login.jsx written OK')
