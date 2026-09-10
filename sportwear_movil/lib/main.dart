import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/api/token_storage.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/admin/services/admin_service.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/auth/services/auth_service.dart';
import 'features/carrito/providers/carrito_provider.dart';
import 'features/catalogo/providers/catalogo_provider.dart';
import 'features/catalogo/services/catalogo_service.dart';
import 'features/checkout/services/checkout_service.dart';
import 'features/pedidos/services/pedidos_service.dart';
import 'features/perfil/services/perfil_service.dart';

void main() {
  // Requerido antes de tocar cualquier canal de plataforma (flutter_secure_storage
  // incluido): AuthProvider lee el token guardado en su constructor, antes de
  // runApp(), y en Android/iOS eso lanzaba "Binding has not yet been initialized"
  // porque runApp() es quien normalmente inicializa el binding.
  WidgetsFlutterBinding.ensureInitialized();

  final tokenStorage = TokenStorage();
  final apiClient = ApiClient(tokenStorage: tokenStorage);
  final authService = AuthService(apiClient);
  final authProvider = AuthProvider(authService: authService, tokenStorage: tokenStorage);
  final catalogoService = CatalogoService(apiClient);
  final checkoutService = CheckoutService(apiClient);
  final pedidosService = PedidosService(apiClient);
  final adminService = AdminService(apiClient);
  final perfilService = PerfilService(apiClient);

  // El backend responde 401 -> se borra el token y AuthProvider fuerza el
  // regreso a /login (vía el redirect de go_router en app_router.dart).
  apiClient.onUnauthorized = () => authProvider.logout();

  runApp(SportwearApp(
    authProvider: authProvider,
    catalogoService: catalogoService,
    checkoutService: checkoutService,
    pedidosService: pedidosService,
    adminService: adminService,
    perfilService: perfilService,
  ));
}

class SportwearApp extends StatefulWidget {
  const SportwearApp({
    super.key,
    required this.authProvider,
    required this.catalogoService,
    required this.checkoutService,
    required this.pedidosService,
    required this.adminService,
    required this.perfilService,
  });

  final AuthProvider authProvider;
  final CatalogoService catalogoService;
  final CheckoutService checkoutService;
  final PedidosService pedidosService;
  final AdminService adminService;
  final PerfilService perfilService;

  @override
  State<SportwearApp> createState() => _SportwearAppState();
}

class _SportwearAppState extends State<SportwearApp> {
  late final GoRouter _router = buildAppRouter(widget.authProvider);
  late final CatalogoProvider _catalogoProvider = CatalogoProvider(widget.catalogoService);
  late final CarritoProvider _carritoProvider = CarritoProvider();

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: widget.authProvider),
        Provider.value(value: widget.catalogoService),
        ChangeNotifierProvider.value(value: _catalogoProvider),
        Provider.value(value: widget.checkoutService),
        Provider.value(value: widget.pedidosService),
        Provider.value(value: widget.adminService),
        Provider.value(value: widget.perfilService),
        ChangeNotifierProvider.value(value: _carritoProvider),
      ],
      child: MaterialApp.router(
        title: 'SportWear',
        theme: AppTheme.light,
        routerConfig: _router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
