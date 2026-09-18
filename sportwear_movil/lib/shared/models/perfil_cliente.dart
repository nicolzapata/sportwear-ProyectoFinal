import '../utils/parse_num.dart';

/// GET /api/clientes/mi-perfil (verificarToken; usa el id_cliente del JWT —
/// clientes.controller.js -> getMiPerfil -> clientesService.getClienteById).
///
/// PUT /api/clientes/mi-perfil (actualizarMiPerfil) solo acepta y actualiza
/// `nombre`, `telefono`, `id_barrio`, `direccion`, `ciudad` (COALESCE, así
/// que cualquiera de esos se puede omitir sin borrar el valor existente).
/// `documento`, `tipo_doc` y `email` NO son editables por este endpoint —
/// ni siquiera los toma del body, así que se muestran siempre de solo
/// lectura. Confirmado leyendo clientes.service.js directamente.
class PerfilCliente {
  PerfilCliente({
    required this.idCliente,
    required this.nombre,
    required this.email,
    this.tipoDoc,
    this.documento,
    this.telefono,
    this.ciudad,
    this.direccion,
    this.idBarrio,
    this.barrioNombre,
  });

  factory PerfilCliente.fromJson(Map<String, dynamic> json) {
    return PerfilCliente(
      idCliente: parseInt(json['id_cliente']),
      nombre: json['nombre'] as String? ?? '',
      email: json['email'] as String? ?? '',
      tipoDoc: json['tipo_doc'] as String?,
      documento: json['documento'] as String?,
      telefono: json['telefono'] as String?,
      ciudad: json['ciudad'] as String?,
      direccion: json['direccion'] as String?,
      idBarrio: json['id_barrio'] == null ? null : parseInt(json['id_barrio']),
      barrioNombre: json['barrio_nombre'] as String?,
    );
  }

  final int idCliente;
  final String nombre;
  final String email;
  final String? tipoDoc;
  final String? documento;
  final String? telefono;
  final String? ciudad;
  final String? direccion;
  final int? idBarrio;
  final String? barrioNombre;
}
