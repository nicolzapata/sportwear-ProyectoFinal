import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/api/token_storage.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/app_theme_controller.dart';
import 'features/admin/services/admin_service.dart';
import 'features/admin/services/notificaciones_service.dart';
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
  final notificacionesService = NotificacionesService(adminService);
  final perfilService = PerfilService(apiClient);
  final themeController = AppThemeController();

  // El backend responde 401 -> se borra el token y AuthProvider fuerza el
  // regreso a /login (vía el redirect de go_router en app_router.dart).
  apiClient.onUnauthorized = () => authProvider.logout();

  runApp(SportwearApp(
    authProvider: authProvider,
    catalogoService: catalogoService,
    checkoutService: checkoutService,
    pedidosService: pedidosService,
    adminService: adminService,
    notificacionesService: notificacionesService,
    perfilService: perfilService,
    themeController: themeController,
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
    required this.notificacionesService,
    required this.perfilService,
    required this.themeController,
  });

  final AuthProvider authProvider;
  final CatalogoService catalogoService;
  final CheckoutService checkoutService;
  final PedidosService pedidosService;
  final AdminService adminService;
  final NotificacionesService notificacionesService;
  final PerfilService perfilService;
  final AppThemeController themeController;

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
        Provider.value(value: widget.notificacionesService),
        Provider.value(value: widget.perfilService),
        ChangeNotifierProvider.value(value: _carritoProvider),
        ChangeNotifierProvider.value(value: widget.themeController),
      ],
      // Consumer (no context.watch directo acá): este widget es quien
      // provee AppThemeController arriba, así que su propio `context`
      // todavía no lo ve — Consumer sí, porque construye su `child` un
      // nivel más abajo, ya dentro del MultiProvider.
      child: Consumer<AppThemeController>(
        builder: (context, themeController, _) {
          return MaterialApp.router(
            title: 'SportWear',
            theme: AppTheme.light,
            darkTheme: AppTheme.dark,
            themeMode: themeController.themeMode,
            // AppColors.xxx es estático (lo usan ~15 pantallas ya
            // construidas sin BuildContext) — este builder corre en cada
            // rebuild de tema con el Brightness YA resuelto por Flutter
            // (según themeMode de arriba), así que queda sincronizado antes
            // de que esas pantallas vuelvan a construirse en el mismo frame.
            //
            // Eso solo alcanza para la PRIMERA vez que cada pantalla
            // construye: como esas pantallas leen AppColors.xxx directo (sin
            // Theme.of(context)), Flutter no tiene ninguna dependencia
            // registrada que las marque "sucias" cuando cambia el tema en
            // caliente — sin esto, al tocar el interruptor claro/oscuro, la
            // pantalla actual se queda pintada con los colores viejos hasta
            // que algo más la reconstruya. KeyedSubtree con key=brightness
            // fuerza a Flutter a desmontar y remontar todo lo ya construido
            // por el router cuando cambia el brillo, así cada pantalla vuelve
            // a construir y lee el AppColors ya actualizado — el costo es
            // perder estado transitorio (scroll, texto sin guardar) de la
            // pantalla actual al alternar el tema, aceptable para esto.
            builder: (context, child) {
              final brightness = Theme.of(context).brightness;
              AppColors.actualizar(brightness);
              return KeyedSubtree(key: ValueKey(brightness), child: child!);
            },
            routerConfig: _router,
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}
