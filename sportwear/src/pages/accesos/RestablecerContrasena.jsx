// src/pages/accesos/RestablecerContrasena.jsx
/* ======================================
   MÓDULO: ACCESOS - RESTABLECER CONTRASEÑA
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import logo from "../../assets/LOGO.png";
import "./Login.css";

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

const validatePassword = (password) => {
  if (!password)          return "La contraseña es requerida.";
  if (password.length < 8) return "Mínimo 8 caracteres.";
  return "";
};

export default function RestablecerContrasena() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const token           = searchParams.get("token");

  const [contrasena,     setContrasena]     = useState("");
  const [confirmar,      setConfirmar]      = useState("");
  const [contrasenaError, setContrasenaError] = useState("");
  const [confirmarError,  setConfirmarError]  = useState("");
  const [error,          setError]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [listo,          setListo]          = useState(false);
  const [verContrasena,  setVerContrasena]  = useState(false);
  const [verConfirmar,   setVerConfirmar]   = useState(false);

  const onFocus = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(1)";
  };
  const onBlur = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(0)";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errContrasena = validatePassword(contrasena);
    let   errConfirmar  = "";
    if (!confirmar)                  errConfirmar = "Confirma tu contraseña.";
    else if (contrasena !== confirmar) errConfirmar = "Las contraseñas no coinciden.";

    setContrasenaError(errContrasena);
    setConfirmarError(errConfirmar);
    if (errContrasena || errConfirmar) return;

    setLoading(true);
    setError("");
    try {
      await api.post("/auth/restablecer", { token, contrasena });
      setListo(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
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

        {!listo ? (
          <>
            <div className="form-header">
              <div className="greeting">Nueva contraseña</div>
              <h2>Restablecer contraseña</h2>
              <p>Ingresa tu nueva contraseña</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* Nueva contraseña */}
              <div className="form-group">
                <label><IconLock /> Nueva contraseña</label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconLock /></span>
                  <input
                    type={verContrasena ? "text" : "password"}
                    placeholder="••••••••"
                    value={contrasena}
                    onChange={(e) => { setContrasena(e.target.value); setContrasenaError(""); }}
                    onFocus={onFocus} onBlur={onBlur}
                    aria-describedby="contrasena-error"
                  />
                  <div className="input-bar" />
                  <span className="input-icon" style={{ right: 10, left: "auto", cursor: "pointer" }}
                    onClick={() => setVerContrasena(v => !v)}>
                    {verContrasena ? <IconEyeOpen /> : <IconEyeClosed />}
                  </span>
                </div>
                {contrasenaError && <div id="contrasena-error" className="field-error">{contrasenaError}</div>}
              </div>

              {/* Confirmar contraseña */}
              <div className="form-group">
                <label><IconLock /> Confirmar contraseña</label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconLock /></span>
                  <input
                    type={verConfirmar ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmar}
                    onChange={(e) => { setConfirmar(e.target.value); setConfirmarError(""); }}
                    onFocus={onFocus} onBlur={onBlur}
                    aria-describedby="confirmar-error"
                  />
                  <div className="input-bar" />
                  <span className="input-icon" style={{ right: 10, left: "auto", cursor: "pointer" }}
                    onClick={() => setVerConfirmar(v => !v)}>
                    {verConfirmar ? <IconEyeOpen /> : <IconEyeClosed />}
                  </span>
                </div>
                {confirmarError && <div id="confirmar-error" className="field-error">{confirmarError}</div>}
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="form-links">
                <Link to="/login">← Volver al inicio de sesión</Link>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Guardando..." : "Guardar contraseña →"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="form-header">
              <div className="greeting">¡Listo!</div>
              <h2>Contraseña actualizada</h2>
              <p>Serás redirigido al inicio de sesión en unos segundos...</p>
            </div>
            <div className="form-links">
              <Link to="/login">← Ir al inicio de sesión</Link>
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