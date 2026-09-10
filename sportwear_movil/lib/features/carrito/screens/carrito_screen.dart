import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/utils/formato_precio.dart';
import '../../auth/utils/require_login.dart';
import '../providers/carrito_provider.dart';
import '../widgets/carrito_item_tile.dart';

class CarritoScreen extends StatelessWidget {
  const CarritoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final carrito = context.watch<CarritoProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Carrito')),
      body: carrito.estaVacio
          ? const _CarritoVacio()
          : SafeArea(
              child: Column(
                children: [
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: carrito.items.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = carrito.items[index];
                        return CarritoItemTile(
                          item: item,
                          onCantidadCambiada: (cantidad) =>
                              carrito.actualizarCantidad(item.idVariante, cantidad),
                          onQuitar: () => carrito.quitar(item.idVariante),
                        );
                      },
                    ),
                  ),
                  _ResumenYPagar(total: carrito.total),
                ],
              ),
            ),
    );
  }
}

class _CarritoVacio extends StatelessWidget {
  const _CarritoVacio();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_cart_outlined, size: 56, color: AppColors.textSecondary),
            const SizedBox(height: 16),
            const Text('Tu carrito está vacío', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            const Text(
              'Agrega productos desde el catálogo para verlos aquí.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => context.go('/home'),
              child: const Text('Ir al catálogo'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ResumenYPagar extends StatelessWidget {
  const _ResumenYPagar({required this.total});

  final double total;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                Text(
                  formatoPrecioCop(total),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                    color: AppColors.primaryDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                if (!requireLogin(context, redirectTo: '/carrito')) return;
                context.push('/checkout');
              },
              child: const Text('Pagar'),
            ),
          ],
        ),
      ),
    );
  }
}
