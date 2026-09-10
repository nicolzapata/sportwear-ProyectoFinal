import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/abono_pedido.dart';
import '../../../shared/models/pedido.dart';
import '../../../shared/utils/formato_fecha.dart';
import '../../../shared/utils/formato_precio.dart';

class PedidoDetalleScreen extends StatelessWidget {
  const PedidoDetalleScreen({super.key, required this.pedido});

  final Pedido pedido;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Pedido #${pedido.idVenta}')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _Seccion(
              titulo: 'Estado',
              child: Text(pedido.estadoMostrado, style: const TextStyle(fontWeight: FontWeight.w600)),
            ),
            const SizedBox(height: 20),
            _Seccion(
              titulo: 'Productos',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: pedido.items
                    .map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.nombreProducto, style: const TextStyle(fontWeight: FontWeight.w500)),
                                    if (item.colorNombre != null || item.talla != null)
                                      Text(
                                        [
                                          if (item.colorNombre != null) item.colorNombre,
                                          if (item.talla != null) 'Talla ${item.talla}',
                                        ].join(' · '),
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                      ),
                                    Text(
                                      '${item.cantidad} x ${formatoPrecioCop(item.precioUnitario)}',
                                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                formatoPrecioCop(item.subtotal),
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ],
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
            const SizedBox(height: 20),
            _Seccion(
              titulo: 'Entrega',
              child: Text(pedido.direccionEntrega),
            ),
            const SizedBox(height: 20),
            _Seccion(
              titulo: 'Método de pago',
              child: Text(pedido.metodoPago),
            ),
            if (pedido.esCuotas && pedido.abonos.isNotEmpty) ...[
              const SizedBox(height: 20),
              _Seccion(
                titulo: 'Cuotas',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: pedido.abonos.map((abono) => _FilaCuota(abono: abono)).toList(),
                ),
              ),
            ],
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

class _FilaCuota extends StatelessWidget {
  const _FilaCuota({required this.abono});

  final AbonoPedido abono;

  @override
  Widget build(BuildContext context) {
    final pagada = abono.estado == 'Confirmado';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(
            pagada ? Icons.check_circle : Icons.schedule,
            size: 18,
            color: pagada ? AppColors.primary : AppColors.textSecondary,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              abono.numCuota != null ? 'Cuota ${abono.numCuota}' : abono.tipo,
            ),
          ),
          if (abono.fechaVencimiento != null)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Text(
                'Vence ${formatoFecha(abono.fechaVencimiento!)}',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
              ),
            ),
          Text(formatoPrecioCop(abono.monto), style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(width: 8),
          Text(
            abono.estado,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: pagada ? AppColors.primary : AppColors.error,
            ),
          ),
        ],
      ),
    );
  }
}
