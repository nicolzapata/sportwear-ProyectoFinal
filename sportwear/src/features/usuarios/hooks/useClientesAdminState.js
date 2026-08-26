import { useState, useEffect, useRef } from "react";
import api from "../../../shared/services/api";
import { validarNumeroDocumento, validarTelefono, validarNombre } from "../../../shared/utils/numerico";
import {
  FILAS_POR_PAGINA, dividirNombre,
  errorEmailCliente, errorCiudadCliente, revisarContrasenaCliente, revisarConfirmarCliente,
} from "../utils/usuariosHelpers";

/**
 * useClientesAdminState
 *
 * CRUD de clientes desde el panel de administración (ClientesTable,
 * ClienteFormModal, ClienteDetalleModal) — es una entidad distinta de los
 * usuarios internos (useUsuariosState), con su propio formulario y sus
 * propias validaciones (contraseña de acceso, permiso de cuotas, etc).
 */
export function useClientesAdminState({ tieneClientes, filterType, busquedaDebounced, setModal, setGuardandoModal, setLoading, showToast, editar, setEditar }) {
  const [clientes,       setClientes]       = useState([]);
  const [totalClientesTab, setTotalClientesTab] = useState(0);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [clienteDetalle, setClienteDetalle] = useState(null);

  const [clienteForm, setClienteForm] = useState({
    nombres: "", apellidos: "", tipo_doc: "CC", documento: "", telefono: "", email: "",
    ciudad: "Medellín", id_barrio: "", direccion: "",
    contrasena: "", confirmar: "", permiso_cuotas: 0, estado: "Activo"
  });
  const [erroresCliente, setErroresCliente] = useState({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });

  // Ref para descartar la respuesta de /check-email si el usuario ya cambió
  // el campo mientras la verificación estaba en vuelo.
  const clienteFormRef = useRef(clienteForm);
  useEffect(() => { clienteFormRef.current = clienteForm; }, [clienteForm]);

  const cargarClientesTab = async (pag = paginaClientes, q = busquedaDebounced) => {
    if (!tieneClientes) return;
    try {
      const { data } = await api.get("/clientes/rol-cliente", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setClientes(data.data);
      setTotalClientesTab(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (filterType === "clientes") cargarClientesTab(paginaClientes, busquedaDebounced);
  }, [filterType, tieneClientes, paginaClientes, busquedaDebounced]);

  const abrirRegistrarCliente = () => {
    setEditar(null);
    setErroresCliente({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });
    setClienteForm({ nombres: "", apellidos: "", tipo_doc: "CC", documento: "", telefono: "", email: "", ciudad: "Medellín", id_barrio: "", direccion: "", contrasena: "", confirmar: "", permiso_cuotas: 0, estado: "Activo" });
    setModal(true);
  };

  const abrirEditarCliente = (c) => {
    setEditar(c.id_cliente);
    setErroresCliente({ nombres: "", apellidos: "", documento: "", telefono: "", email: "", ciudad: "", direccion: "", id_barrio: "", contrasena: "", confirmar: "" });
    setClienteForm({ ...dividirNombre(c.nombre), tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", ciudad: c.ciudad || "Medellín", id_barrio: c.id_barrio || "", direccion: c.direccion || "", contrasena: "", confirmar: "", permiso_cuotas: c.permiso_cuotas ? 1 : 0, estado: c.estado });
    setModal(true);
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

  const handleGuardarCliente = async () => {
    const okDatos = validarPasoClienteDatos();
    const okUbicacion = validarPasoClienteUbicacionClasificacion();
    if (!okDatos || !okUbicacion) return;
    setGuardandoModal(true);
    await guardarCliente();
    setGuardandoModal(false);
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
    clientes, totalClientesTab, paginaClientes, setPaginaClientes,
    clienteDetalle, setClienteDetalle,
    clienteForm, setClienteForm, erroresCliente, setErroresCliente, clienteFormRef,
    cargarClientesTab, abrirRegistrarCliente, abrirEditarCliente,
    handleGuardarCliente, toggleEstadoCliente, toggleClientePermisoCuotas,
  };
}
