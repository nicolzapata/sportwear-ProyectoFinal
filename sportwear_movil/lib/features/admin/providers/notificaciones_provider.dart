import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../shared/models/notificacion.dart';
import '../services/notificaciones_service.dart';
import '../services/notificaciones_vistas_storage.dart';

/// Mismo intervalo que INTERVALO_REFRESCO_MS en useNotificaciones.js.
const _intervaloRefresco = Duration(minutes: 2);

/// Estado del centro de notificaciones del panel admin: qué se cargó y qué
/// ya se vio (persistido en shared_preferences), igual que useNotificaciones.js.
class NotificacionesProvider extends ChangeNotifier {
  NotificacionesProvider({
    required NotificacionesService service,
    required NotificacionesVistasStorage vistasStorage,
    required int idUsuario,
  })  : _service = service,
        _vistasStorage = vistasStorage,
        _idUsuario = idUsuario {
    listo = _init();
  }

  final NotificacionesService _service;
  final NotificacionesVistasStorage _vistasStorage;
  final int _idUsuario;
  Timer? _timer;

  /// Se resuelve cuando terminó la carga inicial (vistas + primer `cargar`).
  /// Solo la usan los tests, para no depender de temporizadores/microtasks
  /// reales al verificar el estado inicial.
  late final Future<void> listo;

  List<Notificacion> items = [];
  Set<String> _vistas = {};
  bool cargando = false;

  int get noLeidas => items.where((n) => !_vistas.contains(n.id)).length;

  Future<void> _init() async {
    _vistas = await _vistasStorage.leer(_idUsuario);
    await cargar();
    _timer = Timer.periodic(_intervaloRefresco, (_) => cargar());
  }

  Future<void> cargar() async {
    cargando = true;
    notifyListeners();
    items = await _service.cargarTodas();
    cargando = false;
    notifyListeners();
  }

  /// Igual que marcarTodoVisto() en la web: se llama cada vez que se abre el
  /// panel, marcando como vistas TODAS las notificaciones cargadas en ese
  /// momento (no solo la que se toca).
  Future<void> marcarTodoVisto() async {
    _vistas = items.map((n) => n.id).toSet();
    await _vistasStorage.guardar(_idUsuario, _vistas);
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}
