import { useState, useEffect, useRef } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { validarNumeroDocumento, validarTelefono, validarNombre } from "../../../shared/utils/numerico";
import {
  FILAS_POR_PAGINA, normalizeM, dividirNombre,
  errorEmailUsuario, revisarConfirmar,
  errorEmailCliente, errorCiudadCliente, revisarContrasenaCliente, revisarConfirmarCliente,
} from "../utils/usuariosHelpers";

export function useUsuarios() {
  const { usuario } = useAuth();

  const modulosUsuario = Array.isArray(usuario?.modulos) ? usuario.modulos.map(normalizeM) : [];
  const esAdmin        = usuario?.rol === 'Admin';
  const tieneUsuarios  = esAdmin || modulosUsuario.includes('usuarios');
  const tieneClientes  = esAdmin || modulosUsuario.includes('clientes');
  const tienePerm      = (p) => (usuario?.permisos || []).includes(p);

  const [usuarios,       setUsuarios]       = useState([]);
  const [clientes,       setClientes]       = useState([]);
  const [roles,          setRoles]          = useState([]);
  const esRolAdmin = (id_rol) => {
    const nombre = normalizeM(roles.find(r => r.id_rol === Number(id_rol))?.nombre);
    return nombre === 'administrador' || nombre === 'admin';
  };
  const [barrios,        setBarrios]        = useState([]);
  const [busqueda,       setBusqueda]       = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [modal,          setModal]          = useState(false);
  const [guardandoModal, setGuardandoModal] = useState(false);
  const [detalle,        setDetalle]        = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [editar,         setEditar]         = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showPassword,   setShowPassword]   = useState(false);
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [totalUsuarios,  setTotalUsuarios]  = useState(0);
  const [totalClientesTab, setTotalClientesTab] = useState(0);
  const [toast,          setToast]          = useState(null);

  const [filterType, setFilterType] = useState(() =>
    tieneUsuarios ? 'usuarios' : 'clientes'
  );

  const [form, setForm] = useState({
    nombres: "", apellidos: "", email: "", contrasena: "", confirmar: "", id_rol: 1, estado: "Activo",
    tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín",
    id_barrio: "", direccion: ""
  });

  const [errores, setErrores] = useState({ nombres: "", apellidos: "", documento: "", email: "", contrasena: "", confirmar: "", telefono: "", direccion: "", id_barrio: "" });

  const [clienteForm, setClienteForm] = useState({
    nombres: "", apellidos: "", tipo_doc: "CC", documento: "", telefono: "", email: "",
    ciudad: "Medellín", id_barrio: "", direccion: "",
    contrasena: "", confirmar: "", permiso_cuotas: 0, estado: "Activo"
  });
  const [erroresCliente, setErroresCliente] = useState({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });

  // Refs para descartar la respuesta de /check-email si el usuario ya cambió
  // el campo mientras la verificación estaba en vuelo.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const clienteFormRef = useRef(clienteForm);
  useEffect(() => { clienteFormRef.current = clienteForm; }, [clienteForm]);

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

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
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

  const cargarUsuarios = async (pag = paginaUsuarios, q = busquedaDebounced) => {
    if (!tieneUsuarios) return;
    try {
      const { data } = await api.get("/usuarios", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setUsuarios(data.data);
      setTotalUsuarios(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const cargarClientesTab = async (pag = paginaClientes, q = busquedaDebounced) => {
    if (!tieneClientes) return;
    try {
      const { data } = await api.get("/clientes/rol-cliente", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setClientes(data.data);
      setTotalClientesTab(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    Promise.all([api.get("/roles"), api.get("/barrios")]).then(([rolesRes, barriosRes]) => {
      setRoles(rolesRes.data);
      setBarrios(barriosRes.data);
    }).catch(console.error).finally(() => {
      if (!tieneUsuarios && !tieneClientes) setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPaginaUsuarios(1); setPaginaClientes(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarUsuarios(paginaUsuarios, busquedaDebounced); }, [tieneUsuarios, paginaUsuarios, busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (filterType === "clientes") cargarClientesTab(paginaClientes, busquedaDebounced);
  }, [filterType, tieneClientes, paginaClientes, busquedaDebounced]);

  const getRoleName = (id_rol) =>
    roles.find(r => Number(r.id_rol) === Number(id_rol))?.nombre || id_rol;

  const pagina       = filterType === "usuarios" ? paginaUsuarios : paginaClientes;
  const setPagina    = filterType === "usuarios" ? setPaginaUsuarios : setPaginaClientes;
  const totalRegistros = filterType === "usuarios" ? totalUsuarios : totalClientesTab;
  const totalPaginas = Math.ceil(totalRegistros / FILAS_POR_PAGINA) || 1;
  const filtradosPagina = filterType === "usuarios" ? usuarios : clientes;

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

  const abrirRegistrarCliente = () => {
    setEditar(null);
    setErroresCliente({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });
    setClienteForm({ nombres: "", apellidos: "", tipo_doc: "CC", documento: "", telefono: "", email: "", ciudad: "Medellín", id_barrio: "", direccion: "", contrasena: "", confirmar: "", permiso_cuotas: 0, estado: "Activo" });
    setModal(true);
  };

  const abrirEditar = async (u) => {
    // Un administrador no puede editar su propio usuario, solo visualizarlo.
    if (u.id_usuario === usuario?.id_usuario) { abrirDetalle(u); return; }
    setEditar(u.id_usuario);
    setErrores({ nombres: "", apellidos: "", documento: "", email: "", contrasena: "", confirmar: "", telefono: "", direccion: "", id_barrio: "" });
    setForm({ ...dividirNombre(u.nombre), email: u.email || "", contrasena: "", confirmar: "", id_rol: u.id_rol || roles[0]?.id_rol || 1, estado: u.estado || "Activo", tipo_doc: u.tipo_doc || "CC", documento: u.documento || "", telefono: u.telefono || "", ciudad: u.ciudad || "Medellín", id_barrio: u.id_barrio || "", direccion: u.direccion || "" });
    if (!u.tipo_doc) {
      try {
        const { data } = await api.get(`/usuarios/${u.id_usuario}`);
        setForm(f => ({ ...f, tipo_doc: data.tipo_doc || "CC", documento: data.documento || "", telefono: data.telefono || "", ciudad: data.ciudad || "Medellín", id_barrio: data.id_barrio || "", direccion: data.direccion || "" }));
      } catch (err) { console.error(err); }
    }
    setModal(true);
  };

  const abrirEditarCliente = (c) => {
    setEditar(c.id_cliente);
    setErroresCliente({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });
    setClienteForm({ ...dividirNombre(c.nombre), tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", ciudad: c.ciudad || "Medellín", id_barrio: c.id_barrio || "", direccion: c.direccion || "", contrasena: "", confirmar: "", permiso_cuotas: c.permiso_cuotas ? 1 : 0, estado: c.estado });
    setModal(true);
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

  const validarPasoClienteDatos = () => {
    const e = {};
    const eNombres = validarNombre(clienteForm.nombres);
    if (eNombres) e.nombres = eNombres;
    const eApellidos = validarNombre(clienteForm.apellidos, "El apellido es obligatorio");
    if (eApellidos) e.apellidos = eApellidos;
    if (!clienteForm.documento.trim()) e.documento = "El documento es obligatorio";
    else {
      const errorLongitud = validarNumeroDocumento(clienteForm.tipo_doc, clienteForm.documento);
      if (errorLongitud) e.documento = errorLongitud;
    }
    const errorTelefonoCliente = validarTelefono(clienteForm.telefono);
    if (errorTelefonoCliente) e.telefono = errorTelefonoCliente;
    const eEmail = errorEmailCliente(clienteForm.email);
    if (eEmail) e.email = eEmail;
    setErroresCliente(prev => ({ ...prev, ...e, ...(!e.nombres && { nombres: "" }), ...(!e.apellidos && { apellidos: "" }), ...(!e.documento && { documento: "" }), ...(!e.telefono && { telefono: "" }), ...(!e.email && { email: "" }) }));
    return Object.keys(e).length === 0;
  };

  const validarPasoClienteUbicacionClasificacion = () => {
    const e = {};
    const eCiudad = errorCiudadCliente(clienteForm.ciudad);
    if (eCiudad) e.ciudad = eCiudad;
    if (!clienteForm.id_barrio) e.id_barrio = "Selecciona un barrio";
    if (!clienteForm.direccion.trim()) e.direccion = "La dirección es obligatoria";
    // Al editar, dejar la contraseña vacía significa "no cambiarla" (revisarContrasenaCliente
    // ya lo permite); al crear, sigue siendo obligatoria.
    const eContrasena = revisarContrasenaCliente(clienteForm.contrasena, editar);
    if (eContrasena) e.contrasena = eContrasena;
    const eConfirmar = revisarConfirmarCliente(clienteForm.confirmar, clienteForm.contrasena);
    if (eConfirmar) e.confirmar = eConfirmar;
    setErroresCliente(prev => ({
      ...prev, ...e,
      ...(!e.ciudad && { ciudad: "" }), ...(!e.id_barrio && { id_barrio: "" }), ...(!e.direccion && { direccion: "" }),
      ...(!e.contrasena && { contrasena: "" }), ...(!e.confirmar && { confirmar: "" }),
    }));
    return Object.keys(e).length === 0;
  };

  const guardarCliente = async () => {
    const { nombres, apellidos, ...resto } = clienteForm;
    const payload = { ...resto, nombre: `${nombres} ${apellidos}`.trim() };
    try {
      if (editar) {
        await api.put(`/clientes/${editar}`, payload);
        showToast("exito", "Cliente actualizado correctamente.");
      } else {
        await api.post("/clientes", payload);
        showToast("exito", "Cliente registrado correctamente.");
      }
      cargarClientesTab();
      setModal(false);
    } catch (err) {
      if (!atenderErrorCampo(err, setErroresCliente)) {
        showToast("error", err.response?.data?.message || "Error al guardar cliente");
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

  const handleGuardarCliente = async () => {
    const okDatos = validarPasoClienteDatos();
    const okUbicacion = validarPasoClienteUbicacionClasificacion();
    if (!okDatos || !okUbicacion) return;
    setGuardandoModal(true);
    await guardarCliente();
    setGuardandoModal(false);
  };

  const toggleEstadoUsuario = async (id, nuevoEstado) => {
    await api.patch(`/usuarios/${id}/estado`);
    setUsuarios(prev => prev.map(u => u.id_usuario === id ? { ...u, estado: nuevoEstado } : u));
  };

  const toggleEstadoCliente = async (id, nuevoEstado) => {
    await api.patch(`/clientes/${id}/estado`);
    setClientes(prev => prev.map(c => c.id_cliente === id ? { ...c, estado: nuevoEstado } : c));
  };

  const toggleClientePermisoCuotas = async (id) => {
    try {
      const { data } = await api.patch(`/clientes/${id}/permiso-cuotas`);
      setClientes(prev => prev.map(c => c.id_cliente === id ? { ...c, permiso_cuotas: data.permiso_cuotas } : c));
      showToast("exito", data.permiso_cuotas ? "Pago por cuotas permitido." : "Pago por cuotas bloqueado.");
    } catch { showToast("error", "Error al cambiar permiso de cuotas"); }
  };

  return {
    usuario, tieneUsuarios, tieneClientes, tienePerm,
    usuarios, clientes, roles, esRolAdmin, barrios,
    busqueda, setBusqueda, busquedaDebounced,
    modal, setModal, guardandoModal, detalle, setDetalle, clienteDetalle, setClienteDetalle,
    editar, loading, showPassword, setShowPassword,
    paginaUsuarios, setPaginaUsuarios, paginaClientes, setPaginaClientes,
    toast,
    filterType, setFilterType,
    form, setForm, errores, setErrores,
    clienteForm, setClienteForm, erroresCliente, setErroresCliente,
    formRef, clienteFormRef, verificarDocumentoDuplicado, verificarEmailDuplicado,
    getRoleName, pagina, setPagina, totalRegistros, totalPaginas, filtradosPagina,
    abrirDetalle, abrirRegistrar, abrirRegistrarCliente, abrirEditar, abrirEditarCliente,
    handleGuardarUsuario, handleGuardarCliente,
    toggleEstadoUsuario, toggleEstadoCliente, toggleClientePermisoCuotas,
  };
}
