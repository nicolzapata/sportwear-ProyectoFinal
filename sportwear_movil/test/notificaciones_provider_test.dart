import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:sportwear_movil/features/admin/providers/notificaciones_provider.dart';
import 'package:sportwear_movil/features/admin/services/notificaciones_service.dart';
import 'package:sportwear_movil/features/admin/services/notificaciones_vistas_storage.dart';
import 'package:sportwear_movil/shared/models/notificacion.dart';

/// Reemplaza las 4 llamadas de red de NotificacionesService por una lista
/// fija, para probar la lógica de "vistas" sin depender del backend real.
class _FakeNotificacionesService implements NotificacionesService {
  _FakeNotificacionesService(this.items);

  final List<Notificacion> items;

  @override
  Future<List<Notificacion>> cargarTodas() async => items;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final notificaciones = [
    Notificacion(
      id: 'pedido-1',
      categoria: 'pedidos',
      titulo: 'Pedido #1 por preparar',
      detalle: 'Cliente de prueba · \$ 50.000',
      enlaceWeb: '/pedidos',
      urgente: true,
      fecha: DateTime.now(),
    ),
    Notificacion(
      id: 'venta-1',
      categoria: 'ventas',
      titulo: 'Venta #1 pendiente de pago',
      detalle: 'Cliente de prueba · \$ 30.000',
      enlaceWeb: '/ventas',
      urgente: false,
      fecha: DateTime.now(),
    ),
  ];

  setUp(() {
    // Simula localStorage vacío en cada test, igual que un dispositivo nuevo.
    SharedPreferences.setMockInitialValues({});
  });

  test('al cargar por primera vez, ninguna notificación está vista', () async {
    final provider = NotificacionesProvider(
      service: _FakeNotificacionesService(notificaciones),
      vistasStorage: NotificacionesVistasStorage(),
      idUsuario: 1,
    );
    await provider.listo;

    expect(provider.items.length, 2);
    expect(provider.noLeidas, 2);
  });

  test('marcarTodoVisto() baja el conteo a 0 (equivalente a abrir la campana)', () async {
    final provider = NotificacionesProvider(
      service: _FakeNotificacionesService(notificaciones),
      vistasStorage: NotificacionesVistasStorage(),
      idUsuario: 1,
    );
    await provider.listo;
    expect(provider.noLeidas, 2);

    await provider.marcarTodoVisto();

    expect(provider.noLeidas, 0);
  });

  test('el conteo sigue en 0 tras "cerrar y volver a abrir la app" (nueva instancia, mismo usuario)', () async {
    final primeraSesion = NotificacionesProvider(
      service: _FakeNotificacionesService(notificaciones),
      vistasStorage: NotificacionesVistasStorage(),
      idUsuario: 1,
    );
    await primeraSesion.listo;
    await primeraSesion.marcarTodoVisto();
    expect(primeraSesion.noLeidas, 0);

    // Nueva instancia = simula un reinicio de la app: lee shared_preferences
    // desde cero, no reutiliza estado en memoria de la instancia anterior.
    final segundaSesion = NotificacionesProvider(
      service: _FakeNotificacionesService(notificaciones),
      vistasStorage: NotificacionesVistasStorage(),
      idUsuario: 1,
    );
    await segundaSesion.listo;

    expect(segundaSesion.noLeidas, 0);
  });

  test('un usuario distinto no hereda las vistas de otro (clave por idUsuario)', () async {
    final admin1 = NotificacionesProvider(
      service: _FakeNotificacionesService(notificaciones),
      vistasStorage: NotificacionesVistasStorage(),
      idUsuario: 1,
    );
    await admin1.listo;
    await admin1.marcarTodoVisto();

    final admin2 = NotificacionesProvider(
      service: _FakeNotificacionesService(notificaciones),
      vistasStorage: NotificacionesVistasStorage(),
      idUsuario: 2,
    );
    await admin2.listo;

    expect(admin2.noLeidas, 2);
  });
}
