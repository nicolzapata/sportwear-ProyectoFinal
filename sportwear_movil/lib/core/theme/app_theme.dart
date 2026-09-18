import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Paleta y tipografía reales de `sportwear/` (la web), confirmadas leyendo:
/// - `src/shared/styles/theme.css` — paleta dorado/charcoal/crema, claro Y
///   oscuro (el bloque `body.sw-scope-*[data-theme="dark"]` que activan
///   admin/checkout/carrito/auth/catálogo/mi-cuenta).
/// - `src/shared/styles/global.css` — define `--font-body: 'DM Sans'` y se
///   importa DESPUÉS de `src/index.css` en `main.jsx`, así que gana sobre el
///   `--font-body: 'Jost'` de ese archivo (nunca llega a usarse: no hay
///   ningún @import que cargue Jost en toda la web).
/// - `src/index.css` — define `--font-display: 'DM Sans'` (global.css no lo
///   redeclara, así que aplica tal cual). Es decir: título Y cuerpo son la
///   misma familia, 'DM Sans', en toda la web.
///
/// Cada Color de abajo trae en el comentario la variable CSS exacta de la
/// que salió — nada aproximado ni inventado.
class _Palette {
  const _Palette({
    required this.primary,
    required this.primaryStrong,
    required this.background,
    required this.surface,
    required this.surfaceAlt,
    required this.text,
    required this.textMuted,
    required this.border,
    required this.danger,
    required this.dangerBg,
    required this.success,
    required this.successBg,
    required this.warning,
    required this.warningBg,
    required this.info,
    required this.infoBg,
  });

  final Color primary;
  final Color primaryStrong;
  final Color background;
  final Color surface;
  final Color surfaceAlt;
  final Color text;
  final Color textMuted;
  final Color border;
  final Color danger;
  final Color dangerBg;
  final Color success;
  final Color successBg;
  final Color warning;
  final Color warningBg;
  final Color info;
  final Color infoBg;
}

/// Claro: theme.css `:root` (el valor global de toda la web).
const _lightPalette = _Palette(
  primary: Color(0xFFC8A46A), // --sw-primary
  primaryStrong: Color(0xFFB08A4E), // --sw-primary-strong
  background: Color(0xFFFAF8F5), // --sw-bg (= --sw-neutral)
  surface: Color(0xFFFFFFFF), // --sw-surface
  surfaceAlt: Color(0xFFF5EFE3), // --sw-surface-alt
  text: Color(0xFF202126), // --sw-text (= --sw-secondary)
  textMuted: Color(0xFF756F66), // --sw-text-muted
  border: Color(0xFFE6DCC8), // --sw-border
  danger: Color(0xFFB83232), // --sw-danger
  dangerBg: Color(0xFFFDF0EE), // --sw-danger-bg
  success: Color(0xFF3A6648), // --sw-success
  successBg: Color(0xFFEAF4EE), // --sw-success-bg
  warning: Color(0xFF8A5A00), // --sw-warning
  warningBg: Color(0xFFFDF3DC), // --sw-warning-bg
  info: Color(0xFF1A6FC4), // --sw-info
  infoBg: Color(0xFFEAF2FB), // --sw-info-bg
);

/// Oscuro: theme.css `body.sw-scope-*[data-theme="dark"]`.
/// OJO — a propósito, no es un error: en este bloque `--primary` pasa a
/// valer `--sw-tertiary` (el dorado más CLARO) y `--primary-dark` pasa a
/// valer `--sw-primary` (el dorado intermedio) — invertido respecto al
/// claro, porque un dorado más claro es el que de verdad resalta sobre un
/// fondo oscuro. Replicado tal cual, no es una aproximación.
const _darkPalette = _Palette(
  primary: Color(0xFFE2C799), // --sw-tertiary (pasa a ser --primary en oscuro)
  primaryStrong: Color(0xFFC8A46A), // --sw-primary (pasa a ser --primary-dark en oscuro)
  background: Color(0xFF0A0B0D), // --sw-dark-bg
  surface: Color(0xFF0E0F12), // --sw-dark-surface
  surfaceAlt: Color(0xFF16171B), // --sw-dark-surface-alt
  text: Color(0xFFFAF8F5), // --sw-dark-text
  textMuted: Color(0xFF8F8A82), // --sw-dark-text-muted
  border: Color(0xFF26272C), // --sw-dark-border
  danger: Color(0xFFE2665A), // --sw-dark-danger
  dangerBg: Color(0xFF3A2422), // --sw-dark-danger-bg
  success: Color(0xFF5AA877), // --sw-dark-success
  successBg: Color(0xFF1F3327), // --sw-dark-success-bg
  warning: Color(0xFFD9A441), // --sw-dark-warning
  warningBg: Color(0xFF3A2F16), // --sw-dark-warning-bg
  info: Color(0xFF5B9BDB), // --sw-dark-info
  infoBg: Color(0xFF1E2C3A), // --sw-dark-info-bg
);

/// Acceso estático a los colores del tema ACTIVO, para las pantallas que ya
/// existían y usan `AppColors.xxx` directo (sin `Theme.of(context)`), como
/// se pidió en cada fase anterior. [actualizar] se llama una vez por build
/// desde el `builder` de `MaterialApp.router` en main.dart, con el
/// `Brightness` ya resuelto por Flutter según [AppThemeController] — así
/// cada pantalla ve el valor correcto en su siguiente `build()` sin tener
/// que recibir `BuildContext` ni cambiar su firma.
class AppColors {
  AppColors._();

  static _Palette _paleta = _lightPalette;

  static void actualizar(Brightness brightness) {
    _paleta = brightness == Brightness.dark ? _darkPalette : _lightPalette;
  }

  static Color get primary => _paleta.primary;
  static Color get primaryDark => _paleta.primaryStrong;
  static Color get background => _paleta.background;
  static Color get surface => _paleta.surface;
  static Color get surfaceAlt => _paleta.surfaceAlt;
  static Color get textPrimary => _paleta.text;
  static Color get textSecondary => _paleta.textMuted;
  static Color get border => _paleta.border;
  static Color get error => _paleta.danger;
  static Color get errorBg => _paleta.dangerBg;
  static Color get success => _paleta.success;
  static Color get successBg => _paleta.successBg;
  static Color get warning => _paleta.warning;
  static Color get warningBg => _paleta.warningBg;
  static Color get info => _paleta.info;
  static Color get infoBg => _paleta.infoBg;

  /// --sw-secondary: constante — theme.css NO la reasigna en el bloque
  /// oscuro, así que vale lo mismo en los dos modos. Es el texto oscuro que
  /// va sobre los botones dorados (`.btn-primary { color: var(--sw-secondary) }`).
  static const Color onPrimary = Color(0xFF202126);

  /// --sn-black / --sn-accent (Catalogo.layout.css, `:root` propio de esa
  /// hoja) — el hero del catálogo (CatalogoHero.jsx) es una franja
  /// deliberadamente oscura SIEMPRE, sin importar el tema claro/oscuro del
  /// resto de la app (el propio theme.css lo aclara: "--sn-black/--sn-dark
  /// NO se tocan en el bloque oscuro a propósito"). Por eso son constantes
  /// acá también, en vez de depender de `_paleta`.
  static const Color heroBackground = Color(0xFF0E0E0E);
  static const Color heroAccent = Color(0xFFC8A882);
}

class AppTheme {
  AppTheme._();

  static ThemeData get light => _build(_lightPalette, Brightness.light);
  static ThemeData get dark => _build(_darkPalette, Brightness.dark);

  static ThemeData _build(_Palette p, Brightness brightness) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: p.primary,
      brightness: brightness,
      primary: p.primary,
      onPrimary: AppColors.onPrimary,
      error: p.danger,
      surface: p.surface,
      onSurface: p.text,
    );

    // 'DM Sans' — la misma familia para título y cuerpo (ver el comentario
    // de arriba sobre --font-display/--font-body). google_fonts la
    // descarga en runtime, igual que el @import de Google Fonts en la web.
    final textTheme = GoogleFonts.dmSansTextTheme(
      brightness == Brightness.dark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
    ).apply(bodyColor: p.text, displayColor: p.text);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: p.background,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: p.surface,
        foregroundColor: p.text,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.dmSans(
          fontSize: 20,
          fontWeight: FontWeight.w500,
          color: p.text,
        ),
      ),
      cardColor: p.surface,
      dividerColor: p.border,
      // --r-md efectivo de la web: global.css lo redeclara a 10px (pisa el
      // 8px de index.css, mismo motivo que --font-body).
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: p.surface,
        hintStyle: GoogleFonts.dmSans(color: p.textMuted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: p.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: p.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: p.primaryStrong, width: 1.5),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: p.primary,
          foregroundColor: AppColors.onPrimary,
          minimumSize: const Size.fromHeight(48),
          textStyle: GoogleFonts.dmSans(fontWeight: FontWeight.w600, fontSize: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: p.text,
        contentTextStyle: GoogleFonts.dmSans(color: p.surface),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
