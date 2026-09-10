import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../providers/catalogo_provider.dart';
import '../widgets/producto_card.dart';

/// Grilla responsive de productos. El número de columnas se calcula a partir
/// del ancho disponible (no un valor fijo) para que se vea bien tanto en un
/// teléfono compacto como en un tablet.
class ListaProductosScreen extends StatelessWidget {
  const ListaProductosScreen({super.key});

  static const _anchoMinimoTarjeta = 170.0;

  @override
  Widget build(BuildContext context) {
    final catalogo = context.watch<CatalogoProvider>();

    if (catalogo.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (catalogo.errorMessage != null) {
      return _EstadoVacio(
        icono: Icons.wifi_off_rounded,
        mensaje: catalogo.errorMessage!,
        accion: TextButton(
          onPressed: () => context.read<CatalogoProvider>().cargar(),
          child: const Text('Reintentar'),
        ),
      );
    }

    final productos = catalogo.productosFiltrados;
    if (productos.isEmpty) {
      return const _EstadoVacio(
        icono: Icons.search_off_rounded,
        mensaje: 'No hay productos que coincidan con tu búsqueda.',
      );
    }

    return RefreshIndicator(
      onRefresh: () => context.read<CatalogoProvider>().cargar(),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final columnas = (constraints.maxWidth / _anchoMinimoTarjeta).floor().clamp(2, 6);
          return GridView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: productos.length,
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: columnas,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.68,
            ),
            itemBuilder: (context, index) {
              final producto = productos[index];
              return ProductoCard(
                producto: producto,
                onTap: () => context.push('/producto/${producto.idProducto}'),
              );
            },
          );
        },
      ),
    );
  }
}

class _EstadoVacio extends StatelessWidget {
  const _EstadoVacio({required this.icono, required this.mensaje, this.accion});

  final IconData icono;
  final String mensaje;
  final Widget? accion;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icono, size: 48, color: AppColors.textSecondary),
            const SizedBox(height: 12),
            Text(
              mensaje,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            if (accion != null) ...[const SizedBox(height: 8), accion!],
          ],
        ),
      ),
    );
  }
}
