import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/theme_toggle_button.dart';
import '../../auth/providers/auth_provider.dart';
import '../../carrito/providers/carrito_provider.dart';
import '../providers/catalogo_provider.dart';
import '../widgets/busqueda_bar.dart';
import '../widgets/catalogo_hero.dart';
import '../widgets/categorias_destacadas.dart';
import 'lista_productos_screen.dart';

/// Pantalla principal: categorías + búsqueda + grilla de productos.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    // cargar() hace notifyListeners() de inmediato (antes de su primer
    // await), y llamarlo directo aquí dispara ese notify en pleno build
    // inicial del árbol de widgets ("setState() or markNeedsBuild() called
    // during build"), lo que puede dejar la pantalla en blanco. Se difiere
    // al primer frame ya renderizado para evitarlo.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<CatalogoProvider>().cargar();
    });
  }

  Future<void> _confirmarLogout(BuildContext context) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cerrar sesión'),
        content: const Text('¿Estás segura de que quieres cerrar sesión?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cerrar sesión'),
          ),
        ],
      ),
    );
    if (confirmar == true && context.mounted) {
      context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final catalogo = context.watch<CatalogoProvider>();
    final auth = context.watch<AuthProvider>();
    final carrito = context.watch<CarritoProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('SportWear'),
        actions: [
          // Mismo lugar conceptual que en la web: ThemeToggle es lo primero
          // en "navbar-right" (Navbar.jsx / PublicNavbar.jsx), antes de
          // carrito/cuenta/logout.
          const ThemeToggleButton(),
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart_outlined),
                tooltip: 'Carrito',
                onPressed: () => context.push('/carrito'),
              ),
              if (carrito.totalItems > 0)
                Positioned(
                  right: 4,
                  top: 4,
                  child: _BadgeCarrito(cantidad: carrito.totalItems),
                ),
            ],
          ),
          // "Mis pedidos" y "Mi perfil" son solo para clientes — hoy la
          // cuenta Admin real no tiene id_cliente (viene null en el JWT), y
          // los únicos roles que existen en producción son "Admin" y
          // "Cliente" (confirmado vía GET /api/roles), así que el rol exacto
          // basta como criterio. No basta con exigirlo solo al tocar: si no
          // aplica, el ícono no debe existir en absoluto en el árbol.
          if (auth.usuario?.rol == 'Cliente')
            IconButton(
              icon: const Icon(Icons.receipt_long_outlined),
              tooltip: 'Mis pedidos',
              onPressed: () => context.push('/mis-pedidos'),
            ),
          if (auth.usuario?.rol == 'Cliente')
            IconButton(
              icon: const Icon(Icons.person_outline),
              tooltip: 'Mi perfil',
              onPressed: () => context.push('/mi-perfil'),
            ),
          // Igual criterio que "Mis pedidos", pero además exige rol Admin
          // exacto (el mismo valor que exige soloAdmin en el backend) — para
          // cualquier otro rol, incluso logueado, no debe existir en absoluto.
          if (auth.usuario?.rol == 'Admin')
            IconButton(
              icon: const Icon(Icons.admin_panel_settings_outlined),
              tooltip: 'Panel admin',
              onPressed: () => context.push('/admin'),
            ),
          if (auth.isAuthenticated)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Cerrar sesión',
              onPressed: () => _confirmarLogout(context),
            )
          else
            IconButton(
              icon: const Icon(Icons.login),
              tooltip: 'Iniciar sesión',
              onPressed: () => context.push('/login'),
            ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => context.read<CatalogoProvider>().cargar(),
          child: CustomScrollView(
            slivers: [
              // Hero (carrusel) y "Explora por categoría" solo cuando no hay
              // ningún filtro activo — mismo criterio que Catalogo.jsx
              // (!hayFiltroActivo) para CatalogoHero/CategoriasDestacadas.
              // Todo vive en el MISMO scroll que la grilla de productos (un
              // solo CustomScrollView, no un Column con Expanded aparte):
              // con el hero + categorías arriba, esa altura fija ya no cabe
              // siempre sobre una pantalla de teléfono sin desbordar.
              if (!catalogo.hayFiltroActivo) const SliverToBoxAdapter(child: CatalogoHero()),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: BusquedaBar(onChanged: catalogo.buscar),
                ),
              ),
              if (!catalogo.hayFiltroActivo)
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      CategoriasDestacadas(
                        items: catalogo.categoriasDestacadas,
                        onTap: catalogo.seleccionarCategoria,
                      ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              const ListaProductosScreen(),
            ],
          ),
        ),
      ),
    );
  }
}

class _BadgeCarrito extends StatelessWidget {
  const _BadgeCarrito({required this.cantidad});

  final int cantidad;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      constraints: const BoxConstraints(minWidth: 16),
      decoration: BoxDecoration(color: AppColors.error, borderRadius: BorderRadius.circular(999)),
      child: Text(
        cantidad > 99 ? '99+' : '$cantidad',
        textAlign: TextAlign.center,
        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
