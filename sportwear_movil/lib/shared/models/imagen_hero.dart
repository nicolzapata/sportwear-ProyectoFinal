import 'package:flutter/material.dart';

import '../utils/parse_num.dart';

/// GET /api/imagenes?tipo=Home&id=1 (routes/imagenes.js) — fotos del
/// carrusel del inicio, subidas desde Catálogo admin → Contenido del inicio.
/// El backend no filtra por estado en esta consulta (a diferencia de la
/// variante con id_color) — se replica igual, sin filtrar de más del lado
/// del cliente.
class ImagenHero {
  ImagenHero({required this.idImagen, required this.url, this.posicionFoco});

  factory ImagenHero.fromJson(Map<String, dynamic> json) {
    return ImagenHero(
      idImagen: parseInt(json['id_imagen']),
      url: json['url'] as String,
      posicionFoco: json['posicion_foco'] as String?,
    );
  }

  final int idImagen;
  final String url;

  /// Formato "X% Y%" (background-position CSS). Por defecto la web usa
  /// "50% 25%" (CatalogoHero.jsx).
  final String? posicionFoco;

  /// Convierte "X% Y%" al Alignment equivalente de Flutter (-1..1), mismo
  /// default "50% 25%" que usa la web cuando la imagen no trae su propio foco.
  Alignment get alignment {
    final partes = (posicionFoco ?? '50% 25%').split(' ');
    double pct(String s) {
      final limpio = s.trim().replaceAll('%', '');
      final valor = double.tryParse(limpio) ?? 50;
      return (valor / 100) * 2 - 1;
    }

    if (partes.length != 2) return const Alignment(0, -0.5);
    return Alignment(pct(partes[0]), pct(partes[1]));
  }
}
