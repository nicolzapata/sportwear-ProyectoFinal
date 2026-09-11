// src/pages/accesos/Registro.jsx
/* ======================================
   MÓDULO: ACCESOS - REGISTRO
   RESPONSABLE: NICOL DAHIANNA ZAPATA
   ====================================== */
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../shared/services/api";
import { soloDigitos, validarNumeroDocumento, validarEmail, LONGITUD_TELEFONO } from "../../../shared/utils/numerico";
import AuthLayout from "./AuthLayout";
import "./Login.css";
import "./Registro.css";
import { CAMPOS_NUMERICOS, calcularErrores } from "../utils/registroHelpers";
import DatosPersonalesFields from "../components/registro/DatosPersonalesFields";
import ContactoFields from "../components/registro/ContactoFields";
import SeguridadFields from "../components/registro/SeguridadFields";
import { useThemeScope } from "../../../shared/contexts/ThemeContext";
import ThemeToggle from "../../../shared/components/ThemeToggle";

// Qué campos pertenecen a cada sección — se usa para saber cuándo esa
// sección está completa y se puede desbloquear la siguiente.
const CAMPOS_SECCION = {
  1: ["nombres", "apellidos", "documento"],
  2: ["email", "telefono", "direccion"],
  3: ["contrasena", "confirmar"],
};

export default function Registro() {
  useThemeScope("sw-scope-auth");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombres: "", apellidos: "", tipo_doc: "CC", documento: "",
    telefono: "", email: "", contrasena: "",
    confirmar: "", direccion: "",
  });
  const [error, setError]     = useState("");
  const [errores, setErrores] = useState({});
  const [tocado, setTocado]   = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [terminosError, setTerminosError] = useState("");

  // Para descartar la respuesta de /check-email si el usuario ya cambió el campo
  // mientras la verificación estaba en vuelo (evita marcar un error obsoleto).
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // Verificación en tiempo real (onBlur): si el correo ya existe, lo avisa de una vez
  // en vez de esperar a que el usuario complete todo el formulario y lo envíe.
  const verificarEmailDuplicado = async (email) => {
    try {
      const { data } = await api.get("/auth/check-email", { params: { email } });
      if (data?.existe && formRef.current.email.trim() === email) {
        setErrores(prev => ({ ...prev, email: "Este correo ya está registrado." }));
      }
    } catch {
      // Si la verificación falla (red, etc.) no bloqueamos al usuario; el submit
      // igual rechaza duplicados con el 409 del backend.
    }
  };

  // Igual que verificarEmailDuplicado pero para el documento.
  const verificarDocumentoDuplicado = async (documento) => {
    try {
      const { data } = await api.get("/auth/check-documento", { params: { documento } });
      if (data?.existe && formRef.current.documento.trim() === documento) {
        setErrores(prev => ({ ...prev, documento: "Este documento ya está registrado." }));
      }
    } catch {
      // Si la verificación falla (red, etc.) no bloqueamos al usuario; el submit
      // igual rechaza duplicados con el 409 del backend.
    }
  };

  // Aplica al state de errores solo los campos marcados como "tocados" (validación en tiempo real
  // sin adelantarse a mostrar "obligatorio" en campos que el usuario ni siquiera ha visitado).
  const aplicarErrores = (erroresCalculados, tocadoActual) => {
    setErrores(prev => {
      const next = { ...prev };
      Object.keys(tocadoActual).forEach(campo => {
        if (tocadoActual[campo]) next[campo] = erroresCalculados[campo] || "";
      });
      return next;
    });
  };

  // Marca un campo como tocado y revalida en el acto (se usa en onChange y onBlur).
  const validarCampo = (nombreCampo, formValue = form) => {
    const nuevoTocado = tocado[nombreCampo] ? tocado : { ...tocado, [nombreCampo]: true };
    if (nuevoTocado !== tocado) setTocado(nuevoTocado);
    aplicarErrores(calcularErrores(formValue), nuevoTocado);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const esDocumentoPasaporte = name === "documento" && form.tipo_doc === "PP";
    let nuevoValor = value;
    if (CAMPOS_NUMERICOS.includes(name) && !esDocumentoPasaporte) {
      nuevoValor = soloDigitos(value);
      if (name === "telefono") nuevoValor = nuevoValor.slice(0, LONGITUD_TELEFONO);
    }
    const nuevoForm = { ...form, [name]: nuevoValor };
    setForm(nuevoForm);
    setError("");
    validarCampo(name, nuevoForm);
  };

  const onFocus = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(1)";
  };
  const onBlur = (e) => {
    const bar = e.target.parentElement.querySelector(".input-bar");
    if (bar) bar.style.transform = "scaleX(0)";
    if (e.target.name) validarCampo(e.target.name);
    if (e.target.name === "email") {
      const valor = e.target.value.trim();
      if (valor && !validarEmail(valor)) verificarEmailDuplicado(valor);
    }
    if (e.target.name === "documento") {
      const valor = e.target.value.trim();
      if (valor && !validarNumeroDocumento(form.tipo_doc, valor)) verificarDocumentoDuplicado(valor);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const erroresCampos = calcularErrores(form);
    setErrores(erroresCampos);
    setTocado(Object.fromEntries(Object.keys(form).map((campo) => [campo, true])));
    if (!aceptaTerminos) setTerminosError("Debes aceptar los términos para continuar.");
    if (Object.keys(erroresCampos).length > 0 || !aceptaTerminos) return;
    setLoading(true);
    try {
      await api.post("/auth/registro", {
        nombre: `${form.nombres} ${form.apellidos}`.trim(), tipo_doc: form.tipo_doc,
        documento: form.documento, telefono: form.telefono,
        email: form.email, contrasena: form.contrasena,
        direccion: form.direccion,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      const mensaje = err.response?.data?.message || "Error al crear la cuenta.";
      if (err.response?.status === 409) {
        // El backend rechaza tanto correo como documento duplicado; se detecta cuál
        // fue según el mensaje para pegarlo al campo real, no siempre al correo.
        const campo = /documento/i.test(mensaje) ? "documento" : "email";
        setErrores(prev => ({ ...prev, [campo]: mensaje }));
        setTocado(prev => ({ ...prev, [campo]: true }));
      } else {
        setError(mensaje);
      }
    } finally {
      setLoading(false);
    }
  };

  // Todas las alertas activas juntas (una burbuja por mensaje, apiladas),
  // igual que en Inicio de sesión y Recuperar Contraseña: cada campo
  // inválido aporta su mensaje, más el de términos y el error general.
  const alertas = [
    ...Object.values(errores).filter(Boolean),
    ...(terminosError ? [terminosError] : []),
    ...(error ? [error] : []),
  ];

  // Las 3 secciones se muestran siempre (no se ocultan) — pero la 2 y la 3
  // quedan bloqueadas (grises, sin poder escribir en ellas) hasta que la
  // anterior no tenga ningún error, usando el formulario completo (no solo
  // lo "tocado") para no dejar avanzar con datos inválidos sin llenar.
  const erroresCompletos = calcularErrores(form);
  const seccion1Completa = CAMPOS_SECCION[1].every((campo) => !erroresCompletos[campo]);
  const seccion2Completa = seccion1Completa && CAMPOS_SECCION[2].every((campo) => !erroresCompletos[campo]);
  const seccion3Completa = seccion2Completa && CAMPOS_SECCION[3].every((campo) => !erroresCompletos[campo]);

  return (
    <AuthLayout
      badge="ESTÉTICA // RENDIMIENTO"
      title={<>La nueva era de la <i>indumentaria deportiva.</i></>}
      description="Acceso prioritario a lanzamientos cápsula limitados, tecnología textil biométrica y beneficios personalizados en nuestro Atelier global."
      note="Trazabilidad en cada costura y certificación deportiva."
      pageClassName="registro-page-variant"
    >
      <div className="login-card-wrap login-card-wrap--registro">
        {/* Alertas: burbujas de chat apiladas junto a la tarjeta, igual que
            en Inicio de sesión y Recuperar Contraseña. Viven fuera de la
            tarjeta para no quedar recortadas por su scroll interno. */}
        {alertas.length > 0 && (
          <div className="login-alerts">
            {alertas.map((msg, i) => (
              <div key={`${i}-${msg}`} className="login-alert-bubble">{msg}</div>
            ))}
          </div>
        )}

        <div className="login-card login-card--registro">
          <div className="login-card--registro-scroll">
            <div className="registro-form-top">
              <h2>Registrar tu cuenta</h2>
              <ThemeToggle />
              <div className="registro-steps">
                <span className={`registro-step-dot${seccion1Completa ? " completo" : " activo"}`}>1</span>
                <span className="registro-step-line" />
                <span className={`registro-step-dot${seccion2Completa ? " completo" : seccion1Completa ? " activo" : ""}`}>2</span>
                <span className="registro-step-line" />
                <span className={`registro-step-dot${seccion2Completa ? " activo" : ""}`}>3</span>
              </div>
            </div>
            <p className="registro-form-sub">Completa cada sección para desbloquear la siguiente.</p>

            {success ? (
              <div className="registro-success">
                <div className="registro-success-icon">✓</div>
                <p className="registro-success-title">¡Cuenta creada exitosamente!</p>
                <p className="registro-success-sub">Redirigiendo al inicio de sesión...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <DatosPersonalesFields form={form} errores={errores} handleChange={handleChange} onFocus={onFocus} onBlur={onBlur} />

                <ContactoFields
                  form={form} errores={errores} handleChange={handleChange} onFocus={onFocus} onBlur={onBlur}
                  bloqueada={!seccion1Completa}
                />

                <SeguridadFields
                  form={form} errores={errores} handleChange={handleChange} onFocus={onFocus} onBlur={onBlur}
                  showPassword={showPassword} setShowPassword={setShowPassword}
                  showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
                  bloqueada={!seccion2Completa}
                />

                <label className={`registro-terminos${terminosError ? " has-error" : ""}${!seccion3Completa ? " registro-terminos--bloqueado" : ""}`}>
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    disabled={!seccion3Completa}
                    onChange={(e) => { setAceptaTerminos(e.target.checked); setTerminosError(""); }}
                  />
                  <span>
                    Confirmo que deseo unirme a Sportwear, aceptando los <Link to="/terminos">Términos y condiciones</Link> y la <Link to="/privacidad">Política de tratamiento de datos personales</Link>.
                  </span>
                </label>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? "Creando cuenta..." : "Registrarme →"}
                </button>

                <p className="registro-login-link">
                  ¿Ya tienes cuenta activa? <Link to="/login">Inicia sesión</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
