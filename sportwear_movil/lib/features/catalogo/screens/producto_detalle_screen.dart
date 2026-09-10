import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/imagen_producto.dart';
import '../../../shared/models/item_carrito.dart';
import '../../../shared/models/producto.dart';
import '../../../shared/models/variante.dart';
import '../../../shared/utils/formato_precio.dart';
import '../../carrito/providers/carrito_provider.dart';
import '../services/catalogo_service.dart';

typedef _ColorInfo = ({int idColor, String nombre, String? codigoHex});

class ProductoDetalleScreen extends StatefulWidget {
  const ProductoDetalleScreen({super.key, required this.idProducto});

  final int idProducto;

  @override
  State<ProductoDetalleScreen> createState() => _ProductoDetalleScreenState();
}

class _ProductoDetalleScreenState extends State<ProductoDetalleScreen> {
  late final Future<({Producto? producto, List<ImagenProducto> imagenes})> _future;

  @override
  void initState() {
    super.initState();
    final service = context.read<CatalogoService>();
    _future = _cargar(service);
  }

  Future<({Producto? producto, List<ImagenProducto> imagenes})> _cargar(
    CatalogoService service,
  ) async {
    final resultados = await Future.wait([
      service.getProductoById(widget.idProducto),
      service.getImagenesProducto(widget.idProducto),
    ]);
    return (
      producto: resultados[0] as Producto?,
      imagenes: resultados[1] as List<ImagenProducto>,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detalle del producto')),
      body: FutureBuilder(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          final producto = snapshot.data?.producto;
          if (snapshot.hasError || producto == null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
                    const SizedBox(height: 12),
                    const Text('No se pudo cargar el producto.'),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => context.pop(),
                      child: const Text('Volver al catálogo'),
                    ),
                  ],
                ),
              ),
            );
          }
          return _DetalleContenido(producto: producto, imagenes: snapshot.data!.imagenes);
        },
      ),
    );
  }
}

class _DetalleContenido extends StatefulWidget {
  const _DetalleContenido({required this.producto, required this.imagenes});

  final Producto producto;
  final List<ImagenProducto> imagenes;

  @override
  State<_DetalleContenido> createState() => _DetalleContenidoState();
}

class _DetalleContenidoState extends State<_DetalleContenido> {
  _ColorInfo? _colorSel;
  String? _tallaSel;

  @override
  void initState() {
    super.initState();
    final colores = _extraerColores(widget.producto.variantes);
    if (colores.isNotEmpty) {
      _colorSel = colores.first;
      final tallas = _tallasDeColor(widget.producto.variantes, _colorSel!.idColor);
      if (tallas.isNotEmpty) _tallaSel = tallas.first;
    }
  }

  void _seleccionarColor(_ColorInfo color) {
    final tallas = _tallasDeColor(widget.producto.variantes, color.idColor);
    setState(() {
      _colorSel = color;
      _tallaSel = tallas.isNotEmpty ? tallas.first : null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final producto = widget.producto;
    final colores = _extraerColores(producto.variantes);
    final tallas = _colorSel == null
        ? const <String>[]
        : _tallasDeColor(producto.variantes, _colorSel!.idColor);
    final urls = _filtrarImagenes(widget.imagenes, producto.imagenPrincipal, _colorSel?.idColor);
    final varianteSel = _buscarVariante(producto.variantes, _colorSel?.idColor, _tallaSel);

    final stockMostrado = varianteSel?.stock ?? producto.stock;
    final precioMostrado = varianteSel?.precio ?? producto.precio;
    final sinSeleccion = producto.variantes.isNotEmpty && (_colorSel == null || _tallaSel == null);
    final agotado = stockMostrado <= 0;

    final galeria = AspectRatio(aspectRatio: 1, child: _Galeria(urls: urls));
    final info = _InfoDetalle(
      producto: producto,
      colores: colores,
      tallas: tallas,
      colorSel: _colorSel,
      tallaSel: _tallaSel,
      variantes: producto.variantes,
      onColorSeleccionado: _seleccionarColor,
      onTallaSeleccionada: (t) => setState(() => _tallaSel = t),
      precioMostrado: precioMostrado,
      stockMostrado: stockMostrado,
      sinSeleccion: sinSeleccion,
      agotado: agotado,
      varianteSel: varianteSel,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final esAncho = constraints.maxWidth >= 700;
        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: esAncho
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 5, child: galeria),
                    const SizedBox(width: 24),
                    Expanded(flex: 4, child: info),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [galeria, const SizedBox(height: 16), info],
                ),
        );
      },
    );
  }
}

class _InfoDetalle extends StatelessWidget {
  const _InfoDetalle({
    required this.producto,
    required this.colores,
    required this.tallas,
    required this.colorSel,
    required this.tallaSel,
    required this.variantes,
    required this.onColorSeleccionado,
    required this.onTallaSeleccionada,
    required this.precioMostrado,
    required this.stockMostrado,
    required this.sinSeleccion,
    required this.agotado,
    required this.varianteSel,
  });

  final Producto producto;
  final List<_ColorInfo> colores;
  final List<String> tallas;
  final _ColorInfo? colorSel;
  final String? tallaSel;
  final List<Variante> variantes;
  final ValueChanged<_ColorInfo> onColorSeleccionado;
  final ValueChanged<String> onTallaSeleccionada;
  final double precioMostrado;
  final int stockMostrado;
  final bool sinSeleccion;
  final bool agotado;
  final Variante? varianteSel;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (producto.categoria != null)
          Text(
            producto.categoria!.toUpperCase(),
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
              fontSize: 12,
              letterSpacing: 0.5,
            ),
          ),
        const SizedBox(height: 4),
        Text(producto.nombre, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        Text(
          formatoPrecioCop(precioMostrado),
          style: const TextStyle(
            color: AppColors.primaryDark,
            fontWeight: FontWeight.bold,
            fontSize: 22,
          ),
        ),
        const SizedBox(height: 16),
        if (colores.isNotEmpty) ...[
          const Text('Color', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 10,
            children: colores.map((c) {
              final seleccionado = colorSel?.idColor == c.idColor;
              return GestureDetector(
                onTap: () => onColorSeleccionado(c),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _colorDesdeHex(c.codigoHex),
                    border: Border.all(
                      color: seleccionado ? AppColors.primary : AppColors.border,
                      width: seleccionado ? 3 : 1,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],
        if (tallas.isNotEmpty) ...[
          const Text('Talla', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: tallas.map((t) {
              final variante = _buscarVariante(variantes, colorSel?.idColor, t);
              final sinStock = (variante?.stock ?? 0) <= 0;
              final seleccionado = tallaSel == t;
              return OutlinedButton(
                onPressed: sinStock ? null : () => onTallaSeleccionada(t),
                style: OutlinedButton.styleFrom(
                  backgroundColor: seleccionado ? AppColors.primary : null,
                  foregroundColor: seleccionado ? Colors.white : AppColors.textPrimary,
                  side: BorderSide(color: seleccionado ? AppColors.primary : AppColors.border),
                ),
                child: Text(sinStock ? '$t (agotada)' : t),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
        ],
        Text(
          sinSeleccion
              ? 'Selecciona color y talla'
              : agotado
                  ? 'Sin stock disponible'
                  : 'Stock disponible: $stockMostrado unidades',
          style: TextStyle(
            color: agotado ? AppColors.error : AppColors.textSecondary,
            fontStyle: sinSeleccion ? FontStyle.italic : FontStyle.normal,
          ),
        ),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          onPressed: (varianteSel == null || agotado)
              ? null
              : () => _agregarAlCarrito(context, producto, varianteSel!, colorSel!, tallaSel!),
          icon: const Icon(Icons.shopping_cart_outlined),
          label: const Text('Agregar al carrito'),
        ),
        if (producto.descripcion != null && producto.descripcion!.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Divider(color: AppColors.border),
          const SizedBox(height: 12),
          const Text('Descripción', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Text(producto.descripcion!, style: const TextStyle(color: AppColors.textSecondary)),
        ],
      ],
    );
  }
}

class _Galeria extends StatefulWidget {
  const _Galeria({required this.urls});

  final List<String> urls;

  @override
  State<_Galeria> createState() => _GaleriaState();
}

class _GaleriaState extends State<_Galeria> {
  final _controller = PageController();
  int _index = 0;

  @override
  void didUpdateWidget(covariant _Galeria oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.urls != widget.urls) {
      _index = 0;
      if (_controller.hasClients) _controller.jumpToPage(0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.urls.isEmpty) {
      return const ColoredBox(
        color: AppColors.background,
        child: Center(
          child: Icon(Icons.image_not_supported_outlined, size: 48, color: AppColors.textSecondary),
        ),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _controller,
            itemCount: widget.urls.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (context, i) => CachedNetworkImage(
              imageUrl: widget.urls[i],
              fit: BoxFit.cover,
              placeholder: (context, url) =>
                  const Center(child: CircularProgressIndicator(strokeWidth: 2)),
              errorWidget: (context, url, error) => const Center(
                child: Icon(Icons.broken_image_outlined, color: AppColors.textSecondary),
              ),
            ),
          ),
          if (widget.urls.length > 1)
            Positioned(
              bottom: 12,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  widget.urls.length,
                  (i) => Container(
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i == _index ? AppColors.primary : Colors.white.withValues(alpha: 0.7),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

void _agregarAlCarrito(
  BuildContext context,
  Producto producto,
  Variante variante,
  _ColorInfo color,
  String talla,
) {
  context.read<CarritoProvider>().agregar(ItemCarrito(
        idProducto: producto.idProducto,
        idVariante: variante.idVariante,
        nombreProducto: producto.nombre,
        colorNombre: color.nombre,
        talla: talla,
        precio: variante.precio ?? producto.precio,
        stockDisponible: variante.stock,
        imagenUrl: producto.imagenPrincipal,
      ));
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('${producto.nombre} agregado al carrito')),
  );
}

Color _colorDesdeHex(String? hex) {
  if (hex == null || hex.isEmpty) return AppColors.border;
  final valor = hex.replaceFirst('#', '');
  final normalizado = valor.length == 6 ? 'FF$valor' : valor;
  return Color(int.parse(normalizado, radix: 16));
}

List<_ColorInfo> _extraerColores(List<Variante> variantes) {
  final vistos = <int>{};
  final resultado = <_ColorInfo>[];
  for (final v in variantes) {
    if (vistos.add(v.idColor)) {
      resultado.add((idColor: v.idColor, nombre: v.colorNombre, codigoHex: v.codigoHex));
    }
  }
  return resultado;
}

List<String> _tallasDeColor(List<Variante> variantes, int idColor) {
  final tallas = <String>{};
  for (final v in variantes) {
    if (v.idColor == idColor) tallas.add(v.talla);
  }
  return tallas.toList();
}

Variante? _buscarVariante(List<Variante> variantes, int? idColor, String? talla) {
  if (idColor == null || talla == null) return null;
  for (final v in variantes) {
    if (v.idColor == idColor && v.talla == talla) return v;
  }
  return null;
}

/// Igual que filtrarImagenes() en la web: si hay imágenes propias del color
/// seleccionado se usan esas; si no, las generales (sin color); si tampoco,
/// todas. Si el backend no devolvió ninguna imagen, cae a `imagen_principal`.
List<String> _filtrarImagenes(
  List<ImagenProducto> imagenes,
  String? imagenPrincipal,
  int? idColor,
) {
  final todas = imagenes.isNotEmpty
      ? imagenes
      : (imagenPrincipal != null
          ? [ImagenProducto(idImagen: 0, url: imagenPrincipal)]
          : const <ImagenProducto>[]);
  if (todas.isEmpty) return const [];
  if (idColor == null) return todas.map((i) => i.url).toList();
  final delColor = todas.where((i) => i.idColor == idColor).toList();
  if (delColor.isNotEmpty) return delColor.map((i) => i.url).toList();
  final generales = todas.where((i) => i.idColor == null).toList();
  return (generales.isNotEmpty ? generales : todas).map((i) => i.url).toList();
}
