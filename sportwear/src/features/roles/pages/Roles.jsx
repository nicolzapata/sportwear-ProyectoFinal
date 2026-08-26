// src/pages/roles/Roles.jsx
import { useState, useEffect, useCallback } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import Loader from "../../../shared/components/Loader";
import Toast from "../../../shared/components/Toast";
// Roles.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import './Roles.cards.css';
import './Roles.modals.css';
import './Roles.toolbar.css';
import { IconX, IconSearch } from "../../../shared/components/Icons";
import RoleCard from "../components/roles/RoleCard";
import RolModal from "../components/roles/RolModal";
import ConfirmEstadoModal from "../components/roles/ConfirmEstadoModal";
import { validarNombreRol, mergeModulos, MODULOS_FALLBACK, esRolProtegido } from "../utils/rolesHelpers";

// ── Página principal ──────────────────────────────────────────────────────────
export default function Roles() {
  const { usuario } = useAuth();
  const tienePerm   = (p) => (usuario?.permisos || []).includes(p);

  const [datos,              setDatos]              = useState([]);
  const [busqueda,           setBusqueda]           = useState("");
  const [filtroEstado,       setFiltroEstado]       = useState("todos");
  const [loading,            setLoading]            = useState(true);
  const [modal,              setModal]              = useState(false);
  const [editar,             setEditar]             = useState(null);
  const [modulosDisponibles, setModulosDisponibles] = useState([]);
  const [permisosCatalogo,   setPermisosCatalogo]   = useState({});
  const [confirm,            setConfirm]            = useState(null);
  const [form,    setForm]    = useState({ nombre: "", estado: "Activo", permisos: [] });
  const [errores, setErrores] = useState({});
  const [toast,   setToast]   = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const filtrados = datos
    .filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .filter(r => filtroEstado === "todos" ? true : r.estado === (filtroEstado === "activos" ? "Activo" : "Inactivo"));

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get("/roles");
      setDatos(data);
    } catch (err) { console.error("Error cargando roles:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    cargar();
    api.get('/roles/modulos').then(({ data }) => setModulosDisponibles(mergeModulos(data))).catch(() => setModulosDisponibles(MODULOS_FALLBACK));
    api.get('/roles/permisos').then(({ data }) => setPermisosCatalogo(data || {})).catch(() => setPermisosCatalogo({}));
  }, [cargar]);

  const abrirRegistrar = () => {
    setEditar(null); setForm({ nombre: "", estado: "Activo", permisos: [] }); setErrores({}); setModal(true);
  };

  const abrirEditar = async (r) => {
    if (esRolProtegido(r.nombre)) return;
    setEditar(r.id_rol); setForm({ nombre: r.nombre, estado: r.estado, permisos: [] }); setErrores({}); setModal(true);
    try {
      const { data } = await api.get(`/roles/${r.id_rol}/permisos`);
      if (Array.isArray(data) && data.length > 0) {
        setForm(prev => ({ ...prev, permisos: data.map(p => p.id_permiso).filter(Boolean) }));
      }
    } catch (err) { console.error("Error cargando permisos:", err); }
  };

  const validar = () => {
    const e = {};
    const msgNombre = validarNombreRol(form.nombre);
    if (msgNombre) e.nombre = msgNombre;
    if (form.permisos.length === 0) e.permisos = "Selecciona al menos un permiso";
    setErrores(e);
    return e;
  };

  const guardar = async () => {
    const erroresValidacion = validar();
    if (Object.keys(erroresValidacion).length > 0) return;
    try {
      if (editar) await api.put(`/roles/${editar}`, form);
      else        await api.post("/roles", form);
      setModal(false); cargar();
      showToast('exito', editar ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
    } catch (err) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) setErrores(prev => ({ ...prev, ...backendErrors }));
      else setErrores(prev => ({ ...prev, _general: err.response?.data?.message || 'Ocurrió un error al guardar.' }));
      showToast('error', err.response?.data?.message || 'Ocurrió un error al guardar el rol.');
    }
  };

  const solicitarCambioEstado = async (rol) => {
    if (esRolProtegido(rol.nombre)) return;
    if (rol.estado === 'Inactivo') {
      try {
        await api.patch(`/roles/${rol.id_rol}/estado`);
        cargar();
        showToast('exito', `Rol "${rol.nombre}" activado correctamente.`);
      } catch (err) {
        console.error("Error activando rol:", err);
        showToast('error', err.response?.data?.message || 'Error al activar el rol.');
      }
      return;
    }
    setConfirm({ rol, usuariosCount: null });
    try {
      const { data } = await api.get(`/roles/${rol.id_rol}/usuarios-count`);
      setConfirm({ rol, usuariosCount: data.total });
    } catch { setConfirm({ rol, usuariosCount: 0 }); }
  };

  const confirmarCambioEstado = async () => {
    if (!confirm) return;
    try {
      await api.patch(`/roles/${confirm.rol.id_rol}/estado`);
      const nombreRol = confirm.rol.nombre;
      setConfirm(null);
      cargar();
      showToast('exito', `Rol "${nombreRol}" desactivado correctamente.`);
    } catch (err) {
      console.error("Error cambiando estado:", err);
      showToast('error', err.response?.data?.message || 'Error al cambiar el estado del rol.');
    }
  };

  if (loading) return <Loader text="Cargando roles..." />;

  return (
    <div className="roles-container">
      <div className="roles-actions-bar">
        <div className="roles-actions-left">
          <div className="roles-search-wrapper">
            <span className="roles-search-icon"><IconSearch /></span>
            <input type="text" className="roles-search-input" placeholder="Buscar rol..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            {busqueda && <button className="roles-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>

          <div className="roles-filter-toggle">
            <button className={`roles-filter-btn${filtroEstado === "todos" ? " active" : ""}`} onClick={() => setFiltroEstado("todos")}>Todos</button>
            <button className={`roles-filter-btn${filtroEstado === "activos" ? " active" : ""}`} onClick={() => setFiltroEstado("activos")}>Activos</button>
            <button className={`roles-filter-btn${filtroEstado === "inactivos" ? " active" : ""}`} onClick={() => setFiltroEstado("inactivos")}>Inactivos</button>
          </div>

          {(busqueda || filtroEstado !== "todos") && <span className="roles-search-count">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</span>}
        </div>

        {tienePerm('Roles.crear') && (
          <button className="roles-btn-nuevo" onClick={abrirRegistrar}><span>+</span> Nuevo rol</button>
        )}
      </div>

      <div className="roles-grid">
        {filtrados.map((r, i) => (
          <RoleCard
            key={r.id_rol} rol={r} index={i}
            onEditar={abrirEditar}
            onCambiarEstado={solicitarCambioEstado}
            puedeEditar={tienePerm('Roles.editar')}
            puedeEstado={tienePerm('Roles.estado')}
          />
        ))}
      </div>

      <ConfirmEstadoModal confirm={confirm} setConfirm={setConfirm} datos={datos} confirmarCambioEstado={confirmarCambioEstado} />

      {modal && (
        <RolModal
          titulo={editar ? "Editar rol" : "Nuevo rol"}
          form={form} setForm={setForm} errores={errores} setErrores={setErrores}
          modulosDisponibles={modulosDisponibles} permisosCatalogo={permisosCatalogo}
          onClose={() => setModal(false)} onGuardar={guardar}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}
