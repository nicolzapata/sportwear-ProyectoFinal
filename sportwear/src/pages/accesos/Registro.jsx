// src/pages/accesos/Registro.jsx
/* ======================================
   MÓDULO: ACCESOS - REGISTRO
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import logo from "../../assets/LOGO.png";
import "./Login.css";
import "./Registro.css";

const TIPOS_DOC = ["CC", "CE", "TI", "NIT", "PP"];

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="#b49780" strokeWidth="1.4"/>
    <path d="M2 14c0-3 2-5 6-5s6 2 6 5" stroke="#b49780" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4l6 5 6-5M2 4h12v9H2V4z" stroke="#b49780" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M3 2h3l1.5 3.5-2 1.5a8 8 0 003.5 3.5l1.5-2L14 12v3a1 1 0 01-1 1A11 11 0 012 3a1 1 0 011-1z"
      stroke="#b49780" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconLocation = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 1a5 5 0 015 5c0 4-5 9-5 9S3 10 3 6a5 5 0 015-5z" stroke="#b49780" strokeWidth="1.4"/>
    <circle cx="8" cy="6" r="1.5" stroke="#b49780" strokeWidth="1.4"/>
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="#b49780" strokeWidth="1.4"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="#b49780" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

export default function Registro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "", tipo_doc: "CC", documento: "",
    telefono: "", email: "", contrasena: "",
    confirmar: "", ciudad: "Medellín", id_barrio: "", direccion: "",
  });
  const [barrios, setBarrios] = useState([]);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get("/barrios")
      .then(({ data }) => setBarrios(data))
      .catch(() => setBarrios([]));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const onFocus = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(1)";
  };
  const onBlur = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(0)";
  };

  const validar = () => {
    if (!form.nombre || !form.documento || !form.email || !form.contrasena)
      return "Nombre, documento, email y contraseña son obligatorios.";
    if (form.contrasena !== form.confirmar)
      return "Las contraseñas no coinciden.";
    if (form.contrasena.length < 6)
      return "La contraseña debe tener al menos 6 caracteres.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "El correo electrónico no es válido.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validar();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await api.post("/auth/registro", {
        nombre: form.nombre, tipo_doc: form.tipo_doc,
        documento: form.documento, telefono: form.telefono || null,
        email: form.email, contrasena: form.contrasena,
        ciudad: form.ciudad || "Medellín",
        id_barrio: form.id_barrio || null,
        direccion: form.direccion || null,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  // Helper campo con icono
  const Field = ({ icon, name, type = "text", placeholder, required, label }) => (
    <div className="form-group">
      <label>{icon} {label} {required && <span className="req">*</span>}</label>
      <div className="input-wrapper">
        <span className="input-icon">{icon}</span>
        <input
          type={type} name={name} placeholder={placeholder}
          value={form[name]} onChange={handleChange}
          onFocus={onFocus} onBlur={onBlur}
        />
        <div className="input-bar" />
      </div>
    </div>
  );

  return (
    <div className="login-page registro-page">
      <div className="login-card registro-card">

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

        <div className="form-header">
          <div className="greeting">Únete a nosotros</div>
          <h2>Crear cuenta</h2>
          <p>Completa tus datos para empezar a comprar</p>
        </div>

        {success ? (
          <div className="registro-success">
            <div className="registro-success-icon">✓</div>
            <p className="registro-success-title">¡Cuenta creada exitosamente!</p>
            <p className="registro-success-sub">Redirigiendo al inicio de sesión...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>

            <Field icon={<IconUser />} name="nombre" label="Nombre completo"
              placeholder="Ana Sofía López" required />

            <div className="registro-row">
              <div className="form-group">
                <label>Tipo doc <span className="req">*</span></label>
                <select name="tipo_doc" className="form-control"
                  value={form.tipo_doc} onChange={handleChange}>
                  {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>N° documento <span className="req">*</span></label>
                <div className="input-wrapper">
                  <input type="text" name="documento" placeholder="1001234567"
                    value={form.documento} onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}
                    style={{ paddingLeft: "14px" }}/>
                  <div className="input-bar" />
                </div>
              </div>
            </div>

            <Field icon={<IconMail />} name="email" type="email" label="Correo electrónico"
              placeholder="correo@ejemplo.com" required />

            <Field icon={<IconPhone />} name="telefono" label="Teléfono"
              placeholder="3001234567" />

            <Field icon={<IconLocation />} name="ciudad" label="Ciudad"
              placeholder="Medellín" />

            <div className="form-group">
              <label><IconLocation /> Barrio</label>
              <select name="id_barrio" className="form-control"
                value={form.id_barrio} onChange={handleChange}>
                <option value="">— Selecciona un barrio —</option>
                {barrios.map(b => (
                  <option key={b.id_barrio} value={b.id_barrio}>
                    {b.nombre} — {b.comuna}
                  </option>
                ))}
              </select>
            </div>

            <Field icon={<IconLocation />} name="direccion" label="Dirección"
              placeholder="Cra 43A # 10-20 Apto 301" />

            <div className="registro-row">
              <div className="form-group">
                <label><IconLock /> Contraseña <span className="req">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconLock /></span>
                  <input type="password" name="contrasena" placeholder="Mín. 6 caracteres"
                    value={form.contrasena} onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}/>
                  <div className="input-bar" />
                </div>
              </div>
              <div className="form-group">
                <label><IconLock /> Confirmar <span className="req">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><IconLock /></span>
                  <input type="password" name="confirmar" placeholder="Repite tu contraseña"
                    value={form.confirmar} onChange={handleChange}
                    onFocus={onFocus} onBlur={onBlur}/>
                  <div className="input-bar" />
                </div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Creando cuenta..." : "Registrarme →"}
            </button>

            <p className="registro-login-link">
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </p>
          </form>
        )}

        <div className="form-footer-mark">
          <span>DVNA · SportWear</span>
        </div>
      </div>
    </div>
  );
}