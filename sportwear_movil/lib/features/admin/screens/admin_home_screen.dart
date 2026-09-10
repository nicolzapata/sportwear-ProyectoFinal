import 'package:flutter/material.dart';

import '../widgets/pendientes_tab.dart';
import '../widgets/resumen_tab.dart';

/// Mini-panel de admin "de guardia": resumen rápido + pedidos pendientes.
/// No reemplaza el panel web — no hay gestión de productos, usuarios ni
/// proveedores aquí.
class AdminHomeScreen extends StatelessWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Panel admin'),
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
