import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/producto.dart';
import '../../../shared/utils/formato_precio.dart';

/// Tarjeta de producto para la grilla del catálogo: imagen, nombre y precio.
class ProductoCard extends StatelessWidget {
  const ProductoCard({super.key, required this.producto, required this.onTap});

  final Producto producto;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(child: _Imagen(producto: producto)),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    producto.nombre,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    producto.tieneRangoPrecio
                        ? 'Desde ${formatoPrecioCop(producto.precioDesde)}'
                        : formatoPrecioCop(producto.precioDesde),
                    style: const TextStyle(
                      color: AppColors.primaryDark,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Imagen extends StatelessWidget {
  const _Imagen({required this.producto});

  final Producto producto;

  @override
  Widget build(BuildContext context) {
    final url = producto.imagenPrincipal;
    if (url == null || url.isEmpty) {
      return const ColoredBox(
        color: AppColors.background,
        child: Center(
          child: Icon(Icons.image_not_supported_outlined, color: AppColors.textSecondary),
        ),
      );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        CachedNetworkImage(
          imageUrl: url,
          fit: BoxFit.cover,
          placeholder: (context, url) => const ColoredBox(
            color: AppColors.background,
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          ),
          errorWidget: (context, url, error) => const ColoredBox(
            color: AppColors.background,
            child: Center(
              child: Icon(Icons.broken_image_outlined, color: AppColors.textSecondary),
            ),
          ),
        ),
        if (producto.agotado)
          Positioned(
            top: 8,
            left: 8,
            child: _Badge(texto: 'Agotado', color: AppColors.error),
          ),
      ],
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.texto, required this.color});

  final String texto;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
      child: Text(
        texto,
        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }
}
