// src/pages/accesos/Login.jsx
/* ======================================
   MÓDULO: ACCESOS - LOGIN
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { MENU_ITEMS } from "../../../shared/utils/permisos";
import api from "../../../shared/services/api";
import AuthLayout from "./AuthLayout";
import "./Login.css";

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4l6 5 6-5M2 4h12v9H2V4z"
      stroke="var(--dvna-circle)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="var(--dvna-circle)" strokeWidth="1.4"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="var(--dvna-circle)" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconEyeOpen = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <ellipse cx="8" cy="8" rx="6" ry="4" stroke="var(--dvna-circle)" strokeWidth="1.4" fill="none"/>
    <circle cx="8" cy="8" r="2" fill="var(--dvna-circle)"/>
  </svg>
);
const IconEyeClosed = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <ellipse cx="8" cy="8" rx="6" ry="4" stroke="var(--dvna-circle)" strokeWidth="1.4" fill="none"/>
    <line x1="5" y1="8" x2="11" y2="8" stroke="var(--dvna-circle)" strokeWidth="1.4"/>
  </svg>
);

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm]       = useState({ email: "", contrasena: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [emailErrors, setEmailErrors] = useState([]);
  const [passwordError, setPasswordError] = useState("");
  const [tocado, setTocado] = useState({ email: false, contrasena: false });
  const [showPassword, setShowPassword] = useState(false);

const handleChange = (e) => {
  const { name, value } = e.target;
  const nuevoForm = { ...form, [name]: value };
  setForm(nuevoForm);
  setError("");

  // Validación en tiempo real: solo una vez que el campo ya fue visitado (tocado).
  if (name === "email" && tocado.email) {
    setEmailErrors(validateEmail(nuevoForm.email));
  } else if (name === "contrasena" && tocado.contrasena) {
    setPasswordError(validatePassword(nuevoForm.contrasena));
  }
};

// Devuelve TODOS los errores que apliquen a la vez (ej: si no tiene @ ni
// ".", se muestran las dos notificaciones juntas, no solo la primera).
const validateEmail = (email) => {
  if (!email) return ["El correo electrónico es requerido"];

  const errores = [];
  if (!email.includes("@")) errores.push("El correo debe contener @");
  if (!email.includes(".")) errores.push("El correo debe contener un punto (.)");
  if (errores.length > 0) return errores;

  // Validación más robusta del formato de email
  const [local, domain] = email.split("@");
  if (!local || !domain) return ["Formato de correo inválido"];
  if (!domain.includes(".")) return ["El dominio debe contener un punto"];
  const [domainName, tld] = domain.split(".");
  if (!domainName || !tld) return ["Formato de dominio inválido"];
  if (tld.length < 2) return ["El dominio debe tener al menos 2 caracteres"];

  return [];
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
  const emailErrorMsgs = validateEmail(form.email);
  const passwordErrorMsg = validatePassword(form.contrasena);

  setEmailErrors(emailErrorMsgs);
  setPasswordError(passwordErrorMsg);
  setTocado({ email: true, contrasena: true });

  if (emailErrorMsgs.length > 0 || passwordErrorMsg) {
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
    // Buscar la ruta del primer módulo asignado (misma fuente que el Sidebar)
    const normalizar = (v) => v?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const primerModulo = MENU_ITEMS.find(item => {
      const modulosItem = item.modules ? item.modules : [item.module];
      return modulosItem.some(im => modulos.some(m => normalizar(m) === normalizar(im)));
    });
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

    const { name } = e.target;
    if (name === "email") {
      setTocado(prev => ({ ...prev, email: true }));
      setEmailErrors(validateEmail(form.email));
    } else if (name === "contrasena") {
      setTocado(prev => ({ ...prev, contrasena: true }));
      setPasswordError(validatePassword(form.contrasena));
    }
  };

  return (
    <AuthLayout
      badge="ACCESO PRIVADO // SPORTWEAR"
      title={<>Rendimiento y<br />elegancia para tu<br /><i>disciplina diaria.</i></>}
      description="Entorno de autenticación federada para atletas de alto calibre, directores creativos y administración VIP. Gestiona colecciones privadas, pedidos a medida y reservas de temporada."
    >
      <div className="login-card login-card--login">

        {/* Header */}
        <div className="form-header">
          <h2>Iniciar sesión</h2>
          <p>Ingresa tus credenciales verificadas para gestionar tu cuenta.</p>
          <div className="form-progress"><span /></div>
        </div>

        {/* Alertas: se apilan una debajo de otra, nunca en el mismo lugar.
            Si el correo falla por varias razones a la vez (sin @ y sin "."),
            se muestran todas esas notificaciones juntas. */}
        {(emailErrors.length > 0 || passwordError || error) && (
          <div className="login-alerts" id="email-error">
            {emailErrors.map((msg) => (
              <div key={msg} className="login-alert-bubble">{msg}</div>
            ))}
            {passwordError && <div id="password-error" className="login-alert-bubble">{passwordError}</div>}
            {error && <div className="login-alert-bubble">{error}</div>}
          </div>
        )}

         {/* Formulario */}
         <form onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <div className="label-row">
                <label>Correo electrónico</label>
              </div>
              <div className={`input-wrapper${emailErrors.length > 0 || error ? " has-error" : ""}`}>
                <span className="input-icon-left"><IconMail /></span>
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
            </div>

            <div className="form-group">
              <div className="label-row">
                <label>Contraseña</label>
              </div>
              <div className={`input-wrapper${passwordError || error ? " has-error" : ""}`}>
                <span className="input-icon-left"><IconLock /></span>
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
                <span className="input-icon-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <IconEyeOpen /> : <IconEyeClosed />}
                </span>
              </div>
            </div>

          <div className="form-links">
            <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Verificando..." : "Entrar a Sportwear →"}
          </button>
        </form>

        <div className="form-footer-mark">
          <span className="footer-registro">¿No tienes una cuenta aún? <Link to="/registro">Registrarse</Link></span>
        </div>
      </div>
    </AuthLayout>
  );
}