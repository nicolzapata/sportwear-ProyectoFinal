import '../../../core/api/api_client.dart';
import '../../../shared/models/categoria.dart';
import '../../../shared/models/imagen_producto.dart';
import '../../../shared/models/producto.dart';

/// Llama a los endpoints públicos de catálogo (categorias.js, productos.js,
/// imagenes.js). El catálogo solo muestra productos publicados: la regla del
/// backend es que al despublicar/inactivar un producto ambos flags se
/// mantienen sincronizados (ver productos.service.js toggleEstado), así que
/// filtrar por `publicado=1` basta — igual que hace el frontend web.
class CatalogoService {
  CatalogoService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Categoria>> getCategorias() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/categorias');
      return (response.data as List)
          .map((c) => Categoria.fromJson(c as Map<String, dynamic>))
          .toList();
    });
  }

  Future<List<Producto>> getProductos() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/productos', queryParameters: {'publicado': '1'});
      return (response.data as List)
          .map((p) => Producto.fromJson(p as Map<String, dynamic>))
          .toList();
    });
  }

  Future<Producto?> getProductoById(int idProducto) {
    return _apiClient.call((dio) async {
      final response = await dio.get('/productos', queryParameters: {
        'publicado': '1',
        'id': idProducto,
      });
      final rows = response.data as List;
      if (rows.isEmpty) return null;
      return Producto.fromJson(rows.first as Map<String, dynamic>);
    });
  }

  Future<List<ImagenProducto>> getImagenesProducto(int idProducto) {
    return _apiClient.call((dio) async {
      final response = await dio.get('/imagenes', queryParameters: {
        'tipo': 'Producto',
        'id': idProducto,
      });
      return (response.data as List)
          .map((i) => ImagenProducto.fromJson(i as Map<String, dynamic>))
          .toList();
    });
  }
}
