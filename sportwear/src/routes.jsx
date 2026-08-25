// src/router/AppRouter.jsx
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider }  from "./shared/contexts/AuthContext";
import { CartProvider }  from "./shared/contexts/CartContext";
import { ToastProvider }   from "./shared/contexts/ToastContext";
import { ConfirmProvider } from "./shared/contexts/ConfirmContext";
import Layout            from "./shared/components/Layout";
import PublicLayout      from "./shared/components/PublicLayout";
import ProtectedRoute    from "./shared/components/ProtectedRoute";
import { useAuth }       from "./shared/contexts/AuthContext";
import RestablecerContrasena from "./features/auth/pages/RestablecerContrasena";

import Login               from "./features/auth/pages/Login";
import Registro            from "./features/auth/pages/Registro";
import RecuperarContrasena from "./features/auth/pages/RecuperarContrasena";
import Catalogo            from "./features/catalogo/pages/Catalogo";
import DetalleProducto     from "./features/catalogo/pages/DetalleProducto";
import Carrito             from "./features/carrito/pages/Carrito";
import Checkout            from "./features/checkout/pages/Checkout";
import SobreNosotros       from "./shared/pages/SobreNosotros";
import MiCuenta            from "./features/clientes/pages/MiCuenta";

import Dashboard     from "./features/dashboard/pages/Dashboard";
import Roles         from "./features/roles/pages/Roles";
import Usuarios      from "./features/usuarios/pages/Usuarios";
import GestProductos from "./features/catalogo/pages/GestProductos";
import CatalogoAdmin from "./features/catalogo/pages/CatalogoAdmin";
import Proveedores   from "./features/proveedores/pages/Proveedores";
import Compras       from "./features/compras/pages/Compras";
import Pedidos       from "./features/ventas/pages/Pedidos";
import PedidosVentas from "./features/ventas/pages/PedidosVentas";
import PagosAbonos   from "./features/pagos/pages/PagosAbonos";
import NotFound      from "./shared/pages/NotFound";

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