import { useState, useEffect, useRef } from "react";
import api from "../../../shared/services/api";
import { validarNumeroDocumento, validarTelefono, validarNombre } from "../../../shared/utils/numerico";
import { FILAS_POR_PAGINA, normalizeM, dividirNombre, errorEmailUsuario, revisarConfirmar } from "../utils/usuariosHelpers";

/**
 * useUsuariosState
 *
 * CRUD de usuarios internos (UsuariosTable, UsuarioFormModal,
 * UsuarioDetalleModal) — separado del CRUD de clientes desde el panel
 * admin (useClientesAdminState), que es una entidad distinta con su propio
 * formulario y validaciones.
 */
export function useUsuariosState({ usuarioActual, tieneUsuarios, roles, busquedaDebounced, setModal, setGuardandoModal, setLoading, showToast, editar, setEditar }) {
  const [usuarios,       setUsuarios]       = useState([]);
  const [totalUsuarios,  setTotalUsuarios]  = useState(0);
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [detalle,        setDetalle]        = useState(null);
  const [showPassword,   setShowPassword]   = useState(false);

  const [form, setForm] = useState({
    nombres: "", apellidos: "", email: "", contrasena: "", confirmar: "", id_rol: 1, estado: "Activo",
    tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín",
    id_barrio: "", direccion: ""
  });
  const [errores, setErrores] = useState({ nombres: "", apellidos: "", documento: "", email: "", contrasena: "", confirmar: "", telefono: "", direccion: "", id_barrio: "" });

  // Ref para descartar la respuesta de /check-email si el usuario ya cambió
  // el campo mientras la verificación estaba en vuelo.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  const esRolAdmin = (id_rol) => {
    const nombre = normalizeM(roles.find(r => r.id_rol === Number(id_rol))?.nombre);
    return nombre === 'administrador' || nombre === 'admin';
  };

  const cargarUsuarios = async (pag = paginaUsuarios, q = busquedaDebounced) => {
    if (!tieneUsuarios) return;
    try {
      const { data } = await api.get("/usuarios", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setUsuarios(data.data);
      setTotalUsuarios(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarUsuarios(paginaUsuarios, busquedaDebounced); }, [tieneUsuarios, paginaUsuarios, busquedaDebounced]);

  const abrirDetalle = async (u) => {
    setDetalle(u);
    try { const { data } = await api.get(`/usuarios/${u.id_usuario}`); setDetalle(data); }
    catch { showToast("error", "No se pudo cargar el detalle completo del usuario."); }
  };

  const abrirRegistrar = () => {
    setEditar(null);
    setErrores({ nombres: "", apellidos: "", documento: "", email: "", contrasena: "", confirmar: "", telefono: "", direccion: "", id_barrio: "" });
    setForm({ nombres: "", apellidos: "", email: "", contrasena: "", confirmar: "", id_rol: roles[0]?.id_rol || 1, estado: "Activo", tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín", id_barrio: "", direccion: "" });
    setModal(true);
  };

  const abrirEditar = async (u) => {
    // Un administrador no puede editar su propio usuario, solo visualizarlo.
    if (u.id_usuario === usuarioActual?.id_usuario) { abrirDetalle(u); return; }
    setEditar(u.id_usuario);
    setErrores({ nombres: "", apellidos: "", documento: "", email: "", contrasena: "", confirmar: "", telefono: "", direccion: "", id_barrio: "" });
    setForm({ ...dividirNombre(u.nombre), email: u.email || "", contrasena: "", confirmar: "", id_rol: u.id_rol || roles[0]?.id_rol || 1, estado: u.estado || "Activo", tipo_doc: u.tipo_doc || "CC", documento: u.documento || "", telefono: u.telefono || "", ciudad: u.ciudad || "Medellín", id_barrio: u.id_barrio || "", direccion: u.direccion || "" });
    // El listado (GET /usuarios) no trae telefono, ciudad, direccion ni id_barrio,
    // así que siempre hace falta consultar el detalle completo al editar.
    try {
      const { data } = await api.get(`/usuarios/${u.id_usuario}`);
      setForm(f => ({ ...f, tipo_doc: data.tipo_doc || "CC", documento: data.documento || "", telefono: data.telefono || "", ciudad: data.ciudad || "Medellín", id_barrio: data.id_barrio || "", direccion: data.direccion || "" }));
    } catch (err) { console.error(err); }
    setModal(true);
  };

  // Verificación en tiempo real (onBlur): si el correo ya existe, avisa de una vez
  // en vez de esperar a que se envíe todo el formulario.
  const verificarEmailDuplicado = async (email, setErroresFn, formRefActual) => {
    try {
      const { data } = await api.get("/auth/check-email", { params: { email } });
      if (data?.existe && formRefActual.current.email.trim() === email) {
        setErroresFn(prev => ({ ...prev, email: "Este correo ya está registrado." }));
      }
    } catch {
      // Si falla la verificación en tiempo real, el submit igual rechaza duplicados (409).
    }
  };

  // Igual que verificarEmailDuplicado pero para el documento.
  const verificarDocumentoDuplicado = async (tipo_doc, documento, setErroresFn, formRefActual) => {
    try {
      const { data } = await api.get("/auth/check-documento", { params: { tipo_doc, documento } });
      if (data?.existe && formRefActual.current.documento.trim() === documento) {
        setErroresFn(prev => ({ ...prev, documento: "Este documento ya está registrado." }));
      }
    } catch {
      // Si falla la verificación en tiempo real, el submit igual rechaza duplicados (409).
    }
  };

  // Ante un 409 del backend (correo/documento duplicado), en vez de mostrar el
  // mensaje solo en un toast genérico, lo pega al campo real para que sea visible.
  const atenderErrorCampo = (err, setErroresFn) => {
    const mensaje = err.response?.data?.message;
    if (err.response?.status === 409 && mensaje) {
      const campo = /correo|email/i.test(mensaje) ? "email" : /documento/i.test(mensaje) ? "documento" : null;
      if (campo) {
        setErroresFn(prev => ({ ...prev, [campo]: mensaje }));
        return true;
      }
    }
    return false;
  };

  const validarPasoDatosCuenta = () => {
    const e = {};
    if (!form.documento.trim()) e.documento = "El documento es obligatorio";
    else {
      const errorLongitud = validarNumeroDocumento(form.tipo_doc, form.documento);
      if (errorLongitud) e.documento = errorLongitud;
    }
    const errorNombres = validarNombre(form.nombres, "El nombre es obligatorio");
    if (errorNombres) e.nombres = errorNombres;
    const errorApellidos = validarNombre(form.apellidos, "El apellido es obligatorio");
    if (errorApellidos) e.apellidos = errorApellidos;
    const errorEmail = errorEmailUsuario(form.email);
    if (errorEmail) e.email = errorEmail;
    const errorTelefono = validarTelefono(form.telefono);
    if (errorTelefono) e.telefono = errorTelefono;
    if (!editar && !form.contrasena) e.contrasena = "La contraseña es obligatoria";
    if (form.contrasena && form.contrasena.length < 6) e.contrasena = "La contraseña debe tener al menos 6 caracteres";
    if (form.contrasena && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(form.contrasena)) e.contrasena = "Debe contener un carácter especial (!*&#).";
    const errorConfirmar = revisarConfirmar(form.confirmar, form.contrasena);
    if (errorConfirmar) e.confirmar = errorConfirmar;
    setErrores(prev => ({ ...prev, ...e, ...(!e.documento && { documento: "" }), ...(!e.nombres && { nombres: "" }), ...(!e.apellidos && { apellidos: "" }), ...(!e.email && { email: "" }), ...(!e.telefono && { telefono: "" }), ...(!e.contrasena && { contrasena: "" }), ...(!e.confirmar && { confirmar: "" }) }));
    return Object.keys(e).length === 0;
  };

  const validarPasoUbicacionRol = () => {
    const e = {};
    if (!form.id_barrio) e.id_barrio = "Selecciona un barrio";
    if (!form.direccion.trim()) e.direccion = "La dirección es obligatoria";
    setErrores(prev => ({ ...prev, ...e, ...(!e.id_barrio && { id_barrio: "" }), ...(!e.direccion && { direccion: "" }) }));
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    const { nombres, apellidos, ...resto } = form;
    const payload = { ...resto, nombre: `${nombres} ${apellidos}`.trim() };
    try {
      if (!editar) await api.post("/usuarios", payload);
      else         await api.put(`/usuarios/${editar}`, payload);
      cargarUsuarios();
      setModal(false);
      showToast("exito", editar ? "Usuario actualizado correctamente." : "Usuario registrado correctamente.");
    } catch (err) {
      if (!atenderErrorCampo(err, setErrores)) {
        showToast("error", err.response?.data?.message || "Error al guardar usuario");
      }
      return false;
    }
  };

  const handleGuardarUsuario = async () => {
    const okDatos = validarPasoDatosCuenta();
    const okUbicacion = validarPasoUbicacionRol();
    if (!okDatos || !okUbicacion) return;
    setGuardandoModal(true);
    await guardar();
    setGuardandoModal(false);
  };

  const toggleEstadoUsuario = async (id, nuevoEstado) => {
    await api.patch(`/usuarios/${id}/estado`);
    setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, estado: nuevoEstado } : u));
  };

  return {
    usuarios, totalUsuarios, paginaUsuarios, setPaginaUsuarios,
    detalle, setDetalle, showPassword, setShowPassword,
    form, setForm, errores, setErrores, formRef, esRolAdmin,
    cargarUsuarios, abrirDetalle, abrirRegistrar, abrirEditar,
    verificarEmailDuplicado, verificarDocumentoDuplicado,
    handleGuardarUsuario, toggleEstadoUsuario,
  };
}
