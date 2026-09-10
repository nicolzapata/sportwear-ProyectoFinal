import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/pedido_admin.dart';
import '../../../shared/utils/formato_fecha.dart';
import '../../../shared/utils/formato_precio.dart';
import '../services/admin_service.dart';

class PendientesTab extends StatefulWidget {
  const PendientesTab({super.key});

  @override
  State<PendientesTab> createState() => _PendientesTabState();
}

class _PendientesTabState extends State<PendientesTab> {
  late Future<List<PedidoAdmin>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AdminService>().getPedidosPendientes();
  }

  Future<void> _recargar() async {
    final service = context.read<AdminService>();
    setState(() => _future = service.getPedidosPendientes());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<PedidoAdmin>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          final mensaje = snapshot.error is ApiException
              ? (snapshot.error as ApiException).message
              : 'No se pudieron cargar los pedidos pendientes.';
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

        final pedidos = snapshot.data!;
        if (pedidos.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.task_alt, size: 48, color: AppColors.textSecondary),
                  SizedBox(height: 12),
                  Text('No hay pedidos pendientes.', style: TextStyle(color: AppColors.textSecondary)),
                ],
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: _recargar,
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: pedidos.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final pedido = pedidos[index];
              return Card(
                color: AppColors.surface,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.border),
                ),
                child: ListTile(
                  onTap: () async {
                    await context.push('/admin/pedido-detalle', extra: pedido);
                    if (context.mounted) _recargar();
                  },
                  title: Text(pedido.cliente, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('Pedido #${pedido.idPedido} · ${formatoFecha(pedido.fechaVenta)}'),
                  trailing: Text(
                    formatoPrecioCop(pedido.total),
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
