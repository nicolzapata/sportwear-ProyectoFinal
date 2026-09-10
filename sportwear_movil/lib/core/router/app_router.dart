import 'package:go_router/go_router.dart';

import '../../features/admin/screens/admin_home_screen.dart';
import '../../features/admin/screens/pedido_admin_detalle_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/registro_screen.dart';
import '../../features/carrito/screens/carrito_screen.dart';
import '../../features/catalogo/screens/home_screen.dart';
import '../../features/catalogo/screens/producto_detalle_screen.dart';
import '../../features/checkout/screens/checkout_screen.dart';
import '../../features/pedidos/screens/mis_pedidos_screen.dart';
import '../../features/pedidos/screens/pedido_detalle_screen.dart';
import '../../features/perfil/screens/mi_perfil_screen.dart';
import '../../shared/models/pedido.dart';
import '../../shared/models/pedido_admin.dart';

/// El catálogo (/home, /producto/:id) es público: se puede navegar sin
/// sesión, como invitado. /login y /registro son destinos voluntarios, no
/// pantallas de entrada obligatorias.
///
/// Si ya hay sesión y alguien llega a /login o /registro (por ejemplo tras
/// loguearse con éxito), se le saca de ahí — a la ruta pendiente en el query
/// param `redirect` si vino una (ver requireLogin()), o a /home si no.
GoRouter buildAppRouter(AuthProvider authProvider) {
  return GoRouter(
    initialLocation: '/home',
    refreshListenable: authProvider,
    redirect: (context, state) {
      final location = state.matchedLocation;
      final isAuthRoute = location == '/login' || location == '/registro';

      if (authProvider.isAuthenticated && isAuthRoute) {
        final redirectTo = state.uri.queryParameters['redirect'];
        return (redirectTo != null && redirectTo.isNotEmpty) ? redirectTo : '/home';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/registro', builder: (context, state) => const RegistroScreen()),
      GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
      GoRoute(
        path: '/producto/:id',
        builder: (context, state) {
          final id = int.parse(state.pathParameters['id']!);
          return ProductoDetalleScreen(idProducto: id);
        },
      ),
      GoRoute(path: '/carrito', builder: (context, state) => const CarritoScreen()),
      GoRoute(path: '/checkout', builder: (context, state) => const CheckoutScreen()),
      GoRoute(path: '/mis-pedidos', builder: (context, state) => const MisPedidosScreen()),
      GoRoute(path: '/mi-perfil', builder: (context, state) => const MiPerfilScreen()),
      GoRoute(
        path: '/mis-pedidos/detalle',
        builder: (context, state) => PedidoDetalleScreen(pedido: state.extra as Pedido),
      ),
      GoRoute(path: '/admin', builder: (context, state) => const AdminHomeScreen()),
      GoRoute(
        path: '/admin/pedido-detalle',
        builder: (context, state) => PedidoAdminDetalleScreen(pedido: state.extra as PedidoAdmin),
      ),
    ],
  );
}
