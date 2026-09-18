import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../shared/widgets/theme_toggle_button.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/notificaciones_provider.dart';
import '../services/notificaciones_service.dart';
import '../services/notificaciones_vistas_storage.dart';
import '../widgets/notificaciones_bell.dart';
import '../widgets/pendientes_tab.dart';
import '../widgets/resumen_tab.dart';

/// Mini-panel de admin "de guardia": resumen rápido + pedidos pendientes.
/// No reemplaza el panel web — no hay gestión de productos, usuarios ni
/// proveedores aquí.
class AdminHomeScreen extends StatelessWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Esta pantalla solo se llega desde el botón de admin, ya gateado por
    // rol=='Admin' (ver HomeScreen) — se repite acá para que la campana
    // nunca aparezca si de todos modos no debería (mismo criterio que el
    // resto del panel admin).
    final usuario = context.watch<AuthProvider>().usuario;
    final esAdmin = usuario?.rol == 'Admin';

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Panel admin'),
          actions: [
            // Mismo orden que Navbar.jsx (admin, web): ThemeToggle justo
            // antes de NotificacionesDropdown, en "navbar-right".
            const ThemeToggleButton(),
            if (esAdmin)
              ChangeNotifierProvider(
                key: ValueKey(usuario!.idUsuario),
                create: (context) => NotificacionesProvider(
                  service: context.read<NotificacionesService>(),
                  vistasStorage: NotificacionesVistasStorage(),
                  idUsuario: usuario.idUsuario,
                ),
                child: const NotificacionesBell(),
              ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Resumen'),
              Tab(text: 'Pendientes'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [ResumenTab(), PendientesTab()],
        ),
      ),
    );
  }
}
