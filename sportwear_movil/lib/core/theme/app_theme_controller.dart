import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Modo claro/oscuro de la app — replica ThemeContext.jsx de la web al
/// detalle: la web NO sigue `prefers-color-scheme` en ningún momento (se
/// confirmó que no hay un solo `@media (prefers-color-scheme...)` en todo
/// `sportwear/src`); es 100% manual, arranca siempre en "light" si no hay
/// nada guardado, y persiste la elección en `localStorage` bajo la clave
/// `sw_theme`. Acá se persiste esa misma clave/valores en shared_preferences
/// en vez de `ThemeMode.system`, a propósito — seguir el sistema operativo
/// sería una lógica distinta a la real, que el usuario pidió no inventar.
class AppThemeController extends ChangeNotifier {
  AppThemeController() {
    _cargar();
  }

  static const _clave = 'sw_theme';

  ThemeMode _themeMode = ThemeMode.light;

  ThemeMode get themeMode => _themeMode;
  bool get esOscuro => _themeMode == ThemeMode.dark;

  Future<void> _cargar() async {
    final prefs = await SharedPreferences.getInstance();
    final guardado = prefs.getString(_clave);
    _themeMode = guardado == 'dark' ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }

  Future<void> alternar() async {
    _themeMode = esOscuro ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_clave, esOscuro ? 'dark' : 'light');
  }
}
