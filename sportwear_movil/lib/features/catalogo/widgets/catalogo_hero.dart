import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/imagen_hero.dart';
import '../services/catalogo_service.dart';

/// Carrusel superior del catálogo — equivalente a CatalogoHero.jsx: fotos
/// reales subidas desde Catálogo admin → Contenido del inicio
/// (GET /api/imagenes?tipo=Home&id=1), con el mismo fallback (degradado +
/// título "DVNA" + subtítulo) cuando todavía no hay ninguna. Se carga sola,
/// independiente de CatalogoProvider — mismo criterio que en la web, donde
/// CatalogoHero maneja su propio estado sin depender de Catalogo.jsx.
class CatalogoHero extends StatefulWidget {
  const CatalogoHero({super.key});

  @override
  State<CatalogoHero> createState() => _CatalogoHeroState();
}

class _CatalogoHeroState extends State<CatalogoHero> {
  late Future<List<ImagenHero>> _future;
  int _indice = 0;
  final _controller = CarouselSliderController();

  @override
  void initState() {
    super.initState();
    _future = context.read<CatalogoService>().getImagenesHero();
  }

  double _altura(BuildContext context) {
    // Mismo criterio que "min(64vh, 520px)" de la web (breakpoint móvil de
    // Catalogo.hero.css): proporcional al alto real de pantalla, no un
    // píxel fijo, con un techo para que no se vea desmedido en un tablet ni
    // deje muy poco espacio a la grilla de productos debajo.
    final altoPantalla = MediaQuery.sizeOf(context).height;
    return (altoPantalla * 0.4).clamp(220.0, 380.0);
  }

  @override
  Widget build(BuildContext context) {
    final altura = _altura(context);
    return FutureBuilder<List<ImagenHero>>(
      future: _future,
      builder: (context, snapshot) {
        final fotos = snapshot.data ?? const <ImagenHero>[];
        if (fotos.isEmpty) {
          return _HeroFallback(altura: altura);
        }
        return _HeroConFotos(
          altura: altura,
          fotos: fotos,
          indice: _indice,
          controller: _controller,
          onPageChanged: (i) => setState(() => _indice = i),
        );
      },
    );
  }
}

class _HeroConFotos extends StatelessWidget {
  const _HeroConFotos({
    required this.altura,
    required this.fotos,
    required this.indice,
    required this.controller,
    required this.onPageChanged,
  });

  final double altura;
  final List<ImagenHero> fotos;
  final int indice;
  final CarouselSliderController controller;
  final ValueChanged<int> onPageChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: altura,
      child: Stack(
        fit: StackFit.expand,
        children: [
          CarouselSlider(
            carouselController: controller,
            options: CarouselOptions(
              height: altura,
              viewportFraction: 1,
              autoPlay: fotos.length > 1,
              autoPlayInterval: const Duration(seconds: 6),
              onPageChanged: (i, _) => onPageChanged(i),
            ),
            items: fotos.map((foto) {
              return Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: foto.url,
                    fit: BoxFit.cover,
                    alignment: foto.alignment,
                    placeholder: (context, url) => const ColoredBox(color: AppColors.heroBackground),
                    errorWidget: (context, url, error) => const ColoredBox(color: AppColors.heroBackground),
                  ),
                  // Mismo degradado que .nov-hero-con-foto::before, para que
                  // el título/subtítulo blanco siga siendo legible sobre
                  // cualquier foto.
                  DecoratedBox(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0x59000000), Color(0xD1000000)],
                      ),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
          const _HeroTexto(),
          if (fotos.length > 1) ...[
            Positioned(
              left: 12,
              top: 0,
              bottom: 0,
              child: Center(
                child: _FlechaHero(
                  icono: Icons.chevron_left,
                  onTap: () => controller.previousPage(),
                ),
              ),
            ),
            Positioned(
              right: 12,
              top: 0,
              bottom: 0,
              child: Center(
                child: _FlechaHero(
                  icono: Icons.chevron_right,
                  onTap: () => controller.nextPage(),
                ),
              ),
            ),
            Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(fotos.length, (i) {
                  final activo = i == indice;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: activo ? 20 : 7,
                    height: 7,
                    decoration: BoxDecoration(
                      color: activo ? Colors.white : Colors.white.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HeroFallback extends StatelessWidget {
  const _HeroFallback({required this.altura});

  final double altura;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: altura,
      child: const ColoredBox(
        color: AppColors.heroBackground,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Mismo trío de círculos degradados que .nov-hero-circle
            // (c1/c2/c3), sin la animación flotante — decorativo, no aporta
            // información, y así se evita un AnimationController de más.
            Positioned(top: -80, right: -60, child: _CirculoDecorativo(diametro: 260, color: AppColors.heroAccent)),
            Positioned(bottom: 40, left: 20, child: _CirculoDecorativo(diametro: 140, color: Colors.white)),
            _HeroTexto(),
          ],
        ),
      ),
    );
  }
}

class _CirculoDecorativo extends StatelessWidget {
  const _CirculoDecorativo({required this.diametro, required this.color});

  final double diametro;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Opacity(
        opacity: 0.12,
        child: Container(
          width: diametro,
          height: diametro,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
          ),
        ),
      ),
    );
  }
}

/// Título "DVNA" + subtítulo — igual en el fallback y encima de las fotos
/// reales (mismo texto fijo que .nov-hero-content en la web).
class _HeroTexto extends StatelessWidget {
  const _HeroTexto();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DVNA',
            style: GoogleFonts.playfairDisplay(
              fontSize: 44,
              fontWeight: FontWeight.bold,
              fontStyle: FontStyle.italic,
              color: AppColors.heroAccent,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Ropa deportiva femenina diseñada para tu estilo y comodidad. '
            'Calidad, tendencia y confianza en cada prenda.',
            style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.5, fontWeight: FontWeight.w300),
          ),
        ],
      ),
    );
  }
}

class _FlechaHero extends StatelessWidget {
  const _FlechaHero({required this.icono, required this.onTap});

  final IconData icono;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.4),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(icono, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}
