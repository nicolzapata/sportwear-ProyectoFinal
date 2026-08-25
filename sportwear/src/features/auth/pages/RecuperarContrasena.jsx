// src/pages/accesos/RecuperarContrasena.jsx
/* ======================================
   MÓDULO: ACCESOS - RECUPERAR CONTRASEÑA
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../shared/services/api";
import logo from "../../../shared/assets/LOGO.png";
import "./Login.css";

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4l6 5 6-5M2 4h12v9H2V4z"
      stroke="#b49780" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function RecuperarContrasena() {
  const [email, setEmail]           = useState("");
  const [error, setError]           = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading]       = useState(false);
  const [enviado, setEnviado]       = useState(false);

  // Validación de formato de correo
  const validateEmail = (email) => {
    if (!email) return "El correo electrónico es requerido";
    if (!email.includes("@")) return "El correo debe contener @";
    if (!email.includes(".")) return "El correo debe contener un punto (.)";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) return "Formato de correo inválido";

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailErrorMsg = validateEmail(email);
    setEmailError(emailErrorMsg);
    setError("");

    // Si hay error de formato, NO se llama a la API
    if (emailErrorMsg) return;

    setLoading(true);
    try {
      await api.post("/auth/recuperar", { email });
      setEnviado(true);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setError(err.response?.data?.message || "El correo no está registrado.");
      } else {
        setError(err.response?.data?.message || "Error al enviar el correo");
      }
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

        {!enviado ? (
          <>
            <div className="form-header">
              <div className="greeting">Recuperación de acceso</div>
              <h2>Recuperar contraseña</h2>
              <p>Te enviaremos un enlace a tu correo registrado</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label><IconMail /> Correo electrónico</label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconMail /></span>
                  <input
                    type="email"
                    placeholder="correo@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                      setError("");
                    }}
                    onFocus={onFocus} onBlur={onBlur}
                    aria-describedby="email-error"
                  />
                  <div className="input-bar" />
                </div>
                {emailError && <div id="email-error" className="field-error">{emailError}</div>}
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="form-links">
                <Link to="/login">← Volver al inicio de sesión</Link>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace →"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="form-header">
              <div className="greeting">Correo enviado</div>
              <h2>Revisa tu bandeja</h2>
              <p>Enviamos instrucciones a <strong>{email}</strong></p>
            </div>
            <div className="form-links">
              <Link to="/login">← Volver al inicio de sesión</Link>
            </div>
          </>
        )}

        <div className="form-footer-mark">
          <span>DVNA · SportWear</span>
        </div>
      </div>
    </div>
  );
}