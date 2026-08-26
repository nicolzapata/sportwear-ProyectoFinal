import { useState, useEffect } from "react";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { FILAS_POR_PAGINA, normalizeM } from "../utils/usuariosHelpers";
import { useUsuariosState } from "./useUsuariosState";
import { useClientesAdminState } from "./useClientesAdminState";

/**
 * useUsuarios
 *
 * Orquestador liviano de la página Usuarios: posee lo que es realmente
 * transversal a las 2 pestañas (tab activo, búsqueda, modal compartido,
 * "qué id se está editando", loading de pantalla completa, datos de
 * referencia roles/barrios) y compone los hooks de dominio (usuarios
 * internos / clientes desde el admin), sin duplicar su estado.
 */
export function useUsuarios() {
  const { usuario } = useAuth();

  const modulosUsuario = Array.isArray(usuario?.modulos) ? usuario.modulos.map(normalizeM) : [];
  const esAdmin        = usuario?.rol === 'Admin';
  const tieneUsuarios  = esAdmin || modulosUsuario.includes('usuarios');
  const tieneClientes  = esAdmin || modulosUsuario.includes('clientes');
  const tienePerm      = (p) => (usuario?.permisos || []).includes(p);

  const [roles,   setRoles]   = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [busqueda,       setBusqueda]       = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [modal,          setModal]          = useState(false);
  const [guardandoModal, setGuardandoModal] = useState(false);
  const [editar,         setEditar]         = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [toast,          setToast]          = useState(null);
  const [filterType, setFilterType] = useState(() => tieneUsuarios ? 'usuarios' : 'clientes');

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
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

  const usuariosState = useUsuariosState({
    usuarioActual: usuario, tieneUsuarios, roles, busquedaDebounced,
    setModal, setGuardandoModal, setLoading, showToast, editar, setEditar,
  });
  const clientesState = useClientesAdminState({
    tieneClientes, filterType, busquedaDebounced,
    setModal, setGuardandoModal, setLoading, showToast, editar, setEditar,
  });

  useEffect(() => { usuariosState.setPaginaUsuarios(1); clientesState.setPaginaClientes(1); }, [busquedaDebounced]);

  const getRoleName = (id_rol) =>
    roles.find(r => Number(r.id_rol) === Number(id_rol))?.nombre || id_rol;

  const pagina       = filterType === "usuarios" ? usuariosState.paginaUsuarios : clientesState.paginaClientes;
  const setPagina     = filterType === "usuarios" ? usuariosState.setPaginaUsuarios : clientesState.setPaginaClientes;
  const totalRegistros = filterType === "usuarios" ? usuariosState.totalUsuarios : clientesState.totalClientesTab;
  const totalPaginas = Math.ceil(totalRegistros / FILAS_POR_PAGINA) || 1;
  const filtradosPagina = filterType === "usuarios" ? usuariosState.usuarios : clientesState.clientes;

  return {
    usuario, tieneUsuarios, tieneClientes, tienePerm,
    roles, barrios, busqueda, setBusqueda, busquedaDebounced,
    modal, setModal, guardandoModal, editar, loading, toast,
    filterType, setFilterType,
    getRoleName, pagina, setPagina, totalRegistros, totalPaginas, filtradosPagina,
    ...usuariosState,
    ...clientesState,
  };
}
