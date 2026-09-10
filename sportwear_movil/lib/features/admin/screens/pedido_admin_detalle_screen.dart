import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/pedido_admin.dart';
import '../../../shared/utils/formato_fecha.dart';
import '../../../shared/utils/formato_precio.dart';
import '../services/admin_service.dart';

/// Detalle de un pedido desde el mini-panel admin: solo lectura de los datos
/// del pedido + acción para cambiar `estado_pedido`. Sin edición de
/// productos ni montos.
class PedidoAdminDetalleScreen extends StatefulWidget {
  const PedidoAdminDetalleScreen({super.key, required this.pedido});

  final PedidoAdmin pedido;

  @override
  State<PedidoAdminDetalleScreen> createState() => _PedidoAdminDetalleScreenState();
}

class _PedidoAdminDetalleScreenState extends State<PedidoAdminDetalleScreen> {
  late String _estadoActual = widget.pedido.estadoPedido;
  bool _cambiando = false;
  String? _error;

  Future<void> _cambiarEstado(String nuevoEstado) async {
    setState(() {
      _cambiando = true;
      _error = null;
    });
    try {
      await context.read<AdminService>().cambiarEstadoPedido(widget.pedido.idPedido, nuevoEstado);
      if (!mounted) return;
      setState(() => _estadoActual = nuevoEstado);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Pedido actualizado a "$nuevoEstado"')),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _cambiando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pedido = widget.pedido;
    final opciones = transicionesEstadoPedido[_estadoActual] ?? const <String>[];

    return Scaffold(
      appBar: AppBar(title: Text('Pedido #${pedido.idPedido}')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _Seccion(titulo: 'Cliente', child: Text(pedido.cliente)),
            const SizedBox(height: 20),
            _Seccion(titulo: 'Fecha', child: Text(formatoFecha(pedido.fechaVenta))),
            const SizedBox(height: 20),
            _Seccion(
              titulo: 'Estado actual',
              child: Text(_estadoActual, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 20),
            _Seccion(titulo: 'Dirección de entrega', child: Text(pedido.direccionEntrega)),
            const SizedBox(height: 20),
            _Seccion(titulo: 'Método de pago', child: Text(pedido.metodoPago)),
            const SizedBox(height: 20),
            _Seccion(
              titulo: 'Productos',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: pedido.items
                    .map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Text(
                            '${item.cantidad}x ${item.producto}${item.talla != null ? ' (Talla ${item.talla})' : ''}',
                          ),
                        ))
                    .toList(),
              ),
            ),
            const Divider(color: AppColors.border, height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                Text(
                  formatoPrecioCop(pedido.total),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primaryDark),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (opciones.isNotEmpty) ...[
              const Text('Cambiar estado a', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_error!, style: const TextStyle(color: AppColors.error)),
                ),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: opciones
                    .map((estado) => ElevatedButton(
                          onPressed: _cambiando ? null : () => _cambiarEstado(estado),
                          style: estado == 'Cancelado'
                              ? ElevatedButton.styleFrom(backgroundColor: AppColors.error)
                              : null,
                          child: Text(estado),
                        ))
                    .toList(),
              ),
            ] else
              const Text(
                'Este pedido no tiene más transiciones de estado disponibles.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
          ],
        ),
      ),
    );
  }
}

class _Seccion extends StatelessWidget {
  const _Seccion({required this.titulo, required this.child});

  final String titulo;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(titulo, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}
