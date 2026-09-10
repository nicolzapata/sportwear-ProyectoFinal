import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/dashboard_resumen.dart';
import '../../../shared/utils/formato_precio.dart';
import '../services/admin_service.dart';

class ResumenTab extends StatefulWidget {
  const ResumenTab({super.key});

  @override
  State<ResumenTab> createState() => _ResumenTabState();
}

class _ResumenTabState extends State<ResumenTab> {
  late Future<DashboardResumen> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AdminService>().getResumen();
  }

  Future<void> _recargar() async {
    final service = context.read<AdminService>();
    setState(() => _future = service.getResumen());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<DashboardResumen>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          final mensaje =
              snapshot.error is ApiException ? (snapshot.error as ApiException).message : 'No se pudo cargar el resumen.';
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
                  const SizedBox(height: 12),
                  Text(mensaje, textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  TextButton(onPressed: _recargar, child: const Text('Reintentar')),
                ],
              ),
            ),
          );
        }

        final r = snapshot.data!;
        return RefreshIndicator(
          onRefresh: _recargar,
          child: GridView.count(
            padding: const EdgeInsets.all(16),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _StatTile(titulo: 'Ventas hoy', valor: '${r.ventasHoy}'),
              _StatTile(titulo: 'Ingresos hoy', valor: formatoPrecioCop(r.ingresosHoy)),
              _StatTile(titulo: 'Pedidos pendientes', valor: '${r.pedidosPendientes}'),
              _StatTile(titulo: 'Ingresos totales', valor: formatoPrecioCop(r.ingresosTotales)),
              _StatTile(titulo: 'Ventas totales', valor: '${r.ventasTotales}'),
              _StatTile(titulo: 'Ticket promedio', valor: formatoPrecioCop(r.ticketPromedio)),
              _StatTile(titulo: 'Bajo stock', valor: '${r.bajoStock}'),
              _StatTile(titulo: 'Clientes activos', valor: '${r.clientesActivos}'),
            ],
          ),
        );
      },
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.titulo, required this.valor});

  final String titulo;
  final String valor;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(titulo, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 6),
            Text(
              valor,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primaryDark),
            ),
          ],
        ),
      ),
    );
  }
}
