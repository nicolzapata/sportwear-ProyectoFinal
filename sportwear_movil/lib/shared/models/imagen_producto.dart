import '../utils/parse_num.dart';

/// GET /api/imagenes?tipo=Producto&id=X (routes/imagenes.js). `idColor` es
/// null cuando la imagen es general (no asociada a un color específico).
class ImagenProducto {
  ImagenProducto({
    required this.idImagen,
    required this.url,
    this.idColor,
    this.esPrincipal = false,
    this.orden = 0,
  });

  factory ImagenProducto.fromJson(Map<String, dynamic> json) {
    return ImagenProducto(
      idImagen: parseInt(json['id_imagen']),
      url: json['url'] as String,
      idColor: json['id_color'] == null ? null : parseInt(json['id_color']),
      esPrincipal: json['es_principal'] as bool? ?? false,
      orden: parseInt(json['orden']),
    );
  }

  final int idImagen;
  final String url;
  final int? idColor;
  final bool esPrincipal;
  final int orden;
}
