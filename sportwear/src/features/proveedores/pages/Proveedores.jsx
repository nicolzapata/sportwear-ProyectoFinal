// src/pages/proveedores/Proveedores.jsx
import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import { validarNumeroDocumento, validarTelefono } from "../../../shared/utils/numerico";
// Proveedores.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import './Proveedores.layout.css';
import './Proveedores.modals.css';
import './Proveedores.responsive.css';
import { IconSearch, IconX } from "../../../shared/components/Icons";
import ProveedoresTable from "../components/proveedores/ProveedoresTable";
import ProveedorFormModal from "../components/proveedores/ProveedorFormModal";
import ProveedorDetalleModal from "../components/proveedores/ProveedorDetalleModal";
import {
  FILAS_POR_PAGINA, FORM_VACIO, dividirNombreContacto,
  validarCampoNombresContacto, validarCampoApellidosContacto, validarCampoEmail,
} from "../utils/proveedoresHelpers";

export default function Proveedores() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const showToast = useToast();

  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [modal, setModal] = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [pagina, setPagina] = useState(1);
  const [totalProveedores, setTotalProveedores] = useState(0);
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);

  const cargarProveedores = async (pag = pagina, q = busquedaDebounced) => {
    setCargando(true);
    setError("");
    try {
      const { data } = await api.get("/proveedores", { params: { page: pag, limit: FILAS_POR_PAGINA, q: q || undefined } });
      setDatos(data.data || []);
      setTotalProveedores(data.total);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar los proveedores.");
    } finally {
      setCargando(false);
    }
  };

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => { setPagina(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarProveedores(pagina, busquedaDebounced); }, [pagina, busquedaDebounced]);

  const totalPaginas = Math.ceil(totalProveedores / FILAS_POR_PAGINA) || 1;

  const abrirRegistrar = () => {
    setEditar(null);
    setForm(FORM_VACIO);
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_proveedor);
    setForm({
      tipo_persona: p.tipo_doc === "NIT" ? "Juridica" : "Natural",
      tipo_doc: p.tipo_doc || "NIT",
      numero_doc: p.numero_doc || "",
      razon_social: p.razon_social || "",
      nombre_comercial: p.nombre_comercial || "",
      ...dividirNombreContacto(p.nombre_contacto),
      cargo_contacto: p.cargo_contacto || "",
      telefono_celular: p.telefono_celular || "",
      email_contacto: p.email_contacto || "",
      ciudad: p.ciudad || "",
      departamento: p.departamento || "",
      pais: p.pais || "Colombia",
      direccion: p.direccion || "",
      estado: p.estado || "Activo",
    });
    setErrores({});
    setModal(true);
  };

  const validar = () => {
    const e = {};
    if (!form.tipo_doc) e.tipo_doc = "Selecciona un tipo de documento";
    if (!form.numero_doc.trim()) e.numero_doc = "El número de documento es obligatorio";
    else {
      const errorLongitud = validarNumeroDocumento(form.tipo_doc, form.numero_doc);
      if (errorLongitud) e.numero_doc = errorLongitud;
    }
    if (form.tipo_persona === "Juridica" && !form.razon_social.trim()) e.razon_social = "La razón social es obligatoria";
    const errorNombresContacto = validarCampoNombresContacto(form.nombres_contacto);
    if (errorNombresContacto) e.nombres_contacto = errorNombresContacto;
    const errorApellidosContacto = validarCampoApellidosContacto(form.apellidos_contacto);
    if (errorApellidosContacto) e.apellidos_contacto = errorApellidosContacto;
    if (!form.ciudad.trim()) e.ciudad = "La ciudad es obligatoria";
    const errorTelefono = validarTelefono(form.telefono_celular);
    if (errorTelefono) e.telefono_celular = errorTelefono;
    if (!form.direccion.trim()) e.direccion = "La dirección es obligatoria";
    const errorEmailContacto = validarCampoEmail(form.email_contacto);
    if (errorEmailContacto) e.email_contacto = errorEmailContacto;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const pedirConfirmacion = () => {
    if (!validar()) return;
    if (editar) { setConfirmarGuardar(true); return; }
    guardar();
  };

  const guardar = async () => {
    setConfirmarGuardar(false);
    setGuardando(true);
    try {
      const { nombres_contacto, apellidos_contacto, tipo_persona, ...resto } = form;
      const nombreCompletoContacto = `${nombres_contacto} ${apellidos_contacto}`.trim();
      const payload = {
        ...resto,
        nombre_contacto: nombreCompletoContacto,
        // Persona Natural: el proveedor es la propia persona, no hay razón social separada.
        razon_social: tipo_persona === "Natural" ? nombreCompletoContacto : resto.razon_social,
      };
      if (editar) await api.put(`/proveedores/${editar}`, payload);
      else        await api.post("/proveedores", payload);
      cargarProveedores();
      setModal(false);
      showToast("exito", editar ? "Proveedor actualizado correctamente." : "Proveedor registrado correctamente.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Error al guardar el proveedor");
    } finally {
      setGuardando(false);
    }
  };

  // El aviso de éxito/error ya lo muestra <StatusToggle> centralmente a partir de
  // lo que esta función resuelva o rechace — por eso NO se atrapa el error acá
  // (antes se atrapaba y no se re-lanzaba, así que StatusToggle nunca se enteraba
  // del fallo y mostraba igual un toast de éxito encima del de error).
  const toggleEstado = async (id) => {
    const res = await api.patch(`/proveedores/${id}/estado`);
    setDatos((prev) => prev.map((p) => (p.id_proveedor === id ? { ...p, estado: res.data.estado } : p)));
  };

  if (cargando) {
    return <Loader text="Cargando proveedores..." />;
  }

  return (
    <div className="proveedores-container">
      {error && <div className="compras-error-banner">{error}</div>}

      <div className="proveedores-actions-bar">
        <div className="proveedores-actions-left">
          <div className="proveedores-search-wrapper">
            <span className="proveedores-search-icon"><IconSearch /></span>
            <input
              type="text"
              className="proveedores-search-input"
              placeholder="Buscar proveedor o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="proveedores-search-clear" onClick={() => setBusqueda("")}>
                <IconX />
              </button>
            )}
          </div>
        </div>
        <div className="proveedores-actions-right">
          {tienePerm('Proveedores.crear') && (
            <button className="proveedores-btn-primary" onClick={abrirRegistrar}>
              <span>+</span> Nuevo proveedor
            </button>
          )}
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/proveedores", { params: { q: busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Documento", value: (p) => `${p.tipo_doc} ${p.numero_doc}` },
              { header: "Empresa", value: (p) => p.nombre_comercial || p.razon_social },
              { header: "Contacto", key: "nombre_contacto" },
              { header: "Teléfono", key: "telefono_celular" },
              { header: "Email", key: "email_contacto" },
              { header: "Ciudad", key: "ciudad" },
              { header: "Compras", key: "total_compras" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="proveedores"
            titulo="Proveedores"
          />
        </div>
      </div>

      <div className="proveedores-results-count">
        {totalProveedores} proveedor{totalProveedores !== 1 ? 'es' : ''} encontrado{totalProveedores !== 1 ? 's' : ''}
      </div>

      <ProveedoresTable
        datos={datos} tienePerm={tienePerm} toggleEstado={toggleEstado}
        setVerDetalle={setVerDetalle} abrirEditar={abrirEditar}
        totalPaginas={totalPaginas} pagina={pagina} setPagina={setPagina} totalProveedores={totalProveedores}
      />

      {/* ── Modal tipo factura, un solo panel con scroll reducido ── */}
      {modal && (
        <ProveedorFormModal
          editar={editar} form={form} setForm={setForm} errores={errores} setErrores={setErrores}
          guardando={guardando} setModal={setModal} pedirConfirmacion={pedirConfirmacion}
        />
      )}

      {confirmarGuardar && (
        <ConfirmModal
          title="¿Guardar los cambios del proveedor?"
          message="Se actualizará la información de este proveedor."
          onCancel={() => setConfirmarGuardar(false)}
          onConfirm={guardar}
          confirmLabel="Sí, guardar"
        />
      )}

      <ProveedorDetalleModal verDetalle={verDetalle} setVerDetalle={setVerDetalle} tienePerm={tienePerm} abrirEditar={abrirEditar} />
    </div>
  );
}
