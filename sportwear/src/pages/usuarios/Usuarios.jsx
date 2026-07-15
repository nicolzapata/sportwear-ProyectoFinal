// src/pages/usuarios/Usuarios.jsx
import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import StatusToggle from "../../components/StatusToggle";
import Toast from "../../components/Toast";
import Loader from "../../components/Loader";
import ExportButtons from "../../components/ExportButtons";
import { soloDigitos, maxLongitudDocumento, validarNumeroDocumento, validarTelefono, validarNombre, validarEmail, LONGITUD_TELEFONO } from "../../utils/numerico";
import './Usuarios.css';
import { IconEdit, IconEyeOpen, IconEyeClosed, IconLock, IconSearch, IconX } from "../../components/Icons";

const TIPOS_DOC = ["CC", "CE", "TI", "NIT", "PP"];
const FILAS_POR_PAGINA = 10;
const normalizeM = (v) => v?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export default function Usuarios() {
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
  const [modal,          setModal]          = useState(false);
  const [pasoModal,      setPasoModal]      = useState(0);
  const [detalle,        setDetalle]        = useState(null);
  const [clienteDetalle, setClienteDetalle] = useState(null);
  const [editar,         setEditar]         = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showPassword,   setShowPassword]   = useState(false);
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [paginaClientes, setPaginaClientes] = useState(1);
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
    contrasena: "", confirmar: "", permiso_cuotas: 1, estado: "Activo"
  });
  const [erroresCliente, setErroresCliente] = useState({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });

  // "nombre" completo (BD) -> primer palabra = nombres, resto = apellidos.
  const dividirNombre = (nombreCompleto) => {
    const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
    return { nombres: partes[0] || "", apellidos: partes.slice(1).join(" ") };
  };

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

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Ante un 409 del backend (correo/documento duplicado), en vez de mostrar el
  // mensaje solo en un toast genérico, lo pega al campo real y salta al paso
  // donde vive ese campo (paso 0 en ambos modales) para que sea visible.
  const atenderErrorCampo = (err, setErroresFn) => {
    const mensaje = err.response?.data?.message;
    if (err.response?.status === 409 && mensaje) {
      const campo = /correo|email/i.test(mensaje) ? "email" : /documento/i.test(mensaje) ? "documento" : null;
      if (campo) {
        setErroresFn(prev => ({ ...prev, [campo]: mensaje }));
        setPasoModal(0);
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    const promesas = [api.get("/roles"), api.get("/barrios")];
    if (tieneUsuarios) promesas.unshift(api.get("/usuarios"));

    Promise.all(promesas).then((res) => {
      if (tieneUsuarios) {
        setUsuarios(res[0].data);
        setRoles(res[1].data);
        setBarrios(res[2].data);
      } else {
        setRoles(res[0].data);
        setBarrios(res[1].data);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [tieneUsuarios]);

  useEffect(() => {
    if (filterType === "clientes" && tieneClientes) {
      api.get("/clientes/rol-cliente").then(r => setClientes(r.data)).catch(console.error);
    }
  }, [filterType, tieneClientes]);

  const getRoleName = (id_rol) =>
    roles.find(r => Number(r.id_rol) === Number(id_rol))?.nombre || id_rol;

  const filtrados = filterType === "usuarios"
    ? usuarios.filter(u =>
        u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(u.id_usuario).includes(busqueda.trim())
      )
    : clientes.filter(c =>
        c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.documento?.includes(busqueda)
      );

  const pagina       = filterType === "usuarios" ? paginaUsuarios : paginaClientes;
  const setPagina    = filterType === "usuarios" ? setPaginaUsuarios : setPaginaClientes;
  const totalPaginas = Math.ceil(filtrados.length / FILAS_POR_PAGINA);
  const filtradosPagina = filtrados.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);

  const abrirDetalle = async (u) => {
    setDetalle(u);
    try { const { data } = await api.get(`/usuarios/${u.id_usuario}`); setDetalle(data); }
    catch { showToast("error", "No se pudo cargar el detalle completo del usuario."); }
  };

  const abrirRegistrar = () => {
    setEditar(null);
    setErrores({ nombres: "", apellidos: "", documento: "", email: "", contrasena: "", confirmar: "", telefono: "", direccion: "", id_barrio: "" });
    setForm({ nombres: "", apellidos: "", email: "", contrasena: "", confirmar: "", id_rol: roles[0]?.id_rol || 1, estado: "Activo", tipo_doc: "CC", documento: "", telefono: "", ciudad: "Medellín", id_barrio: "", direccion: "" });
    setPasoModal(0);
    setModal(true);
  };

  const abrirRegistrarCliente = () => {
    setEditar(null);
    setErroresCliente({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });
    setClienteForm({ nombres: "", apellidos: "", tipo_doc: "CC", documento: "", telefono: "", email: "", ciudad: "Medellín", id_barrio: "", direccion: "", contrasena: "", confirmar: "", permiso_cuotas: 1, estado: "Activo" });
    setPasoModal(0);
    setModal(true);
  };

  const abrirEditar = async (u) => {
    setEditar(u.id_usuario);
    setErrores({ nombres: "", apellidos: "", documento: "", email: "", contrasena: "", confirmar: "", telefono: "", direccion: "", id_barrio: "" });
    setForm({ ...dividirNombre(u.nombre), email: u.email || "", contrasena: "", confirmar: "", id_rol: u.id_rol || roles[0]?.id_rol || 1, estado: u.estado || "Activo", tipo_doc: u.tipo_doc || "CC", documento: u.documento || "", telefono: u.telefono || "", ciudad: u.ciudad || "Medellín", id_barrio: u.id_barrio || "", direccion: u.direccion || "" });
    if (!u.tipo_doc) {
      try {
        const { data } = await api.get(`/usuarios/${u.id_usuario}`);
        setForm(f => ({ ...f, tipo_doc: data.tipo_doc || "CC", documento: data.documento || "", telefono: data.telefono || "", ciudad: data.ciudad || "Medellín", id_barrio: data.id_barrio || "", direccion: data.direccion || "" }));
      } catch (err) { console.error(err); }
    }
    setPasoModal(0);
    setModal(true);
  };

  const abrirEditarCliente = (c) => {
    setEditar(c.id_cliente);
    setErroresCliente({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });
    setClienteForm({ ...dividirNombre(c.nombre), tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", ciudad: c.ciudad || "Medellín", id_barrio: c.id_barrio || "", direccion: c.direccion || "", contrasena: "", confirmar: "", permiso_cuotas: c.permiso_cuotas || 1, estado: c.estado });
    setPasoModal(0);
    setModal(true);
  };

  // ── Validaciones usuario (combinadas, sin funciones sueltas sin usar) ──────
  const errorEmailUsuario = (valor) => validarEmail(valor);

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
    if (form.contrasena && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(form.contrasena)) e.contrasena = "La contraseña debe contener un símbolo";
    const errorConfirmar = revisarConfirmar(form.confirmar, form.contrasena);
    if (errorConfirmar) e.confirmar = errorConfirmar;
    setErrores(prev => ({ ...prev, ...e, ...(!e.documento && { documento: "" }), ...(!e.nombres && { nombres: "" }), ...(!e.apellidos && { apellidos: "" }), ...(!e.email && { email: "" }), ...(!e.telefono && { telefono: "" }), ...(!e.contrasena && { contrasena: "" }), ...(!e.confirmar && { confirmar: "" }) }));
    return Object.keys(e).length === 0;
  };

  // Mismas reglas que validarPasoDatosCuenta, factorizadas para reutilizar en onBlur/onChange (validación en tiempo real).
  const revisarContrasena = (valor) => {
    let msg = "";
    if (!editar && !valor) msg = "La contraseña es obligatoria";
    if (valor && valor.length < 6) msg = "La contraseña debe tener al menos 6 caracteres";
    if (valor && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(valor)) msg = "La contraseña debe contener un símbolo";
    return msg;
  };

  // Al editar sin cambiar la contraseña, "confirmar" no aplica (ambos quedan vacíos).
  const revisarConfirmar = (valor, contrasena) => {
    if (!contrasena && !valor) return "";
    if (!valor) return "Confirma la contraseña";
    if (valor !== contrasena) return "Las contraseñas no coinciden";
    return "";
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
      cargar();
      setModal(false);
    } catch (err) {
      if (!atenderErrorCampo(err, setErrores)) {
        showToast("error", err.response?.data?.message || "Error al guardar usuario");
      }
      return false;
    }
  };

  // ── Validaciones cliente (embebido) ────────────────────────────────────────
  const errorEmailCliente = (valor) => validarEmail(valor);
  const errorCiudadCliente = (valor) => (!valor.trim() ? "La ciudad es obligatoria" : "");
  const revisarContrasenaCliente = (valor) => {
    if (!editar && !valor) return "La contraseña es obligatoria";
    if (valor && valor.length < 6) return "Debe tener al menos 6 caracteres";
    if (valor && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(valor)) return "Debe contener al menos un símbolo";
    return "";
  };
  const revisarConfirmarCliente = (valor, contrasena) => {
    if (!contrasena && !valor) return "";
    if (!valor) return "Confirma la contraseña";
    if (valor !== contrasena) return "Las contraseñas no coinciden";
    return "";
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
    if (!editar) {
      const eContrasena = revisarContrasenaCliente(clienteForm.contrasena);
      if (eContrasena) e.contrasena = eContrasena;
      const eConfirmar = revisarConfirmarCliente(clienteForm.confirmar, clienteForm.contrasena);
      if (eConfirmar) e.confirmar = eConfirmar;
    }
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
        const { data } = await api.put(`/clientes/${editar}`, payload);
        setClientes(prev => prev.map(c => c.id_cliente === editar ? { ...c, ...data } : c));
        showToast("exito", "Cliente actualizado correctamente.");
      } else {
        const { data } = await api.post("/clientes", payload);
        setClientes(prev => [...prev, { ...data, barrio_nombre: "" }]);
        showToast("exito", "Cliente registrado correctamente.");
      }
      setModal(false);
    } catch (err) {
      if (!atenderErrorCampo(err, setErroresCliente)) {
        showToast("error", err.response?.data?.message || "Error al guardar cliente");
      }
      return false;
    }
  };

  const cargar = () => {
    if (tieneUsuarios) api.get("/usuarios").then(r => setUsuarios(r.data)).catch(console.error);
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
      await api.patch(`/clientes/${id}/permiso-cuotas`);
      setClientes(prev => prev.map(c => c.id_cliente === id ? { ...c, permiso_cuotas: !c.permiso_cuotas } : c));
    } catch { showToast("error", "Error al cambiar permiso de cuotas"); }
  };

  if (loading) return <Loader text="Cargando usuarios..." />;

  // ── Paso 1 (combinado): Documento + Cuenta ────────────────────────────────
  const PasosDatosCuenta = (
    <div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Tipo doc. <span className="ms-req">*</span></label>
          <select className="ms-form-select" value={form.tipo_doc}
            onChange={e => {
              const tipo_doc = e.target.value;
              setForm({ ...form, tipo_doc });
              if (errores.documento) {
                const msg = !form.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(tipo_doc, form.documento);
                setErrores(prev => ({ ...prev, documento: msg }));
              }
            }}>
            {TIPOS_DOC.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">N° documento <span className="ms-req">*</span></label>
          <input className={`ms-form-input${errores.documento ? " input-error" : ""}`} placeholder="1001234567" value={form.documento}
            inputMode={form.tipo_doc === "PP" ? "text" : "numeric"}
            maxLength={maxLongitudDocumento(form.tipo_doc)}
            onChange={e => {
              const documento = form.tipo_doc === "PP" ? e.target.value : soloDigitos(e.target.value);
              setForm({ ...form, documento });
              if (errores.documento) {
                const msg = !documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(form.tipo_doc, documento);
                setErrores(prev => ({ ...prev, documento: msg }));
              }
            }}
            onBlur={() => {
              const msg = !form.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(form.tipo_doc, form.documento);
              setErrores(prev => ({ ...prev, documento: msg }));
            }} />
          {errores.documento && <span className="ms-form-error">{errores.documento}</span>}
        </div>
      </div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Nombres <span className="ms-req">*</span></label>
          <input className={`ms-form-input${errores.nombres ? " input-error" : ""}`} placeholder="Ej: Nicol" value={form.nombres}
            onChange={e => {
              const nombres = e.target.value;
              setForm({ ...form, nombres });
              if (errores.nombres) setErrores(prev => ({ ...prev, nombres: validarNombre(nombres, "El nombre es obligatorio") }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, nombres: validarNombre(form.nombres, "El nombre es obligatorio") }))} />
          {errores.nombres && <span className="ms-form-error">{errores.nombres}</span>}
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Apellidos <span className="ms-req">*</span></label>
          <input className={`ms-form-input${errores.apellidos ? " input-error" : ""}`} placeholder="Ej: Zapata" value={form.apellidos}
            onChange={e => {
              const apellidos = e.target.value;
              setForm({ ...form, apellidos });
              if (errores.apellidos) setErrores(prev => ({ ...prev, apellidos: validarNombre(apellidos, "El apellido es obligatorio") }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, apellidos: validarNombre(form.apellidos, "El apellido es obligatorio") }))} />
          {errores.apellidos && <span className="ms-form-error">{errores.apellidos}</span>}
        </div>
      </div>

      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label>
          <input type="email" className={`ms-form-input${errores.email ? " input-error" : ""}`} placeholder="ejemplo@correo.com" value={form.email}
            disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined}
            onChange={e => {
              const email = e.target.value;
              setForm({ ...form, email });
              if (errores.email) setErrores(prev => ({ ...prev, email: errorEmailUsuario(email) }));
            }}
            onBlur={() => {
              const mensaje = errorEmailUsuario(form.email);
              setErrores(prev => ({ ...prev, email: mensaje }));
              if (!editar && !mensaje) {
                const valor = form.email.trim();
                if (valor) verificarEmailDuplicado(valor, setErrores, formRef);
              }
            }} />
          {errores.email && <span className="ms-form-error">{errores.email}</span>}
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Teléfono <span className="ms-req">*</span></label>
          <input className={`ms-form-input${errores.telefono ? " input-error" : ""}`} placeholder="3001234567" value={form.telefono} inputMode="numeric" maxLength={LONGITUD_TELEFONO}
            onChange={e => {
              const telefono = soloDigitos(e.target.value);
              setForm({ ...form, telefono });
              if (errores.telefono) setErrores(prev => ({ ...prev, telefono: validarTelefono(telefono) }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, telefono: validarTelefono(form.telefono) }))} />
          {errores.telefono && <span className="ms-form-error">{errores.telefono}</span>}
        </div>
      </div>
      {(!editar || editar === usuario?.id_usuario) && (
        <div className="ms-form-group">
          <label className="ms-form-label">Contraseña {!editar && <span className="ms-req">*</span>}</label>
          <div className="input-wrapper">
            <span className="input-icon"><IconLock /></span>
            <input type={showPassword ? "text" : "password"}
              className={`ms-form-input${errores.contrasena ? " input-error" : ""}`}
              placeholder={editar ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
              value={form.contrasena}
              onChange={e => {
                const contrasena = e.target.value;
                setForm({ ...form, contrasena });
                if (errores.contrasena) setErrores(prev => ({ ...prev, contrasena: revisarContrasena(contrasena) }));
                if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: revisarConfirmar(form.confirmar, contrasena) }));
              }}
              onBlur={() => setErrores(prev => ({ ...prev, contrasena: revisarContrasena(form.contrasena) }))} />
            <div className="input-bar" />
            <span className="input-icon" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <IconEyeOpen /> : <IconEyeClosed />}</span>
          </div>
          {errores.contrasena && <span className="ms-form-error">{errores.contrasena}</span>}
        </div>
      )}
      {(!editar || editar === usuario?.id_usuario) && (
        <div className="ms-form-group">
          <label className="ms-form-label">Confirmar contraseña {(!editar || form.contrasena) && <span className="ms-req">*</span>}</label>
          <input type="password"
            className={`ms-form-input${errores.confirmar ? " input-error" : ""}`}
            placeholder="Repite la contraseña"
            value={form.confirmar}
            onChange={e => {
              const confirmar = e.target.value;
              setForm({ ...form, confirmar });
              if (errores.confirmar) setErrores(prev => ({ ...prev, confirmar: revisarConfirmar(confirmar, form.contrasena) }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, confirmar: revisarConfirmar(form.confirmar, form.contrasena) }))} />
          {errores.confirmar && <span className="ms-form-error">{errores.confirmar}</span>}
        </div>
      )}
    </div>
  );

  // ── Paso 2 (combinado): Ubicación + Rol ───────────────────────────────────
  const PasosUbicacionRol = (
    <div>
      <div className="ms-form-group"><label className="ms-form-label">Ciudad</label><input className="ms-form-input" placeholder="Medellín" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} /></div>
      <div className="ms-form-row">
        <div className="ms-form-group">
          <label className="ms-form-label">Barrio <span className="ms-req">*</span></label>
          <select className={`ms-form-select${errores.id_barrio ? " input-error" : ""}`} value={form.id_barrio}
            onChange={e => {
              const id_barrio = e.target.value;
              setForm({ ...form, id_barrio });
              if (errores.id_barrio) setErrores(prev => ({ ...prev, id_barrio: id_barrio ? "" : prev.id_barrio }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, id_barrio: form.id_barrio ? "" : "Selecciona un barrio" }))}>
            <option value="">— Selecciona un barrio —</option>
            {barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
          </select>
          {errores.id_barrio && <span className="ms-form-error">{errores.id_barrio}</span>}
        </div>
        <div className="ms-form-group">
          <label className="ms-form-label">Dirección <span className="ms-req">*</span></label>
          <input className={`ms-form-input${errores.direccion ? " input-error" : ""}`} placeholder="Cra 43A # 10-20 Apto 301" value={form.direccion}
            onChange={e => {
              const direccion = e.target.value;
              setForm({ ...form, direccion });
              if (errores.direccion) setErrores(prev => ({ ...prev, direccion: direccion.trim() ? "" : prev.direccion }));
            }}
            onBlur={() => setErrores(prev => ({ ...prev, direccion: form.direccion.trim() ? "" : "La dirección es obligatoria" }))} />
          {errores.direccion && <span className="ms-form-error">{errores.direccion}</span>}
        </div>
      </div>

      {editar ? (
        <div className="ms-form-row">
          <div className="ms-form-group">
            <label className="ms-form-label">Rol</label>
            <select className="ms-form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>
              {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
            </select>
          </div>
          <div className="ms-form-group">
            <label className="ms-form-label">Estado</label>
            <select
              className="ms-form-select"
              value={esRolAdmin(form.id_rol) ? "Activo" : form.estado}
              disabled={esRolAdmin(form.id_rol)}
              title={esRolAdmin(form.id_rol) ? "Un administrador siempre permanece activo" : undefined}
              onChange={e => setForm({ ...form, estado: e.target.value })}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="ms-form-group">
          <label className="ms-form-label">Rol</label>
          <select className="ms-form-select" value={form.id_rol} onChange={e => setForm({ ...form, id_rol: Number(e.target.value) })}>
            {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  const DetalleDatosCuenta = detalle && (
    <>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Tipo doc." value={detalle.tipo_doc} />
        <DetalleItem label="Documento" value={detalle.documento} />
        <DetalleItem label="Nombre completo" value={detalle.nombre} full />
      </DetalleGrid></DetalleSeccion>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Correo electrónico" value={detalle.email} />
        <DetalleItem label="Teléfono" value={detalle.telefono} />
      </DetalleGrid></DetalleSeccion>
    </>
  );

  const DetalleUbicacionRol = detalle && (
    <>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Ciudad" value={detalle.ciudad} />
        <DetalleItem label="Barrio" value={detalle.barrio || null} />
        <DetalleItem label="Dirección" value={detalle.direccion} full />
      </DetalleGrid></DetalleSeccion>
      <DetalleSeccion><DetalleGrid>
        <DetalleItem label="Rol" value={detalle.rol || getRoleName(detalle.id_rol)} />
        <DetalleItem label="Estado" value={detalle.estado} />
        <DetalleItem label="Fecha de creación" value={detalle.fecha_creacion ? new Date(detalle.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null} />
      </DetalleGrid></DetalleSeccion>
    </>
  );

  return (
    <div className="usuarios-container">
      <div className="usuarios-actions-bar">
        <div className="usuarios-actions-left">
          <div className="usuarios-search-wrapper">
            <span className="usuarios-search-icon"><IconSearch /></span>
            <input type="text" className="usuarios-search-input" placeholder={filterType === 'usuarios' ? "Buscar por nombre, email o ID..." : "Buscar por nombre o documento..."} value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPaginaUsuarios(1); setPaginaClientes(1); }} />
            {busqueda && <button className="usuarios-search-clear" onClick={() => { setBusqueda(""); setPaginaUsuarios(1); setPaginaClientes(1); }}><IconX /></button>}
          </div>

          {tieneUsuarios && tieneClientes && (
            <div className="usuarios-filter-toggle">
              <button className={`usuarios-filter-btn ${filterType === 'usuarios' ? 'active' : ''}`} onClick={() => { setFilterType('usuarios'); setPaginaUsuarios(1); }}>Usuarios</button>
              <button className={`usuarios-filter-btn ${filterType === 'clientes' ? 'active' : ''}`} onClick={() => { setFilterType('clientes'); setPaginaClientes(1); }}>Clientes</button>
            </div>
          )}
        </div>

        <div className="usuarios-actions-right">
          {filterType === 'usuarios' && tienePerm('Usuarios.crear') && (
            <button className="usuarios-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo usuario</button>
          )}
          {filterType === 'clientes' && tienePerm('Clientes.crear') && (
            <button className="usuarios-btn-primary" onClick={abrirRegistrarCliente}><span>+</span> Nuevo cliente</button>
          )}
          <ExportButtons
            datos={filtrados}
            columnas={filterType === 'usuarios' ? [
              { header: "Usuario", key: "nombre" },
              { header: "Email", key: "email" },
              { header: "Rol", key: "rol" },
              { header: "Estado", key: "estado" },
            ] : [
              { header: "Cliente", key: "nombre" },
              { header: "Documento", key: "documento" },
              { header: "Teléfono", key: "telefono" },
              { header: "Barrio", key: "barrio_nombre" },
              { header: "Cuotas", value: (c) => c.permiso_cuotas !== false ? "Sí" : "No" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo={filterType === 'usuarios' ? "usuarios" : "clientes"}
            titulo={filterType === 'usuarios' ? "Usuarios" : "Clientes"}
          />
        </div>
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            {filterType === 'usuarios' ? (
              <tr>
                <th className="tbl-th">Usuario</th>
                <th className="tbl-th">Email</th>
                <th className="tbl-th">Rol</th>
                {tienePerm('Usuarios.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            ) : (
              <tr>
                <th className="tbl-th">Cliente</th>
                <th className="tbl-th">Documento</th>
                <th className="tbl-th">Teléfono</th>
                <th className="tbl-th">Cuotas</th>
                {tienePerm('Clientes.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            )}
          </thead>
          <tbody className="tbl-body">
            {filtradosPagina.length === 0 ? (
              <tr><td colSpan="100%" className="tbl-td usuarios-empty-row">{busqueda ? `No se encontraron resultados para "${busqueda}".` : "No hay registros para mostrar."}</td></tr>
            ) : filterType === 'usuarios' ? (
              filtradosPagina.map(u => (
                <tr key={u.id_usuario} className="tbl-row">
                  <td className="tbl-td"><div className="usuarios-user-info"><div className="usuarios-user-name">{u.nombre}</div></div></td>
                  <td className="tbl-td usuarios-email-cell">{u.email}</td>
                  <td className="tbl-td"><span className="tabla-rol">{u.rol || getRoleName(u.id_rol)}</span></td>
                  {tienePerm('Usuarios.estado') && (
                    <td className="tbl-td">
                      <StatusToggle
                        id={u.id_usuario}
                        estado={u.estado}
                        onToggle={toggleEstadoUsuario}
                        showConfirmation={true}
                        disabled={esRolAdmin(u.id_rol)}
                        disabledReason="Un administrador siempre permanece activo"
                      />
                    </td>
                  )}
                  <td className="tbl-td">
                    <div className="usuarios-action-cell">
                      <button className="usuarios-action-btn usuarios-view-btn" onClick={() => abrirDetalle(u)} title="Ver detalles"><IconEyeOpen /></button>
                      {tienePerm('Usuarios.editar') && (
                        <button className="usuarios-action-btn usuarios-edit-btn" onClick={() => abrirEditar(u)} title="Editar"><IconEdit /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              filtradosPagina.map(c => (
                <tr key={c.id_cliente} className="tbl-row">
                  <td className="tbl-td"><div className="clientes-user-info"><div className="clientes-user-name">{c.nombre}</div><div className="clientes-user-email">{c.email}</div></div></td>
                  <td className="tbl-td"><span className="clientes-doc-badge">{c.tipo_doc} {c.documento}</span></td>
                  <td className="tbl-td clientes-phone-cell">{c.telefono || '—'}</td>
                  <td className="tbl-td">
                    {tienePerm('Clientes.editar')
                      ? <span className={`tabla-status ${c.permiso_cuotas !== false ? "activo" : "inactivo"}`} onClick={() => toggleClientePermisoCuotas(c.id_cliente)} style={{ cursor: 'pointer' }} title="Click para cambiar">{c.permiso_cuotas !== false ? "Sí" : "No"}</span>
                      : <span className={`tabla-status ${c.permiso_cuotas !== false ? "activo" : "inactivo"}`}>{c.permiso_cuotas !== false ? "Sí" : "No"}</span>
                    }
                  </td>
                  {tienePerm('Clientes.estado') && (
                    <td className="tbl-td"><StatusToggle id={c.id_cliente} estado={c.estado} onToggle={toggleEstadoCliente} showConfirmation={true} /></td>
                  )}
                  <td className="tbl-td">
                    <div className="clientes-action-cell">
                      <button className="clientes-action-btn clientes-view-btn" onClick={() => setClienteDetalle(c)} title="Ver detalles"><IconEyeOpen /></button>
                      {tienePerm('Clientes.editar') && (
                        <button className="clientes-action-btn clientes-edit-btn" onClick={() => abrirEditarCliente(c)} title="Editar"><IconEdit /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPaginas > 1 && (
          <div className="paginador">
            <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
              <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
            ))}
            <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
            <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtrados.length} registros</span>
          </div>
        )}
      </div>

      {modal && filterType === 'usuarios' && (
        <ModalSteps titulo={editar ? "Editar usuario" : "Nuevo usuario"} pasos={["Datos y cuenta", "Ubicación y rol"]}
          step={pasoModal} onStepChange={setPasoModal}
          onClose={() => setModal(false)} onGuardar={guardar}
          validaciones={[validarPasoDatosCuenta, validarPasoUbicacionRol]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}>
          {PasosDatosCuenta}{PasosUbicacionRol}
        </ModalSteps>
      )}

      {modal && filterType === 'clientes' && (
        <ModalSteps titulo={editar ? "Editar cliente" : "Nuevo cliente"} pasos={["Datos personales", "Ubicación y clasificación"]}
          step={pasoModal} onStepChange={setPasoModal}
          onClose={() => setModal(false)} onGuardar={guardarCliente}
          validaciones={[validarPasoClienteDatos, validarPasoClienteUbicacionClasificacion]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}>
          <div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">Nombres <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.nombres ? " input-error" : ""}`} placeholder="Ej: Juan" value={clienteForm.nombres}
                onChange={e => { const nombres = e.target.value; setClienteForm({ ...clienteForm, nombres }); if (erroresCliente.nombres) setErroresCliente(prev => ({ ...prev, nombres: validarNombre(nombres) })); }}
                onBlur={() => setErroresCliente(prev => ({ ...prev, nombres: validarNombre(clienteForm.nombres) }))} />{erroresCliente.nombres && <span className="ms-form-error">{erroresCliente.nombres}</span>}</div>
              <div className="ms-form-group"><label className="ms-form-label">Apellidos <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.apellidos ? " input-error" : ""}`} placeholder="Ej: Pérez" value={clienteForm.apellidos}
                onChange={e => { const apellidos = e.target.value; setClienteForm({ ...clienteForm, apellidos }); if (erroresCliente.apellidos) setErroresCliente(prev => ({ ...prev, apellidos: validarNombre(apellidos, "El apellido es obligatorio") })); }}
                onBlur={() => setErroresCliente(prev => ({ ...prev, apellidos: validarNombre(clienteForm.apellidos, "El apellido es obligatorio") }))} />{erroresCliente.apellidos && <span className="ms-form-error">{erroresCliente.apellidos}</span>}</div>
            </div>
            <div className="ms-form-row">
              <div className="ms-form-group"><label className="ms-form-label">Tipo documento</label><select className="ms-form-select" value={clienteForm.tipo_doc} disabled={!!editar}
                onChange={e => {
                  const tipo_doc = e.target.value;
                  setClienteForm({ ...clienteForm, tipo_doc });
                  if (erroresCliente.documento) {
                    const msg = !clienteForm.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(tipo_doc, clienteForm.documento);
                    setErroresCliente(prev => ({ ...prev, documento: msg }));
                  }
                }}>{["CC", "CE", "TI", "NIT", "Pasaporte"].map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="ms-form-group"><label className="ms-form-label">N° documento <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.documento ? " input-error" : ""}`} placeholder="123456789" value={clienteForm.documento} disabled={!!editar} title={editar ? "El documento no se puede modificar" : undefined} inputMode={clienteForm.tipo_doc === "Pasaporte" ? "text" : "numeric"} maxLength={maxLongitudDocumento(clienteForm.tipo_doc)}
                onChange={e => {
                  const documento = clienteForm.tipo_doc === "Pasaporte" ? e.target.value : soloDigitos(e.target.value);
                  setClienteForm({ ...clienteForm, documento });
                  if (erroresCliente.documento) {
                    const msg = !documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(clienteForm.tipo_doc, documento);
                    setErroresCliente(prev => ({ ...prev, documento: msg }));
                  }
                }}
                onBlur={() => {
                  const msg = !clienteForm.documento.trim() ? "El documento es obligatorio" : validarNumeroDocumento(clienteForm.tipo_doc, clienteForm.documento);
                  setErroresCliente(prev => ({ ...prev, documento: msg }));
                }} />{erroresCliente.documento && <span className="ms-form-error">{erroresCliente.documento}</span>}</div>
            </div>
            <div className="ms-form-group"><label className="ms-form-label">Teléfono <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.telefono ? " input-error" : ""}`} placeholder="3001234567" value={clienteForm.telefono} inputMode="numeric" maxLength={LONGITUD_TELEFONO}
              onChange={e => { const telefono = soloDigitos(e.target.value); setClienteForm({ ...clienteForm, telefono }); if (erroresCliente.telefono) setErroresCliente(prev => ({ ...prev, telefono: validarTelefono(telefono) })); }}
              onBlur={() => setErroresCliente(prev => ({ ...prev, telefono: validarTelefono(clienteForm.telefono) }))} />{erroresCliente.telefono && <span className="ms-form-error">{erroresCliente.telefono}</span>}</div>
            <div className="ms-form-group"><label className="ms-form-label">Correo electrónico <span className="ms-req">*</span></label><input type="email" className={`ms-form-input${erroresCliente.email ? " input-error" : ""}`} placeholder="ejemplo@correo.com" value={clienteForm.email} disabled={!!editar} title={editar ? "El correo no se puede modificar" : undefined}
                onChange={e => { const email = e.target.value; setClienteForm({ ...clienteForm, email }); if (erroresCliente.email) setErroresCliente(prev => ({ ...prev, email: errorEmailCliente(email) })); }}
                onBlur={() => {
                  const mensaje = errorEmailCliente(clienteForm.email);
                  setErroresCliente(prev => ({ ...prev, email: mensaje }));
                  if (!editar && !mensaje) {
                    const valor = clienteForm.email.trim();
                    if (valor) verificarEmailDuplicado(valor, setErroresCliente, clienteFormRef);
                  }
                }} />{erroresCliente.email && <span className="ms-form-error">{erroresCliente.email}</span>}</div>
          </div>
          <div>
            <div className="ms-form-group"><label className="ms-form-label">Ciudad <span className="ms-req">*</span></label><input className={`ms-form-input${erroresCliente.ciudad ? " input-error" : ""}`} placeholder="Medellín" value={clienteForm.ciudad}
              onChange={e => { const ciudad = e.target.value; setClienteForm({ ...clienteForm, ciudad }); if (erroresCliente.ciudad) setErroresCliente(prev => ({ ...prev, ciudad: errorCiudadCliente(ciudad) })); }}
              onBlur={() => setErroresCliente(prev => ({ ...prev, ciudad: errorCiudadCliente(clienteForm.ciudad) }))} />{erroresCliente.ciudad && <span className="ms-form-error">{erroresCliente.ciudad}</span>}</div>
            <div className="ms-form-row">
              <div className="ms-form-group">
                <label className="ms-form-label">Barrio <span className="ms-req">*</span></label>
                <select className={`ms-form-select${erroresCliente.id_barrio ? " input-error" : ""}`} value={clienteForm.id_barrio}
                  onChange={e => {
                    const id_barrio = Number(e.target.value);
                    setClienteForm({ ...clienteForm, id_barrio });
                    if (erroresCliente.id_barrio) setErroresCliente(prev => ({ ...prev, id_barrio: id_barrio ? "" : prev.id_barrio }));
                  }}
                  onBlur={() => setErroresCliente(prev => ({ ...prev, id_barrio: clienteForm.id_barrio ? "" : "Selecciona un barrio" }))}>
                  <option value="">— Seleccionar —</option>
                  {barrios.map(b => <option key={b.id_barrio} value={b.id_barrio}>{b.nombre}</option>)}
                </select>
                {erroresCliente.id_barrio && <span className="ms-form-error">{erroresCliente.id_barrio}</span>}
              </div>
              <div className="ms-form-group">
                <label className="ms-form-label">Dirección completa <span className="ms-req">*</span></label>
                <input className={`ms-form-input${erroresCliente.direccion ? " input-error" : ""}`} placeholder="Cra 70 # 48-15 Apto 201" value={clienteForm.direccion}
                  onChange={e => {
                    const direccion = e.target.value;
                    setClienteForm({ ...clienteForm, direccion });
                    if (erroresCliente.direccion) setErroresCliente(prev => ({ ...prev, direccion: direccion.trim() ? "" : prev.direccion }));
                  }}
                  onBlur={() => setErroresCliente(prev => ({ ...prev, direccion: clienteForm.direccion.trim() ? "" : "La dirección es obligatoria" }))} />
                {erroresCliente.direccion && <span className="ms-form-error">{erroresCliente.direccion}</span>}
              </div>
            </div>

            {!editar && (
              <div className="ms-form-row">
                <div className="ms-form-group"><label className="ms-form-label">Contraseña <span className="ms-req">*</span></label><input type="password" className={`ms-form-input${erroresCliente.contrasena ? " input-error" : ""}`} placeholder="Mín. 6 caracteres" value={clienteForm.contrasena}
                  onChange={e => {
                    const contrasena = e.target.value;
                    setClienteForm({ ...clienteForm, contrasena });
                    if (erroresCliente.contrasena) setErroresCliente(prev => ({ ...prev, contrasena: revisarContrasenaCliente(contrasena) }));
                    if (erroresCliente.confirmar) setErroresCliente(prev => ({ ...prev, confirmar: revisarConfirmarCliente(clienteForm.confirmar, contrasena) }));
                  }}
                  onBlur={() => setErroresCliente(prev => ({ ...prev, contrasena: revisarContrasenaCliente(clienteForm.contrasena) }))} />{erroresCliente.contrasena && <span className="ms-form-error">{erroresCliente.contrasena}</span>}</div>
                <div className="ms-form-group"><label className="ms-form-label">Confirmar contraseña <span className="ms-req">*</span></label><input type="password" className={`ms-form-input${erroresCliente.confirmar ? " input-error" : ""}`} placeholder="Repite la contraseña" value={clienteForm.confirmar}
                  onChange={e => {
                    const confirmar = e.target.value;
                    setClienteForm({ ...clienteForm, confirmar });
                    if (erroresCliente.confirmar) setErroresCliente(prev => ({ ...prev, confirmar: revisarConfirmarCliente(confirmar, clienteForm.contrasena) }));
                  }}
                  onBlur={() => setErroresCliente(prev => ({ ...prev, confirmar: revisarConfirmarCliente(clienteForm.confirmar, clienteForm.contrasena) }))} />{erroresCliente.confirmar && <span className="ms-form-error">{erroresCliente.confirmar}</span>}</div>
              </div>
            )}
            {editar ? (
              <div className="ms-form-row">
                <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={clienteForm.permiso_cuotas} onChange={e => setClienteForm({ ...clienteForm, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
                <div className="ms-form-group"><label className="ms-form-label">Estado</label><select className="ms-form-select" value={clienteForm.estado} onChange={e => setClienteForm({ ...clienteForm, estado: e.target.value })}><option value="Activo">Activo</option><option value="Inactivo">Inactivo</option></select></div>
              </div>
            ) : (
              <div className="ms-form-group"><label className="ms-form-label">Pago por cuotas</label><select className="ms-form-select" value={clienteForm.permiso_cuotas} onChange={e => setClienteForm({ ...clienteForm, permiso_cuotas: Number(e.target.value) })}><option value={1}>Permitido</option><option value={0}>Bloqueado</option></select></div>
            )}
          </div>
        </ModalSteps>
      )}

      {detalle && (
        <ModalDetalle titulo="Perfil del usuario" subtitulo={detalle.nombre}
          badge={<span className={`tabla-status ${detalle.estado === "Activo" ? "activo" : "inactivo"}`}>{detalle.estado}</span>}
          pasos={["Datos y cuenta", "Ubicación y rol"]}
          onClose={() => setDetalle(null)}
          onEditar={tienePerm('Usuarios.editar') ? () => { setDetalle(null); abrirEditar(detalle); } : undefined}
        >
          {DetalleDatosCuenta}{DetalleUbicacionRol}
        </ModalDetalle>
      )}

      {clienteDetalle && (
        <ModalDetalle titulo="Detalle del cliente" subtitulo={clienteDetalle.nombre}
          badge={<span className={`tabla-status ${clienteDetalle.estado === "Activo" ? "activo" : "inactivo"}`}>{clienteDetalle.estado}</span>}
          pasos={["Datos personales", "Ubicación y clasificación"]}
          onClose={() => setClienteDetalle(null)}
          onEditar={tienePerm('Clientes.editar') ? () => { setClienteDetalle(null); abrirEditarCliente(clienteDetalle); } : undefined}
        >
          <DetalleSeccion><DetalleGrid>
            <DetalleItem label="Nombre completo"    value={clienteDetalle.nombre} full />
            <DetalleItem label="Tipo documento"     value={clienteDetalle.tipo_doc} />
            <DetalleItem label="N° documento"       value={clienteDetalle.documento} />
            <DetalleItem label="Teléfono"           value={clienteDetalle.telefono} />
            <DetalleItem label="Correo electrónico" value={clienteDetalle.email} />
          </DetalleGrid></DetalleSeccion>
          <>
            <DetalleSeccion><DetalleGrid>
              <DetalleItem label="Ciudad"             value={clienteDetalle.ciudad} />
              <DetalleItem label="Barrio"             value={clienteDetalle.barrio_nombre || null} />
              <DetalleItem label="Dirección completa" value={clienteDetalle.direccion} full />
            </DetalleGrid></DetalleSeccion>
            <DetalleSeccion><DetalleGrid>
              <DetalleItem label="Pago por cuotas" value={clienteDetalle.permiso_cuotas ? "Permitido" : "Bloqueado"} />
              <DetalleItem label="Estado"          value={clienteDetalle.estado} />
            </DetalleGrid></DetalleSeccion>
          </>
        </ModalDetalle>
      )}

      <Toast toast={toast} />
    </div>
  );
}