# SportWear Móvil — `sportwear_movil/`

> Ver también el [resumen general del proyecto](../CLAUDE.md).

## Qué es

App móvil orientada al **cliente final** (no incluye el panel administrativo): navegación de catálogo, carrito, checkout, seguimiento de pedidos y perfil. Incluye además una sección `admin` reducida (resumen y pendientes) consumida por roles con permisos elevados.

## Stack técnico

- **Flutter** (Dart SDK `^3.13.2` según `pubspec.yaml`) — soporta Android, iOS, Web, Linux, macOS, Windows (carpetas de plataforma generadas por el propio Flutter).
- **Dio**: cliente HTTP.
- **Provider**: manejo de estado.
- **go_router**: enrutamiento declarativo.
- **flutter_secure_storage**: almacenamiento seguro del token JWT.
- **cached_network_image**: carga/caché de imágenes de producto.
- Iconografía/splash: `flutter_launcher_icons`, `flutter_native_splash` (placeholder de marca en `assets/branding/`).

## Estructura (`lib/`)

Organización **feature-based**, similar al frontend web:

```
lib/
├── main.dart
├── core/
│   ├── api/            # api_client.dart (Dio + interceptores), api_exception.dart,
│   │                    # jwt_payload.dart, token_storage.dart
│   ├── router/          # app_router.dart (go_router)
│   └── theme/           # app_theme.dart
├── features/
│   ├── auth/            # login, registro, auth_provider, auth_service
│   ├── catalogo/        # home, lista de productos, detalle, catalogo_service/provider
│   ├── carrito/         # carrito_provider, carrito_screen
│   ├── checkout/        # checkout_screen, checkout_service
│   ├── pedidos/         # mis pedidos, detalle de pedido
│   ├── perfil/          # mi perfil
│   └── admin/           # resumen y pendientes para roles admin
└── shared/
    ├── models/          # DTOs: producto, variante, pedido, cliente, etc.
    ├── utils/           # formato de fecha/precio, parseo numérico
    └── widgets/         # widgets comunes (botones, etc.)
```

Patrón por feature: `screens/` (UI) + `services/` (llamadas HTTP) + `providers/` (estado, cuando aplica), consumiendo modelos compartidos de `shared/models/`.

## Cliente HTTP (`core/api/api_client.dart`)

- Instancia única de `Dio` con `BaseOptions(baseUrl: _baseUrl)`.
- Interceptor de request: agrega `Authorization: Bearer <token>` leyendo el JWT de `TokenStorage` (almacenamiento seguro).
- Interceptor de error: si la respuesta es `401`, borra el token guardado y dispara `onUnauthorized` (usado por `AuthProvider` para cerrar sesión y redirigir a `/login` vía `go_router`).
- Traduce cualquier `DioException` a una `ApiException` con el mensaje real del backend cuando está disponible.

### ⚠️ URL del backend hardcodeada

```dart
const _baseUrl = 'https://sportwear-proyectofinal.onrender.com/api';
```

A diferencia del frontend web (que usa `VITE_API_URL`), la app móvil **no** lee la URL del backend desde variables de entorno ni desde configuración de build: apunta siempre al backend desplegado en Render. Esto significa que, para desarrollo local contra el backend en Docker/local, hay que modificar manualmente esta constante (o introducir `--dart-define` / flavors si se quiere resolver de forma más flexible). No se modificó como parte de esta documentación por estar fuera del alcance solicitado.

## Autenticación

- `auth_provider.dart` + `auth_service.dart` gestionan login/registro y el estado de sesión.
- `token_storage.dart` persiste el JWT con `flutter_secure_storage`.
- `require_login.dart` protege pantallas que requieren sesión iniciada.

## Variables de entorno / configuración

- No usa un mecanismo de `.env`. Toda configuración sensible al entorno (actualmente solo la URL del backend) está hardcodeada en código (ver arriba).

## Scripts / comandos

```bash
flutter pub get
flutter run                       # ejecuta en un dispositivo/emulador conectado
flutter build apk                 # build Android
flutter build ios                 # build iOS (requiere macOS/Xcode)
flutter build web                 # build Web
flutter test                      # test/widget_test.dart
```

## Docker

**Esta capa no está containerizada** (a diferencia de backend y frontend). Se intentó un `Dockerfile` que compilaba la app en modo Flutter Web (`flutter build web`) servido con Nginx, pero se descartó por un bloqueo real:

- `pubspec.yaml` exige `sdk: ^3.13.2` (Dart SDK).
- Ninguna imagen pública de Flutter (`ghcr.io/cirruslabs/flutter`) publicada hasta la fecha trae un Dart SDK que cumpla esa cota — la más reciente disponible en el registro es la `3.44.0`, que trae Dart `3.12.0`.
- Por lo tanto, hoy no es posible construir esta app dentro de un contenedor Docker sin bajar esa restricción de versión en `pubspec.yaml` (cambio que no se hizo por estar fuera del alcance pedido).

Para desarrollo/pruebas de esta capa, se sigue usando el flujo nativo de Flutter (`flutter run` / `flutter build apk` / `flutter build web` fuera de Docker) con el SDK de Flutter instalado localmente en la versión que exige el proyecto. El stack de `docker-compose.yml` en la raíz del monorepo cubre únicamente **backend** y **frontend**.
