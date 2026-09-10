import 'package:flutter/foundation.dart';

import '../../../core/api/api_exception.dart';
import '../../../shared/models/categoria.dart';
import '../../../shared/models/producto.dart';
import '../services/catalogo_service.dart';

/// Estado del catálogo: categoría seleccionada, término de búsqueda y la
/// lista de productos ya cargada. El filtro de categoría/búsqueda se aplica
/// del lado del cliente sobre la lista completa — igual que hace la web
/// (Catalogo.jsx), que tampoco usa el `q` del backend para esto.
class CatalogoProvider extends ChangeNotifier {
  CatalogoProvider(this._service);

  final CatalogoService _service;

  bool _isLoading = false;
  String? _errorMessage;
  List<Categoria> _categorias = [];
  List<Producto> _productos = [];
  int? _categoriaSeleccionada;
  String _terminoBusqueda = '';

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int? get categoriaSeleccionada => _categoriaSeleccionada;
  String get terminoBusqueda => _terminoBusqueda;

  /// Solo categorías activas y con al menos un producto (mismo criterio que
  /// Catalogo.jsx: no ofrecer una categoría vacía sin nada que mostrar).
  List<Categoria> get categorias => _categorias
      .where((c) => c.estado == 'Activo' && c.totalProductos > 0)
      .toList();

  List<Producto> get productosFiltrados {
    final termino = _terminoBusqueda.trim().toLowerCase();
    return _productos.where((p) {
      final coincideCategoria =
          _categoriaSeleccionada == null || p.idCategoria == _categoriaSeleccionada;
      final coincideBusqueda = termino.isEmpty ||
          p.nombre.toLowerCase().contains(termino) ||
          p.codigo.toLowerCase().contains(termino);
      return coincideCategoria && coincideBusqueda;
    }).toList();
  }

  Future<void> cargar() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final resultados = await Future.wait([
        _service.getCategorias(),
        _service.getProductos(),
      ]);
      _categorias = resultados[0] as List<Categoria>;
      // Filtro defensivo extra: publicado ya implica Activo en el backend,
      // pero se replica la misma verificación que hace la web por seguridad.
      _productos = (resultados[1] as List<Producto>)
          .where((p) => p.publicado && p.estado == 'Activo')
          .toList();
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void seleccionarCategoria(int? idCategoria) {
    if (_categoriaSeleccionada == idCategoria) return;
    _categoriaSeleccionada = idCategoria;
    notifyListeners();
  }

  void buscar(String termino) {
    if (_terminoBusqueda == termino) return;
    _terminoBusqueda = termino;
    notifyListeners();
  }
}
