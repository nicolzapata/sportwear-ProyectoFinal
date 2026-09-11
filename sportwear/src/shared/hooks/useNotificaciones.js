// src/shared/hooks/useNotificaciones.js
// Deriva notificaciones "en vivo" a partir de datos que ya expone el backend
// (no existe una tabla/endpoint de notificaciones): stock bajo y ventas
// pendientes desde /dashboard, pedidos por preparar desde /pedidos, y
// compras pendientes desde /compras. Cada fuente solo se consulta si el
// usuario tiene acceso al módulo correspondiente (o es Admin).
import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const INTERVALO_REFRESCO_MS = 2 * 60 * 1000;
const CLAVE_VISTAS = (idUsuario) => `sz_notif_vistas_${idUsuario}`;

function leerVistas(idUsuario) {
  try {
    const guardado = localStorage.getItem(CLAVE_VISTAS(idUsuario));
    return guardado ? new Set(JSON.parse(guardado)) : new Set();
  } catch {
    return new Set();
  }
}

function guardarVistas(idUsuario, set) {
  try {
    localStorage.setItem(CLAVE_VISTAS(idUsuario), JSON.stringify([...set]));
  } catch {
    // localStorage no disponible — no es crítico, solo se pierde la marca de "vistas"
  }
}

const normalizar = (valor) =>
  valor?.toString?.().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

function tieneModulo(usuario, nombreModulo) {
  if (!usuario) return false;
  if (usuario.rol === "Admin") return true;
  const modulos = Array.isArray(usuario.modulos) ? usuario.modulos.map(normalizar) : [];
  return modulos.includes(normalizar(nombreModulo));
}

const formatoMoneda = (valor) =>
  Number(valor || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

async function cargarNotificacionesInventarioYVentas(usuario) {
  const { data } = await api.get("/dashboard");
  const stats = data?.stats || {};
  const resultado = [];

  if (tieneModulo(usuario, "Productos")) {
    const porProducto = new Map();
    (data?.productosBajoStock || []).forEach((variante) => {
      if (!porProducto.has(variante.id_producto)) {
        porProducto.set(variante.id_producto, { nombre: variante.nombre, variantes: [] });
      }
      porProducto.get(variante.id_producto).variantes.push(variante);
    });

    porProducto.forEach((producto, idProducto) => {
      const peor = producto.variantes.reduce(
        (min, v) => (Number(v.stock) < Number(min.stock) ? v : min),
        producto.variantes[0]
      );
      resultado.push({
        id: `stock-${idProducto}`,
        categoria: "inventario",
        titulo: `Stock bajo · ${producto.nombre}`,
        detalle: producto.variantes.length > 1
          ? `${producto.variantes.length} variantes con poco stock (mínimo ${peor.stock} en talla ${peor.talla || "-"})`
          : `Talla ${peor.talla || "-"} · ${peor.color || "-"} · quedan ${peor.stock}`,
        enlace: "/productos",
        urgente: Number(peor.stock) <= 2,
      });
    });
  }

  if (tieneModulo(usuario, "Ventas") && Number(stats.pedidos_pendientes) > 0) {
    resultado.push({
      id: "ventas-pendientes",
      categoria: "ventas",
      titulo: "Ventas pendientes de pago",
      detalle: `${stats.pedidos_pendientes} venta(s) esperando confirmación de pago`,
      enlace: "/ventas",
      urgente: false,
    });
  }

  return resultado;
}

async function cargarNotificacionesPedidos() {
  const { data } = await api.get("/pedidos", { params: { estado: "Pendiente" } });
  const pedidos = Array.isArray(data) ? data : (data?.data || []);
  return pedidos.slice(0, 5).map((pedido) => ({
    id: `pedido-${pedido.id_pedido}`,
    categoria: "pedidos",
    titulo: `Pedido #${pedido.id_pedido} por preparar`,
    detalle: `${pedido.cliente || "Cliente"} · ${formatoMoneda(pedido.total)}`,
    enlace: "/pedidos",
    urgente: true,
  }));
}

async function cargarNotificacionesCompras() {
  const { data } = await api.get("/compras");
  const compras = Array.isArray(data) ? data : (data?.data || []);
  return compras
    .filter((compra) => compra.estado === "Pendiente")
    .slice(0, 5)
    .map((compra) => ({
      id: `compra-${compra.id_compra}`,
      categoria: "compras",
      titulo: `Compra #${compra.id_compra} pendiente`,
      detalle: `${compra.proveedor || compra.nombre_comercial || "Proveedor"} · ${formatoMoneda(compra.total)}`,
      enlace: "/compras",
      urgente: false,
    }));
}

export default function useNotificaciones() {
  const { usuario } = useAuth();
  const idUsuario = usuario?.id_usuario || usuario?.id || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vistas, setVistas] = useState(() => leerVistas(idUsuario));
  const vistasRef = useRef(vistas);
  vistasRef.current = vistas;

  const cargar = useCallback(async () => {
    if (!usuario) {
      setItems([]);
      return;
    }
    setLoading(true);
    const tareas = [];

    if (tieneModulo(usuario, "Dashboard")) {
      tareas.push(cargarNotificacionesInventarioYVentas(usuario).catch(() => []));
    }
    if (tieneModulo(usuario, "Pedidos")) {
      tareas.push(cargarNotificacionesPedidos().catch(() => []));
    }
    if (tieneModulo(usuario, "Compras")) {
      tareas.push(cargarNotificacionesCompras().catch(() => []));
    }

    const resultados = await Promise.all(tareas);
    setItems(resultados.flat());
    setLoading(false);
  }, [usuario]);

  // Al cambiar de usuario (login/logout), recupera las notificaciones que
  // esa cuenta ya había marcado como vistas en una sesión anterior.
  useEffect(() => {
    setVistas(leerVistas(idUsuario));
  }, [idUsuario]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  // Marca como vistas todas las notificaciones actuales — se llama al abrir
  // el panel. El contador solo vuelve a aparecer cuando llega una notificación
  // con un id que todavía no se había marcado como vista.
  const marcarTodoVisto = useCallback(() => {
    setVistas((prev) => {
      const idsActuales = items.map((n) => n.id);
      const yaEstaban = idsActuales.every((id) => prev.has(id));
      if (yaEstaban && prev.size === idsActuales.length) return prev;
      const nuevo = new Set(idsActuales);
      if (idUsuario) guardarVistas(idUsuario, nuevo);
      return nuevo;
    });
  }, [items, idUsuario]);

  const noLeidas = items.filter((n) => !vistas.has(n.id)).length;

  return { items, loading, recargar: cargar, noLeidas, marcarTodoVisto };
}
