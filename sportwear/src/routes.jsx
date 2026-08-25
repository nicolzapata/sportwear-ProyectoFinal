// src/router/AppRouter.jsx
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider }  from "../context/AuthContext";
import { CartProvider }  from "../context/CartContext";
import { ToastProvider }   from "../context/ToastContext";
import { ConfirmProvider } from "../context/ConfirmContext";
import Layout            from "../components/Layout";
import PublicLayout      from "../components/PublicLayout";
import ProtectedRoute    from "../components/ProtectedRoute";
import { useAuth }       from "../context/AuthContext";
import RestablecerContrasena from "../pages/accesos/RestablecerContrasena";

import Login               from "../pages/accesos/Login";
import Registro            from "../pages/accesos/Registro";
import RecuperarContrasena from "../pages/accesos/RecuperarContrasena";
import Catalogo            from "../pages/catalogo/Catalogo";
import DetalleProducto     from "../pages/catalogo/DetalleProducto";
import Carrito             from "../pages/carrito/Carrito";
import Checkout            from "../pages/checkout/Checkout";
import SobreNosotros       from "../pages/sobre-nosotros/SobreNosotros";
import MiCuenta            from "../pages/clientes/MiCuenta";

import Dashboard     from "../pages/dashboard/Dashboard";
import Roles         from "../pages/roles/Roles";
import Usuarios      from "../pages/usuarios/Usuarios";
import GestProductos from "../pages/gestProductos/GestProductos";
import CatalogoAdmin from "../pages/catalogoAdmin/CatalogoAdmin";
import Proveedores   from "../pages/proveedores/Proveedores";
import Compras       from "../pages/compras/Compras";
import Pedidos       from "../pages/pedidos/Pedidos";
import PedidosVentas from "../pages/pedidosVentas/PedidosVentas";
import PagosAbonos   from "../pages/pagosAbonos/PagosAbonos";
import NotFound      from "../pages/NotFound/NotFound";

const MODULOS_CLIENTE = ['dashboard', 'catalogo', 'categorias'];

const normalizeModulo = (value) =>
  value?.toString?.().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const tieneModulosAdmin = (modulos = []) => {
  const normalizados = modulos.map(normalizeModulo).filter(Boolean);
  return normalizados.some(m => !MODULOS_CLIENTE.includes(m));
};

// Wrapper que decide en qué layout renderizar /mi-cuenta
function MiCuentaRoute() {
  const { usuario } = useAuth();
  if (usuario?.rol === 'Cliente' && tieneModulosAdmin(usuario?.modulos || [])) {
    return <Layout />;
  }
  return <PublicLayout />;
}

const P = ({ k, children }) => (
  <ProtectedRoute requiredKey={k}>{children}</ProtectedRoute>
);

export default function AppRouter() {
  return (
    <ToastProvider>
    <ConfirmProvider>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>

            {/* Sin navbar */}
            <Route path="/login"     element={<Login />} />
            <Route path="/registro"  element={<Registro />} />
            <Route path="/recuperar" element={<RecuperarContrasena />} />
            <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />

            {/* Públicas CON navbar del cliente */}
            <Route element={<PublicLayout />}>
              <Route path="/"                element={<Catalogo />} />
              <Route path="/catalogo"        element={<Catalogo />} />
              <Route path="/catalogo/:id"    element={<DetalleProducto />} />
              <Route path="/carrito"         element={<Carrito />} />
              <Route path="/checkout"        element={<Checkout />} />
              <Route path="/sobre-nosotros"  element={<SobreNosotros />} />
            </Route>

            {/* /mi-cuenta — layout condicional según módulos del usuario */}
            <Route element={<MiCuentaRoute />}>
              <Route path="/mi-cuenta" element={<MiCuenta />} />
            </Route>

            {/* Protegidas — admin/empleados */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard"       element={<P k="dashboard">      <Dashboard />     </P>} />
              <Route path="/roles"           element={<P k="roles">          <Roles />         </P>} />
              <Route path="/usuarios"        element={<P k="usuarios">       <Usuarios />      </P>} />
              <Route path="/productos"       element={<P k="productos">      <GestProductos /> </P>} />
              <Route path="/catalogo-admin"  element={<P k="catalogo-admin"> <CatalogoAdmin /> </P>} />
              <Route path="/proveedores"     element={<P k="proveedores">    <Proveedores />   </P>} />
              <Route path="/compras"         element={<P k="compras">        <Compras />       </P>} />
              <Route path="/pedidos"         element={<P k="pedidos">        <Pedidos />       </P>} />
              <Route path="/ventas"          element={<P k="ventas">         <PedidosVentas /> </P>} />
              <Route path="/pagos"           element={<P k="pagos">          <PagosAbonos />   </P>} />
            </Route>

            <Route path="*" element={<NotFound />} />

          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </ConfirmProvider>
    </ToastProvider>
  );
}