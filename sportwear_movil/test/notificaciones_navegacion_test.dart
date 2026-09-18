import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sportwear_movil/core/api/api_client.dart';
import 'package:sportwear_movil/core/api/token_storage.dart';
import 'package:sportwear_movil/core/theme/app_theme_controller.dart';
import 'package:sportwear_movil/features/admin/services/admin_service.dart';
import 'package:sportwear_movil/features/auth/providers/auth_provider.dart';
import 'package:sportwear_movil/features/auth/services/auth_service.dart';
import 'package:sportwear_movil/features/admin/services/notificaciones_service.dart';
import 'package:sportwear_movil/features/catalogo/services/catalogo_service.dart';
import 'package:sportwear_movil/features/checkout/services/checkout_service.dart';
import 'package:sportwear_movil/features/pedidos/services/pedidos_service.dart';
import 'package:sportwear_movil/features/perfil/services/perfil_service.dart';
import 'package:sportwear_movil/main.dart';
import 'package:sportwear_movil/shared/models/categoria.dart';
import 'package:sportwear_movil/shared/models/compra_resumen.dart';
import 'package:sportwear_movil/shared/models/dashboard_resumen.dart';
import 'package:sportwear_movil/shared/models/imagen_hero.dart';
import 'package:sportwear_movil/shared/models/item_pedido_admin.dart';
import 'package:sportwear_movil/shared/models/pedido_admin.dart';
import 'package:sportwear_movil/shared/models/producto.dart';
import 'package:sportwear_movil/shared/models/producto_bajo_stock.dart';
import 'package:sportwear_movil/shared/models/usuario.dart';
import 'package:sportwear_movil/shared/models/venta_resumen.dart';

class _FakeTokenStorage extends TokenStorage {
  @override
  Future<String?> readToken() async => null;
  @override
  Future<void> saveToken(String token) async {}
  @override
  Future<void> deleteToken() async {}
}

class _FakeCatalogoService extends CatalogoService {
  _FakeCatalogoService(super.apiClient);
  @override
  Future<List<Categoria>> getCategorias() async => [];
  @override
  Future<List<Producto>> getProductos() async => [];
  @override
  Future<List<ImagenHero>> getImagenesHero() async => [];
}

/// Devuelve datos fijos en las 4 categorías (mezcladas, como en un panel
/// real) sin red real ni demora, para poder tocar cada notificación de
/// forma determinística.
class _FakeAdminServiceConNotificaciones extends AdminService {
  _FakeAdminServiceConNotificaciones(super.apiClient);

  static final pedido = PedidoAdmin(
    idPedido: 1,
    idVenta: 1,
    estadoPedido: 'Pendiente',
    fechaActualizacion: DateTime.now(),
    total: 50000,
    fechaVenta: DateTime.now(),
    direccionEntrega: 'Calle falsa 123',
    estadoVenta: 'Activo',
    metodoPago: 'Efectivo',
    cliente: 'Cliente de prueba',
    items: [ItemPedidoAdmin(cantidad: 1, producto: 'Camiseta', talla: 'M')],
  );

  @override
  Future<List<PedidoAdmin>> getPedidosPendientes() async => [pedido];

  @override
  Future<List<ProductoBajoStock>> getProductosBajoStock() async => [
        ProductoBajoStock(idProducto: 5, nombre: 'Camiseta', talla: 'S', color: 'Rojo', stock: 1),
      ];

  @override
  Future<List<VentaResumen>> getVentasPendientes() async => [
        VentaResumen(idVenta: 7, cliente: 'Otro cliente', total: 30000, fecha: DateTime.now()),
      ];

  @override
  Future<List<CompraResumen>> getComprasPendientes() async => [
        CompraResumen(
          idCompra: 3,
          proveedor: 'Proveedor X',
          nombreComercial: 'Proveedor X SAS',
          total: 80000,
          fecha: DateTime.now(),
          estado: 'Pendiente',
        ),
      ];

  @override
  Future<DashboardResumen> getResumen() async => DashboardResumen(
        ventasHoy: 0,
        ingresosHoy: 0,
        pedidosPendientes: 1,
        ingresosTotales: 0,
        ventasTotales: 0,
        ticketPromedio: 0,
        bajoStock: 0,
        clientesActivos: 0,
      );
}

class _FakeAuthServiceAdmin extends AuthService {
  _FakeAuthServiceAdmin(super.apiClient);

  @override
  Future<AuthResult> login({required String email, required String contrasena}) async {
    return AuthResult(
      token: 'fake-token',
      usuario: Usuario(idUsuario: 9, nombre: 'Admin de prueba', email: email, rol: 'Admin'),
    );
  }
}

Future<void> _entrarAlPanelAdminYAbrirCampana(WidgetTester tester, AdminService adminService) async {
  final tokenStorage = _FakeTokenStorage();
  final apiClient = ApiClient(tokenStorage: tokenStorage);
  final authProvider = AuthProvider(
    authService: _FakeAuthServiceAdmin(apiClient),
    tokenStorage: tokenStorage,
  );
  await authProvider.login(email: 'admin@prueba.com', contrasena: 'x');

  await tester.pumpWidget(
    SportwearApp(
      authProvider: authProvider,
      catalogoService: _FakeCatalogoService(apiClient),
      checkoutService: CheckoutService(apiClient),
      pedidosService: PedidosService(apiClient),
      adminService: adminService,
      notificacionesService: NotificacionesService(adminService),
      perfilService: PerfilService(apiClient),
      themeController: AppThemeController(),
    ),
  );
  await tester.pumpAndSettle();

  // Entra al panel admin desde el botón real del catálogo (HomeScreen).
  await tester.tap(find.byIcon(Icons.admin_panel_settings_outlined));
  await tester.pumpAndSettle();
  expect(find.text('Panel admin'), findsOneWidget);

  // Abre la campana.
  await tester.tap(find.byIcon(Icons.notifications_outlined));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'Tocar una notificación de pedido pendiente navega al detalle del pedido',
    (tester) async {
      final adminService = _FakeAdminServiceConNotificaciones(ApiClient(tokenStorage: _FakeTokenStorage()));
      await _entrarAlPanelAdminYAbrirCampana(tester, adminService);

      expect(find.text('Pedido #1 por preparar'), findsOneWidget);

      // Toca la notificación de pedido, mezclada con las otras 3 categorías.
      await tester.tap(find.text('Pedido #1 por preparar'));
      await tester.pumpAndSettle();

      // Debe haber navegado al detalle real del pedido, no quedarse en /admin.
      expect(find.text('Pedido #1'), findsOneWidget);
      expect(find.text('Cliente de prueba'), findsOneWidget);
    },
  );

  testWidgets(
    'Tocar una notificación de stock/ventas/compras navega al Resumen del panel admin',
    (tester) async {
      final adminService = _FakeAdminServiceConNotificaciones(ApiClient(tokenStorage: _FakeTokenStorage()));
      await _entrarAlPanelAdminYAbrirCampana(tester, adminService);

      expect(find.text('Venta #7 pendiente de pago'), findsOneWidget);

      await tester.tap(find.text('Venta #7 pendiente de pago'));
      await tester.pumpAndSettle();

      // No hay pantalla propia de Ventas en el móvil: cae en el Resumen del
      // panel admin, no se queda mostrando el modal ni se rompe.
      expect(find.text('Panel admin'), findsOneWidget);
      expect(find.text('Resumen'), findsOneWidget);
    },
  );
}
