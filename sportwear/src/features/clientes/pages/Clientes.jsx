// src/pages/clientes/Clientes.jsx
import { useState, useEffect, useRef } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import ModalSteps from "../../../shared/components/ModalSteps";
import ModalDetalle from "../../../shared/components/ModalDetalle";
import Toast from "../../../shared/components/Toast";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import { validarTelefono } from "../../../shared/utils/numerico";
import "./Clientes.css";
import { IconSearch, IconX } from "../../../shared/components/Icons";
import { FORM_VACIO, dividirNombre, errorNombres, errorApellidos, errorDocumento, errorCiudad, errorEmail, errorContrasena, errorConfirmar } from "../utils/clientesHelpers";
import { PasoDatosCliente, PasoUbicacionCliente, PasoClasificacionCliente } from "../components/clientes/ClienteFormSteps";
import { DetalleDatosCliente, DetalleUbicacionCliente, DetalleClasificacionCliente } from "../components/clientes/ClienteDetalleSteps";
import ClientesTable from "../components/clientes/ClientesTable";

const FILAS_POR_PAGINA = 10;

export default function Clientes() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [datos,        setDatos]        = useState([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [barrios,      setBarrios]      = useState([]);
  const [zonas,        setZonas]        = useState([]);
  const [barFiltrados, setBarFiltrados] = useState([]);
  const [busqueda,     setBusqueda]     = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [pagina,       setPagina]       = useState(1);
  const [modal,        setModal]        = useState(false);
  const [pasoModal,    setPasoModal]    = useState(0);
  const [verDetalle,   setVerDetalle]   = useState(null);
  const [editar,       setEditar]       = useState(null);
  const [form,         setForm]         = useState(FORM_VACIO);
  const [errores,      setErrores]      = useState({ nombres: "", apellidos: "", documento: "" });
  const [toast,        setToast]        = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Para descartar la respuesta de /check-email si el usuario ya cambió
  // el campo mientras la verificación estaba en vuelo.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // Verificación en tiempo real (onBlur): si el correo ya existe, avisa de una vez
  // en vez de esperar a que se envíe todo el formulario.
  const verificarEmailDuplicado = async (email) => {
    try {
      const { data } = await api.get("/auth/check-email", { params: { email } });
      if (data?.existe && formRef.current.email.trim() === email) {
        setErrores(prev => ({ ...prev, email: "Este correo ya está registrado." }));
      }
    } catch {
      // Si falla la verificación en tiempo real, el submit igual rechaza duplicados (409).
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
      // Si falla la verificación en tiempo real, el submit igual rechaza duplicados (409).
    }
  };

  const cargarClientes = async (pag = pagina, q = busquedaDebounced) => {
    try {
      const { data } = await api.get("/clientes/con-ventas", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setDatos(data.data);
      setTotalClientes(data.total);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.get("/barrios"),
      api.get("/barrios/zonas")
    ]).then(([barriosRes, zonasRes]) => {
      setBarrios(barriosRes.data);
      setBarFiltrados(barriosRes.data);
      setZonas(zonasRes.data);
    }).catch((err) => {
      setError(err.response?.data?.message || "Error al cargar clientes");
    });
  }, []);

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarClientes(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter(b => b.zona === zona) : barrios);
    setForm(f => ({ ...f, id_barrio: "" }));
  };

  const totalPaginas = Math.ceil(totalClientes / FILAS_POR_PAGINA) || 1;

  const abrirRegistrar = () => { setEditar(null); setForm(FORM_VACIO); setBarFiltrados(barrios); setPasoModal(0); setModal(true); };
  const abrirEditar    = (c) => {
    setEditar(c.id_cliente);
    setForm({ ...dividirNombre(c.nombre), tipo_doc: c.tipo_doc, documento: c.documento, telefono: c.telefono || "", email: c.email || "", ciudad: c.ciudad || "Medellín", id_barrio: c.id_barrio || "", direccion: c.direccion || "", contrasena: "", confirmar: "", permiso_cuotas: c.permiso_cuotas ? 1 : 0, estado: c.estado });
    setBarFiltrados(barrios);
    setPasoModal(0);
    setModal(true);
  };

  // Ante un 409 del backend (correo/documento duplicado), en vez de mostrar el
  // mensaje solo en un toast genérico, lo pega al campo real y salta al paso
  // "Datos personales" (0), donde viven ambos campos, para que sea visible.
  const atenderErrorCampo = (err) => {
    const mensaje = err.response?.data?.message;
    if (err.response?.status === 409 && mensaje) {
      const campo = /correo|email/i.test(mensaje) ? "email" : /documento/i.test(mensaje) ? "documento" : null;
      if (campo) {
        setErrores(prev => ({ ...prev, [campo]: mensaje }));
        setPasoModal(0);
        return true;
      }
    }
    return false;
  };

  const guardar = async () => {
    if (!form.nombres || !form.apellidos || !form.documento) return false;
    const { nombres, apellidos, ...resto } = form;
    const payload = { ...resto, nombre: `${nombres} ${apellidos}`.trim() };
    try {
      if (editar) {
        await api.put(`/clientes/${editar}`, payload);
      } else {
        await api.post("/clientes", payload);
      }
      cargarClientes();
      setModal(false);
    } catch (err) {
      if (!atenderErrorCampo(err)) {
        showToast("error", err.response?.data?.message || "Error al guardar cliente");
      }
      return false;
    }
  };

  const validarPasoDatos = () => {
    const e = {};
    const eNombres = errorNombres(form.nombres);
    if (eNombres) e.nombres = eNombres;
    const eApellidos = errorApellidos(form.apellidos);
    if (eApellidos) e.apellidos = eApellidos;
    const eDocumento = errorDocumento(form.tipo_doc, form.documento);
    if (eDocumento) e.documento = eDocumento;
    const eTelefono = validarTelefono(form.telefono);
    if (eTelefono) e.telefono = eTelefono;
    const eEmail = errorEmail(form.email);
    if (eEmail) e.email = eEmail;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPasoUbicacion = () => {
    const eCiudad = errorCiudad(form.ciudad);
    setErrores(prev => ({ ...prev, ciudad: eCiudad }));
    return !eCiudad;
  };

  const validarPasoClasificacion = () => {
    const eContrasena = errorContrasena(form.contrasena, editar);
    const eConfirmar = errorConfirmar(form.confirmar, form.contrasena);
    setErrores(prev => ({ ...prev, contrasena: eContrasena, confirmar: eConfirmar }));
    return !eContrasena && !eConfirmar;
  };

  const toggleEstado = async (id, nuevoEstado) => {
    try {
      await api.patch(`/clientes/${id}/estado`);
      setDatos(prev => prev.map(c => c.id_cliente === id ? { ...c, estado: nuevoEstado } : c));
    } catch { showToast("error", "Error al cambiar estado"); }
  };

  if (loading) return <Loader text="Cargando clientes..." />;
  if (error) return <div style={{ padding: 32, color: "var(--danger)" }}>{error}</div>;

  return (
    <div className="clientes-container">
      <div className="clientes-actions-bar">
        <div className="clientes-search-wrapper">
          <span className="clientes-search-icon"><IconSearch /></span>
          <input type="text" className="clientes-search-input" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {busqueda && <button className="clientes-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>
          <div className="clientes-actions-right">
            {tienePerm('Clientes.crear') && (
              <button className="clientes-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo cliente</button>
            )}
            <ExportButtons
              obtenerDatos={async () => {
                const { data } = await api.get("/clientes/con-ventas", { params: { q: busquedaDebounced || undefined } });
                return data;
              }}
              columnas={[
                { header: "Cliente", key: "nombre" },
                { header: "Documento", value: (c) => `${c.tipo_doc} ${c.documento}` },
                { header: "Teléfono", value: (c) => c.telefono || "—" },
                { header: "Barrio", value: (c) => (c.barrio_nombre ? `${c.barrio_nombre} (${c.zona})` : "—") },
                { header: "Compras", value: (c) => c.total_compras || 0 },
                { header: "Total gastado", value: (c) => `$${Number(c.total_gastado || 0).toLocaleString("es-CO")}` },
                ...(tienePerm('Clientes.estado') ? [{ header: "Estado", key: "estado" }] : []),
              ]}
              nombreArchivo="clientes"
              titulo="Clientes"
            />
          </div>
      </div>

      <ClientesTable
        datos={datos}
        tienePerm={tienePerm}
        toggleEstado={toggleEstado}
        setVerDetalle={setVerDetalle}
        abrirEditar={abrirEditar}
        totalPaginas={totalPaginas}
        pagina={pagina}
        setPagina={setPagina}
        totalClientes={totalClientes}
      />

      {modal && (
        <ModalSteps
          titulo={editar ? "Editar cliente" : "Nuevo cliente"}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          step={pasoModal} onStepChange={setPasoModal}
          onClose={() => setModal(false)}
          onGuardar={guardar}
          validaciones={[validarPasoDatos, validarPasoUbicacion, validarPasoClasificacion]}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        >
          <PasoDatosCliente form={form} setForm={setForm} errores={errores} setErrores={setErrores} editar={editar} verificarDocumentoDuplicado={verificarDocumentoDuplicado} verificarEmailDuplicado={verificarEmailDuplicado} />
          <PasoUbicacionCliente form={form} setForm={setForm} zonas={zonas} barFiltrados={barFiltrados} handleZona={handleZona} />
          <PasoClasificacionCliente form={form} setForm={setForm} errores={errores} setErrores={setErrores} editar={editar} />
        </ModalSteps>
      )}

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle del cliente"
          subtitulo={verDetalle.nombre}
          badge={<span className={`tabla-status ${verDetalle.estado === "Activo" ? 'activo' : 'inactivo'}`}>{verDetalle.estado}</span>}
          pasos={["Datos personales", "Ubicación", "Clasificación"]}
          onClose={() => setVerDetalle(null)}
          onEditar={tienePerm('Clientes.editar') ? () => { setVerDetalle(null); abrirEditar(verDetalle); } : undefined}
        >
          <DetalleDatosCliente c={verDetalle} />
          <DetalleUbicacionCliente c={verDetalle} />
          <DetalleClasificacionCliente c={verDetalle} />
        </ModalDetalle>
      )}
      <Toast toast={toast} />
    </div>
  );
}
