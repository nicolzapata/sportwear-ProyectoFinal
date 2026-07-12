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
const IconEyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <ellipse cx="8" cy="8" rx="6" ry="4" stroke="#b49780" strokeWidth="1.4" fill="none"/>
    <circle cx="8" cy="8" r="2" fill="#b49780"/>
  </svg>
);
const IconEyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <ellipse cx="8" cy="8" rx="6" ry="4" stroke="#b49780" strokeWidth="1.4" fill="none"/>
    <line x1="5" y1="8" x2="11" y2="8" stroke="#b49780" strokeWidth="1.4"/>
  </svg>
);

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: "", contrasena: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

const handleChange = (e) => {
  const { name, value } = e.target;
  setForm({ ...form, [name]: value });
  setError("");
  
  // Clear individual field errors when user types
  if (name === "email") {
    setEmailError("");
  } else if (name === "contrasena") {
    setPasswordError("");
  }
};

const validateEmail = (email) => {
  if (!email) return "El correo electrónico es requerido";
  if (!email.includes("@")) return "El correo debe contener @";
  if (!email.includes(".")) return "El correo debe contener un punto (.)";
  
  // Validación más robusta del formato de email
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Formato de correo inválido";
  if (!domain.includes(".")) return "El dominio debe contener un punto";
  const [domainName, tld] = domain.split(".");
  if (!domainName || !tld) return "Formato de dominio inválido";
  if (tld.length < 2) return "El dominio debe tener al menos 2 caracteres";
  
  return "";
};

const validatePassword = (password) => {
  if (!password) return "La contraseña es requerida";
  // Durante el inicio de sesión, no validamos complejidad de contraseñas existentes
  // Solo verificamos que no esté vacía
  return "";
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate fields
  const emailErrorMsg = validateEmail(form.email);
  const passwordErrorMsg = validatePassword(form.contrasena);
  
  setEmailError(emailErrorMsg);
  setPasswordError(passwordErrorMsg);
  
  if (emailErrorMsg || passwordErrorMsg) {
    return;
  }
  
  setLoading(true);
  try {
    const { data } = await api.post("/auth/login", form);
    login(data.usuario, data.token);
const esCliente = data.usuario?.rol === "Cliente";

if (esCliente) {
  navigate("/catalogo");
} else {
  // Ir al primer módulo asignado, o dashboard si es Admin
  const modulos = data.usuario?.modulos || [];
  if (data.usuario?.rol === "Admin" || modulos.length === 0) {
    navigate("/dashboard");
  } else {
    // Buscar la ruta del primer módulo asignado
    const MENU_ITEMS = [
      { module: "Dashboard",     path: "/dashboard" },
      { module: "Usuarios",      path: "/usuarios" },
      { module: "Roles",         path: "/roles" },
      { module: "Productos",     path: "/productos" },
      { module: "Colores",       path: "/colores" },
      { module: "Catálogo",      path: "/catalogo-admin" },
      { module: "Proveedores",   path: "/proveedores" },
      { module: "Compras",       path: "/compras" },
      { module: "PedidosVentas", path: "/pedidos" },
      { module: "Pagos",         path: "/pagos" },
    ];
    const normalizar = (v) => v?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const primerModulo = MENU_ITEMS.find(item =>
      modulos.some(m => normalizar(m) === normalizar(item.module))
    );
    navigate(primerModulo ? primerModulo.path : "/dashboard");
  }
}
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
            <img src={logo} alt="SportWear" onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}/>
            <span className="logo-fallback" style={{ display: "none" }}>SportWear</span>
          </div>
          <p className="card-brand-name">SPORT<span>WEAR</span></p>
        </div>

        <div className="card-divider" />

        {/* Header */}
        <div className="form-header">
          <h2>Iniciar sesión</h2>
          <p>Accede a tu panel de gestión</p>
        </div>

         {/* Formulario */}
         <form onSubmit={handleSubmit} noValidate>

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
                      aria-describedby="email-error"
                    />
                <div className="input-bar" />
              </div>
              {emailError && <div id="email-error" className="field-error">{emailError}</div>}
            </div>

            <div className="form-group">
              <label><IconLock /> Contraseña</label>
              <div className="input-wrapper">
                <span className="input-icon"><IconLock /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="contrasena"
                      placeholder="••••••••"
                      value={form.contrasena}
                      onChange={handleChange}
                      onFocus={onFocus} onBlur={onBlur}
                      aria-describedby="password-error"
                    />
                <div className="input-bar" />
                <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <IconEyeOpen /> : <IconEyeClosed />}
                </span>
              </div>
              {passwordError && <div id="password-error" className="field-error">{passwordError}</div>}
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