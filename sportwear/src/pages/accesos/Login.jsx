// src/pages/accesos/Login.jsx
/* ======================================
   MÓDULO: ACCESOS - LOGIN
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import logo from "../../assets/LOGO.png";
import "./Login.css";

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4l6 5 6-5M2 4h12v9H2V4z"
      stroke="#b49780" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#b49780" strokeWidth="1.4"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="#b49780" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: "", contrasena: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.contrasena) {
      setError("Completa todos los campos.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.usuario, data.token);
      const esCliente = data.usuario?.rol === "Cliente";
      navigate(esCliente ? "/catalogo" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Credenciales incorrectas");
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

        {/* Header */}
        <div className="form-header">
          <div className="greeting">Bienvenido</div>
          <h2>Iniciar sesión</h2>
          <p>Accede a tu panel de gestión</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label><IconMail /> Correo electrónico</label>
            <div className="input-wrapper">
              <span className="input-icon"><IconMail /></span>
              <input
                type="email" name="email"
                placeholder="correo@gmail.com"
                value={form.email}
                onChange={handleChange}
                onFocus={onFocus} onBlur={onBlur}
              />
              <div className="input-bar" />
            </div>
          </div>

          <div className="form-group">
            <label><IconLock /> Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon"><IconLock /></span>
              <input
                type="password" name="contrasena"
                placeholder="••••••••"
                value={form.contrasena}
                onChange={handleChange}
                onFocus={onFocus} onBlur={onBlur}
              />
              <div className="input-bar" />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-links">
            <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
            <Link to="/registro">¿No tienes cuenta? Regístrate</Link>
          </div>
          <div className="catalog-link">
            <Link to="/catalogo">← Ver catálogo</Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Verificando..." : "Ingresar →"}
          </button>
        </form>

        <div className="form-footer-mark">
          <span>Dvna · Sportwear</span>
        </div>
      </div>
    </div>
  );
}