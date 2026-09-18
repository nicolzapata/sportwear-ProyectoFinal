import 'package:shared_preferences/shared_preferences.dart';

/// Equivalente a `localStorage` para "qué notificaciones ya se vieron",
/// misma clave por usuario que usa la web (useNotificaciones.js):
/// `sz_notif_vistas_${idUsuario}`. La web guarda un JSON de ids en
/// localStorage; acá se guarda la misma lista de ids con
/// `setStringList`/`getStringList`, el equivalente nativo de shared_preferences.
class NotificacionesVistasStorage {
  String _clave(int idUsuario) => 'sz_notif_vistas_$idUsuario';

  Future<Set<String>> leer(int idUsuario) async {
    final prefs = await SharedPreferences.getInstance();
    final guardado = prefs.getStringList(_clave(idUsuario));
    return guardado?.toSet() ?? <String>{};
  }

  Future<void> guardar(int idUsuario, Set<String> vistas) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_clave(idUsuario), vistas.toList());
  }
}
