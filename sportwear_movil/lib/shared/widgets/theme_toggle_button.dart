import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme_controller.dart';

/// Equivalente a ThemeToggle.jsx — un botón sol/luna que alterna claro/oscuro.
class ThemeToggleButton extends StatelessWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AppThemeController>();
    return IconButton(
      tooltip: controller.esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
      icon: Icon(controller.esOscuro ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
      onPressed: controller.alternar,
    );
  }
}
