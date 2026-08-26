// src/pages/clientes/MiCuenta.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import PaymentModal from "../../ventas/components/PaymentModal";
import OrderDetailModal from "../../ventas/components/OrderDetailModal";
import Loader from "../../../shared/components/Loader";
import { validarTelefono, validarNombre } from "../../../shared/utils/numerico";
// MiCuenta.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import "./MiCuenta.cards.css";
import "./MiCuenta.modals.css";
import PerfilCard from "../components/mi-cuenta/PerfilCard";
import EstadoCuentaCard from "../components/mi-cuenta/EstadoCuentaCard";
import PedidosSection from "../components/mi-cuenta/PedidosSection";
import TodosPedidosModal from "../components/mi-cuenta/TodosPedidosModal";
import EditarPerfilModal from "../components/mi-cuenta/EditarPerfilModal";
import { dividirNombre, errorEmailPerfil } from "../utils/miCuentaHelpers";

export default function MiCuenta() {
  const { usuario, actualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const [pedidos, setPedidos]               = useState([]);
  const [perfil, setPerfil]                 = useState(null);
  const [showModalPerfil, setShowModalPerfil] = useState(false);
  // ── NUEVO: ventana con la lista completa de pedidos ──
  const [modalTodosPedidos, setModalTodosPedidos] = useState(false);
  const [form, setForm]                     = useState({});
  const [errores, setErrores]               = useState({ nombres: "", apellidos: "", documento: "", email: "" });
  const [guardando, setGuardando]           = useState(false);
  const [cargando, setCargando]             = useState(true);
  const [barrios, setBarrios]               = useState([]);
  const [zonas, setZonas]                   = useState([]);
  const [barFiltrados, setBarFiltrados]     = useState([]);
  const [detallesPedidos, setDetallesPedidos] = useState({});
  const [pagoModal, setPagoModal]           = useState(null);
  const [detalleModal, setDetalleModal]     = useState(null);

  useEffect(() => {
    if (!usuario) { navigate("/"); return; }
    setCargando(true);
    Promise.all([
      api.get("/ventas/mis-pedidos").catch(() => ({ data: [] })),
      api.get("/clientes/mi-perfil").catch(() => ({ data: null })),
      api.get("/barrios").catch(() => ({ data: [] })),
      api.get("/barrios/zonas").catch(() => ({ data: [] })),
      // ── NUEVO: se trae la lista de productos solo para armar el mapa de
      // fotos (id_producto -> imagen_principal) — este endpoint ya se sabe
      // que funciona bien en el resto del sitio, así que no hace falta tocar
      // el backend ni adivinar de dónde sale la imagen. ──
      api.get("/productos").catch(() => ({ data: [] })),
    ]).then(([pedidosRes, perfilRes, barriosRes, zonasRes, productosRes]) => {
      const imagenPorProducto = {};
      (productosRes.data || []).forEach((p) => {
        if (p.imagen_principal) imagenPorProducto[p.id_producto] = p.imagen_principal;
      });

      // ── CORREGIDO: el pedido viene ordenado del más reciente al más
      // antiguo (para mostrar arriba lo último) — pero el NÚMERO de pedido
      // debe contar en el orden real en que se hicieron (el primero que
      // hiciste es el #1), no el orden invertido, y tampoco el ID interno
      // de venta (V-089), que revela cuántas ventas lleva la tienda en
      // total, no solo las tuyas. ──
      const filtrados = (pedidosRes.data || []).filter(
        // ── CORREGIDO: el filtro buscaba "Cancelado", pero el valor real que
        // usa Ventas.estado en todo el resto del sistema es "Anulado" — dos
        // palabras distintas para lo mismo, así que una venta anulada nunca
        // pasaba este filtro y se escondía por completo en vez de mostrarse
        // marcada como anulada. ──
        (p) => ["Confirmado", "Pagado", "Cancelado", "Anulado", "Abonado"].includes(p.estado)
      );
      const total = filtrados.length;
      const conNumeroYFotos = filtrados.map((p, i) => ({
        ...p,
        numeroPedido: total - i,
        items: (p.items || []).map((item) => ({
          ...item,
          producto_imagen: imagenPorProducto[item.id_producto] || null,
        })),
      }));
      setPedidos(conNumeroYFotos);
      if (perfilRes.data) {
        setPerfil(perfilRes.data);
        const { nombres, apellidos } = dividirNombre(perfilRes.data.nombre);
        setForm({
          nombres, apellidos,
          tipo_doc:      perfilRes.data.tipo_doc      || "CC",
          documento:     perfilRes.data.documento     || "",
          telefono:      perfilRes.data.telefono      || "",
          email:         perfilRes.data.email         || "",
          id_barrio:     perfilRes.data.id_barrio     || "",
          direccion:     perfilRes.data.direccion     || "",
          ciudad:        perfilRes.data.ciudad        || "Medellín",
        });
      }
      setBarrios(barriosRes.data);
      setBarFiltrados(barriosRes.data);
      setZonas(zonasRes.data);
      setCargando(false);
    });
  }, [usuario, navigate]);

  const handleZona = (zona) => {
    setBarFiltrados(zona ? barrios.filter((b) => b.zona === zona) : barrios);
    setForm((f) => ({ ...f, id_barrio: "" }));
  };

  // Para descartar la respuesta de /check-email si el usuario ya cambió
  // el campo mientras la verificación estaba en vuelo.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);

  // Verificación en tiempo real (onBlur): si el correo ya existe, avisa de una vez.
  // Se excluye el propio correo actual del perfil para no marcarlo como "duplicado".
  const verificarEmailDuplicado = async (email) => {
    if (perfil?.email && email.toLowerCase() === perfil.email.toLowerCase()) return;
    try {
      const { data } = await api.get("/auth/check-email", { params: { email } });
      if (data?.existe && formRef.current.email.trim() === email) {
        setErrores(prev => ({ ...prev, email: "Este correo ya está registrado." }));
      }
    } catch {
      // Si falla la verificación en tiempo real, no bloqueamos al usuario.
    }
  };

  const validarFormularioPerfil = () => {
    const e = {};
    const eNombres = validarNombre(form.nombres);
    if (eNombres) e.nombres = eNombres;
    const eApellidos = validarNombre(form.apellidos, "El apellido es obligatorio");
    if (eApellidos) e.apellidos = eApellidos;
    if (!form.documento.trim()) e.documento = "El documento es obligatorio";
    const eTelefono = validarTelefono(form.telefono);
    if (eTelefono) e.telefono = eTelefono;
    const eEmail = errorEmailPerfil(form.email);
    if (eEmail) e.email = eEmail;
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardarCambios = async () => {
    if (!validarFormularioPerfil()) return;
    setGuardando(true);
    const { nombres, apellidos, ...resto } = form;
    const payload = { ...resto, nombre: `${nombres} ${apellidos}`.trim() };
    try {
      const { data } = await api.put("/clientes/mi-perfil", payload);
      setPerfil(data);
      actualizarUsuario({ nombre: data.nombre });
      setShowModalPerfil(false);
      showToast("exito", "Perfil actualizado correctamente.");
    } catch (err) {
      const mensaje = err.response?.data?.message;
      const campo = /correo|email/i.test(mensaje || "") ? "email" : /documento/i.test(mensaje || "") ? "documento" : null;
      if (err.response?.status === 409 && campo) {
        setErrores(prev => ({ ...prev, [campo]: mensaje }));
      } else {
        showToast("error", "Error al guardar: " + (mensaje || "Error"));
      }
    } finally {
      setGuardando(false);
    }
  };

  const handlePagoConfirmado = ({ id_venta, cuotaId, estaCompleto, nuevoTotalPagado }) => {
    const actualizarPedido = (p) => {
      if (p.id_venta !== id_venta) return p;
      const abonosActualizados = p.abonos?.map((a) => {
        if (cuotaId) return a.id_pago === cuotaId ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
        return a.estado === "Pendiente" ? { ...a, estado: "Confirmado", fecha_pago: new Date().toISOString() } : a;
      });
      return { ...p, total_pagado: nuevoTotalPagado, estado: estaCompleto ? "Pagado" : "Abonado", abonos: abonosActualizados };
    };
    setPedidos((prev) => prev.map(actualizarPedido));
    setDetalleModal((prev) => prev ? actualizarPedido(prev) : null);
    showToast("exito", estaCompleto ? "¡Pedido pagado completamente!" : "Abono registrado con éxito.");
  };

  const cargarDetallePedido = async (pedido) => {
    try {
      const { data } = await api.get(`/ventas/${pedido.id_venta}`);
      setDetallesPedidos((prev) => ({ ...prev, [pedido.id_venta]: data }));
      setDetalleModal(pedido);
    } catch {
      setDetalleModal(pedido);
    }
  };

  const getBarrioNombre = (id) => {
    const b = barrios.find((b) => b.id_barrio === id);
    return b ? b.nombre : null;
  };

  const totalCompras  = pedidos.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalPagado   = pedidos.reduce((s, p) => s + Number(p.total_pagado || 0), 0);
  const totalPendiente = totalCompras - totalPagado;
  const countPagados  = pedidos.filter((p) => ["Pagado", "Confirmado", "Abonado"].includes(p.estado)).length;

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (cargando) return <Loader text="Cargando tu cuenta..." />;

  return (
    <div className="mi-cuenta">

      <div className="mi-cuenta-header">
        <div>
          <h1 className="mi-cuenta-title">
            ¡Hola, {usuario?.nombre?.split(" ")[0] || "cliente"}!
          </h1>
        </div>
        <span className="mi-cuenta-date">{today}</span>
      </div>

      <PerfilCard perfil={perfil} usuario={usuario} getBarrioNombre={getBarrioNombre} onEditar={() => setShowModalPerfil(true)} />

      <EstadoCuentaCard pedidos={pedidos} totalCompras={totalCompras} totalPagado={totalPagado} totalPendiente={totalPendiente} />

      <PedidosSection
        pedidos={pedidos} setPagoModal={setPagoModal} cargarDetallePedido={cargarDetallePedido}
        onVerTodos={() => setModalTodosPedidos(true)}
      />

      {modalTodosPedidos && (
        <TodosPedidosModal
          pedidos={pedidos} onClose={() => setModalTodosPedidos(false)}
          setPagoModal={setPagoModal} cargarDetallePedido={cargarDetallePedido}
        />
      )}

      {showModalPerfil && (
        <EditarPerfilModal
          form={form} setForm={setForm} errores={errores} setErrores={setErrores}
          guardando={guardando} onClose={() => setShowModalPerfil(false)} onGuardar={guardarCambios}
          zonas={zonas} barFiltrados={barFiltrados} handleZona={handleZona}
          verificarEmailDuplicado={verificarEmailDuplicado}
        />
      )}

      {pagoModal && (
        <PaymentModal
          pedido={pagoModal}
          cliente={perfil}
          onClose={() => setPagoModal(null)}
          onPagoConfirmado={handlePagoConfirmado}
        />
      )}

      {detalleModal && (
        <OrderDetailModal
          pedido={detallesPedidos[detalleModal.id_venta] || detalleModal}
          onClose={() => {
            setDetalleModal(null);
            setDetallesPedidos((prev) => {
              const newObj = { ...prev };
              delete newObj[detalleModal.id_venta];
              return newObj;
            });
          }}
        />
      )}
    </div>
  );
}
