// src/pages/accesos/RecuperarContrasena.jsx
/* ======================================
   MÓDULO: ACCESOS - RECUPERAR CONTRASEÑA
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../shared/services/api";
import AuthLayout from "./AuthLayout";
import "./Login.css";

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4l6 5 6-5M2 4h12v9H2V4z"
      stroke="var(--dvna-circle)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function RecuperarContrasena() {
  const [email, setEmail]             = useState("");
  const [error, setError]             = useState("");
  const [emailErrors, setEmailErrors] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [enviado, setEnviado]         = useState(false);
  const [tocado, setTocado]           = useState(false);

  // Validación de formato de correo: devuelve TODOS los errores que
  // apliquen a la vez (ej: si no tiene @ ni ".", se muestran las dos
  // notificaciones juntas, no solo la primera).
  const validateEmail = (email) => {
    if (!email) return ["El correo electrónico es requerido"];

    const errores = [];
    if (!email.includes("@")) errores.push("El correo debe contener @");
    if (!email.includes(".")) errores.push("El correo debe contener un punto (.)");
    if (errores.length > 0) return errores;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) return ["Formato de correo inválido"];

    return [];
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setError("");
    // Validación en tiempo real: solo una vez que el campo ya fue visitado.
    if (tocado) setEmailErrors(validateEmail(value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const emailErrorMsgs = validateEmail(email);
    setEmailErrors(emailErrorMsgs);
    setError("");
    setTocado(true);

    // Si hay error de formato, NO se llama a la API
    if (emailErrorMsgs.length > 0) return;

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
    setTocado(true);
    setEmailErrors(validateEmail(email));
  };

  return (
    <AuthLayout
      badge="RESTABLECIMIENTO DE CREDENCIALES"
      title={<>Protección continua para tu <i>experiencia</i> activa.</>}
      description="Ingresa la dirección asociada a tu cuenta Sportwear. Enviaremos un token criptográfico de un solo uso para que redefinas tu clave sin fricciones."
      pageClassName="recuperar-page"
    >
      <div className="login-card login-card--recuperar">

        {!enviado ? (
          <>
            <div className="form-header">
              <h2>Recuperar contraseña</h2>
              <p>Recibirás un enlace intransferible verificado por nuestro sistema seguro.</p>
            </div>

            {/* Alertas: burbujas de chat apiladas junto a la tarjeta, igual
                que en Inicio de sesión, y en tiempo real desde que el
                campo fue tocado por primera vez. */}
            {(emailErrors.length > 0 || error) && (
              <div className="login-alerts" id="email-error">
                {emailErrors.map((msg) => (
                  <div key={msg} className="login-alert-bubble">{msg}</div>
                ))}
                {error && <div className="login-alert-bubble">{error}</div>}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <div className="label-row">
                  <label>Correo electrónico</label>
                  <span className="registrado-tag">Registrado</span>
                </div>
                <div className={`input-wrapper${emailErrors.length > 0 || error ? " has-error" : ""}`}>
                  <span className="input-icon-left"><IconMail /></span>
                  <input
                    type="email"
                    placeholder="correo@gmail.com"
                    value={email}
                    onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}
                    aria-describedby="email-error"
                  />
                  <div className="input-bar" />
                </div>
              </div>

              <div className="form-links">
                <Link to="/login">← Volver al login</Link>
              </div>

              <button type="submit" className="submit-btn submit-btn--dark" disabled={loading}>
                <span>{loading ? "Enviando..." : "Enviar Clave de Recuperación"}</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="form-header">
              <span className="acceso-badge">Correo enviado</span>
              <h2>Revisa tu bandeja</h2>
              <p>Enviamos instrucciones a <strong>{email}</strong></p>
            </div>
            <div className="form-links">
              <Link to="/login">← Volver al login</Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}