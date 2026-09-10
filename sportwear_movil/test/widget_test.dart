import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sportwear_movil/core/api/api_client.dart';
import 'package:sportwear_movil/core/api/token_storage.dart';
import 'package:sportwear_movil/features/admin/services/admin_service.dart';
import 'package:sportwear_movil/features/auth/providers/auth_provider.dart';
import 'package:sportwear_movil/features/auth/services/auth_service.dart';
import 'package:sportwear_movil/features/catalogo/services/catalogo_service.dart';
import 'package:sportwear_movil/features/checkout/services/checkout_service.dart';
import 'package:sportwear_movil/features/pedidos/services/pedidos_service.dart';
import 'package:sportwear_movil/features/perfil/services/perfil_service.dart';
import 'package:sportwear_movil/main.dart';
import 'package:sportwear_movil/shared/models/categoria.dart';
import 'package:sportwear_movil/shared/models/producto.dart';
import 'package:sportwear_movil/shared/models/usuario.dart';

/// Evita tocar el canal de plataforma de flutter_secure_storage en el test.
class _FakeTokenStorage extends TokenStorage {
  @override
  Future<String?> readToken() async => null;

  @override
  Future<void> saveToken(String token) async {}

  @override
  Future<void> deleteToken() async {}
}

/// Evita una llamada de red real al backend en el test: el catálogo (Home)
/// ahora es público y carga apenas arranca la app.
class _FakeCatalogoService extends CatalogoService {
  _FakeCatalogoService(super.apiClient);

  @override
  Future<List<Categoria>> getCategorias() async => [];

  @override
  Future<List<Producto>> getProductos() async => [];
}

/// Simula un login exitoso sin red real, devolviendo el `rol` que pida cada
/// test — así se puede probar la visibilidad de "Mis pedidos"/"Mi perfil"/
/// panel admin para Cliente y Admin de forma determinística.
class _FakeAuthServiceConRol extends AuthService {
  _FakeAuthServiceConRol(super.apiClient, this.rol, this.idCliente);

  final String rol;
  final int? idCliente;

  @override
  Future<AuthResult> login({required String email, required String contrasena}) async {
    return AuthResult(
      token: 'fake-token',
      usuario: Usuario(
        idUsuario: 1,
        nombre: 'Prueba',
        email: email,
        rol: rol,
        idCliente: idCliente,
      ),
    );
  }
}

Future<AuthProvider> _loguearComo(String rol, {int? idCliente}) async {
  final tokenStorage = _FakeTokenStorage();
  final apiClient = ApiClient(tokenStorage: tokenStorage);
  final authProvider = AuthProvider(
    authService: _FakeAuthServiceConRol(apiClient, rol, idCliente),
    tokenStorage: tokenStorage,
  );
  await authProvider.login(email: 'prueba@example.com', contrasena: 'x');
  return authProvider;
}

void main() {
  testWidgets('Sin sesión guardada, la app entra directo al catálogo como invitada', (tester) async {
    final tokenStorage = _FakeTokenStorage();
    final apiClient = ApiClient(tokenStorage: tokenStorage);
    final authProvider = AuthProvider(
      authService: AuthService(apiClient),
      tokenStorage: tokenStorage,
    );
    final catalogoService = _FakeCatalogoService(apiClient);
    final checkoutService = CheckoutService(apiClient);
    final pedidosService = PedidosService(apiClient);
    final adminService = AdminService(apiClient);
    final perfilService = PerfilService(apiClient);

    await tester.pumpWidget(
      SportwearApp(
        authProvider: authProvider,
        catalogoService: catalogoService,
        checkoutService: checkoutService,
        pedidosService: pedidosService,
        adminService: adminService,
        perfilService: perfilService,
      ),
    );
    await tester.pumpAndSettle();

    // Aterriza en el catálogo (Home), no en el login.
    expect(find.text('SportWear'), findsOneWidget);
    expect(find.text('Ingresar'), findsNothing);
    // Sin sesión: el AppBar ofrece iniciar sesión, no cerrarla.
    expect(find.byIcon(Icons.login), findsOneWidget);
    expect(find.byIcon(Icons.logout), findsNothing);
    // Sin sesión: "Mis pedidos", "Mi perfil" y el panel admin no deben existir en el árbol.
    expect(find.byIcon(Icons.receipt_long_outlined), findsNothing);
    expect(find.byIcon(Icons.person_outline), findsNothing);
    expect(find.byIcon(Icons.admin_panel_settings_outlined), findsNothing);
  });

  testWidgets('Con sesión Cliente: se ven Mis pedidos y Mi perfil, no el panel admin', (tester) async {
    final authProvider = await _loguearComo('Cliente', idCliente: 57);
    final apiClient = ApiClient(tokenStorage: _FakeTokenStorage());

    await tester.pumpWidget(
      SportwearApp(
        authProvider: authProvider,
        catalogoService: _FakeCatalogoService(apiClient),
        checkoutService: CheckoutService(apiClient),
        pedidosService: PedidosService(apiClient),
        adminService: AdminService(apiClient),
        perfilService: PerfilService(apiClient),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.logout), findsOneWidget);
    expect(find.byIcon(Icons.receipt_long_outlined), findsOneWidget);
    expect(find.byIcon(Icons.person_outline), findsOneWidget);
    expect(find.byIcon(Icons.admin_panel_settings_outlined), findsNothing);
  });

  testWidgets('Con sesión Admin: se ve el panel admin, no Mis pedidos ni Mi perfil', (tester) async {
    // id_cliente null, igual que la cuenta Admin real confirmada en producción.
    final authProvider = await _loguearComo('Admin', idCliente: null);
    final apiClient = ApiClient(tokenStorage: _FakeTokenStorage());

    await tester.pumpWidget(
      SportwearApp(
        authProvider: authProvider,
        catalogoService: _FakeCatalogoService(apiClient),
        checkoutService: CheckoutService(apiClient),
        pedidosService: PedidosService(apiClient),
        adminService: AdminService(apiClient),
        perfilService: PerfilService(apiClient),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.logout), findsOneWidget);
    expect(find.byIcon(Icons.admin_panel_settings_outlined), findsOneWidget);
    expect(find.byIcon(Icons.receipt_long_outlined), findsNothing);
    expect(find.byIcon(Icons.person_outline), findsNothing);
  });
}
