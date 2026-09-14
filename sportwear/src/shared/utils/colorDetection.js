// Detección automática del color (o colores) de una prenda a partir de una
// imagen, procesada localmente en el navegador (canvas + k-means), sin
// depender de ningún servicio externo.
//
// Estrategia:
// 1. Dibuja la imagen reducida en un canvas oculto (rápido y suficiente para
//    detectar color dominante).
// 2. Estima el color del fondo muestreando el borde de la imagen y descarta
//    los píxeles parecidos a ese fondo — así solo se analiza la prenda.
// 3. Agrupa los píxeles restantes con k-means para encontrar los colores más
//    representativos, fusiona clusters casi idénticos y descarta los que
//    ocupan una porción insignificante (ruido / píxeles aislados).
// 4. Empareja cada color detectado con el color más cercano del catálogo de
//    la tienda (por distancia en RGB), ya que las variantes del producto
//    solo pueden usar colores registrados en ese catálogo.

const TAMANO_MUESTRA = 120; // lado máximo del canvas de análisis, en px
const MARGEN_BORDE = 0.08;  // % del ancho/alto usado para estimar el fondo
const UMBRAL_FONDO = 28;    // distancia RGB bajo la cual un píxel se considera "fondo"
const K_CLUSTERS = 5;
const ITERACIONES_KMEANS = 8;
const UMBRAL_FUSION = 22;   // clusters más cercanos que esto se fusionan
const PORCENTAJE_MINIMO = 0.06; // clusters por debajo de esto se descartan como ruido
const PORCENTAJE_MIN_BICOLOR = 0.3; // el 2do color necesita al menos esto para contar como "mitad y mitad"
const DIFERENCIA_BICOLOR = 0.18;    // diferencia máxima entre el 1er y 2do color para considerarlos parejos

function distanciaRGB(a, b) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbAHex({ r, g, b }) {
  const c = n => n.toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toLowerCase();
}

function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

function obtenerPixeles(img) {
  const escala = Math.min(1, TAMANO_MUESTRA / Math.max(img.width, img.height));
  const ancho = Math.max(1, Math.round(img.width * escala));
  const alto = Math.max(1, Math.round(img.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, ancho, alto);

  const { data } = ctx.getImageData(0, 0, ancho, alto);
  const pixeles = [];
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 128) continue; // ignora transparencia (PNG con fondo removido)
    pixeles.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  return { pixeles, ancho, alto };
}

// Estima el color de fondo promediando un anillo de píxeles en el borde de
// la imagen — asume que la fotografía tiene la prenda centrada y el fondo
// ocupando las orillas, un supuesto razonable para fotos de catálogo.
function estimarFondo(pixeles, ancho, alto) {
  const margenX = Math.max(1, Math.round(ancho * MARGEN_BORDE));
  const margenY = Math.max(1, Math.round(alto * MARGEN_BORDE));
  let sumaR = 0, sumaG = 0, sumaB = 0, n = 0;

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const esBorde = x < margenX || x >= ancho - margenX || y < margenY || y >= alto - margenY;
      if (!esBorde) continue;
      const idx = y * ancho + x;
      const p = pixeles[idx];
      if (!p) continue;
      sumaR += p.r; sumaG += p.g; sumaB += p.b; n++;
    }
  }
  if (n === 0) return null;
  return { r: Math.round(sumaR / n), g: Math.round(sumaG / n), b: Math.round(sumaB / n) };
}

function kMeans(pixeles, k) {
  if (pixeles.length === 0) return [];
  const n = pixeles.length;
  const kEfectivo = Math.min(k, n);

  // Inicializa centroides tomando muestras espaciadas del arreglo (evita
  // depender de Math.random para que el resultado sea más estable).
  const centroides = [];
  for (let i = 0; i < kEfectivo; i++) {
    centroides.push({ ...pixeles[Math.floor((i * n) / kEfectivo)] });
  }

  let asignaciones = new Array(n).fill(0);

  for (let iter = 0; iter < ITERACIONES_KMEANS; iter++) {
    for (let i = 0; i < n; i++) {
      let mejor = 0, mejorDist = Infinity;
      for (let c = 0; c < centroides.length; c++) {
        const d = distanciaRGB(pixeles[i], centroides[c]);
        if (d < mejorDist) { mejorDist = d; mejor = c; }
      }
      asignaciones[i] = mejor;
    }

    const sumas = centroides.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (let i = 0; i < n; i++) {
      const s = sumas[asignaciones[i]];
      s.r += pixeles[i].r; s.g += pixeles[i].g; s.b += pixeles[i].b; s.n++;
    }
    for (let c = 0; c < centroides.length; c++) {
      if (sumas[c].n > 0) {
        centroides[c] = {
          r: Math.round(sumas[c].r / sumas[c].n),
          g: Math.round(sumas[c].g / sumas[c].n),
          b: Math.round(sumas[c].b / sumas[c].n),
        };
      }
    }
  }

  const conteos = new Array(centroides.length).fill(0);
  for (let i = 0; i < n; i++) conteos[asignaciones[i]]++;

  return centroides.map((c, i) => ({ ...c, cantidad: conteos[i] }));
}

function fusionarClusters(clusters) {
  const resultado = [];
  const usados = new Array(clusters.length).fill(false);
  const ordenados = [...clusters].sort((a, b) => b.cantidad - a.cantidad);

  for (let i = 0; i < ordenados.length; i++) {
    if (usados[i]) continue;
    let acumulado = { ...ordenados[i] };
    usados[i] = true;
    for (let j = i + 1; j < ordenados.length; j++) {
      if (usados[j]) continue;
      if (distanciaRGB(ordenados[i], ordenados[j]) < UMBRAL_FUSION) {
        acumulado.cantidad += ordenados[j].cantidad;
        usados[j] = true;
      }
    }
    resultado.push(acumulado);
  }
  return resultado;
}

/**
 * Analiza la imagen de una prenda y devuelve sus colores dominantes,
 * ignorando el fondo de la fotografía. No toma en cuenta piel, cabello ni
 * otros objetos de forma explícita — asume que ocupan una porción menor de
 * la imagen frente a la prenda, igual que el fondo.
 *
 * @returns {Promise<Array<{r:number,g:number,b:number,hex:string,porcentaje:number}>>}
 *   Ordenado de mayor a menor porcentaje. El primero es el color principal.
 */
export async function detectarColoresDeImagen(file) {
  const img = await cargarImagen(file);
  const { pixeles, ancho, alto } = obtenerPixeles(img);
  if (pixeles.length === 0) return [];

  const fondo = estimarFondo(pixeles, ancho, alto);
  let pixelesPrenda = fondo
    ? pixeles.filter(p => distanciaRGB(p, fondo) >= UMBRAL_FONDO)
    : pixeles;

  // Si casi todo se descartó (fondo mal estimado o prenda del mismo color
  // del fondo), se prefiere analizar todos los píxeles antes que fallar.
  if (pixelesPrenda.length < pixeles.length * 0.05) pixelesPrenda = pixeles;

  const clusters = fusionarClusters(kMeans(pixelesPrenda, K_CLUSTERS));
  const total = pixelesPrenda.length;

  return clusters
    .map(c => ({ r: c.r, g: c.g, b: c.b, hex: rgbAHex(c), porcentaje: c.cantidad / total }))
    .filter(c => c.porcentaje >= PORCENTAJE_MINIMO)
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

/**
 * Empareja los colores detectados con el catálogo de colores de la tienda
 * (las variantes de producto solo pueden usar colores ya registrados).
 * Colores detectados muy parecidos que caen sobre el mismo color del
 * catálogo se combinan en una sola coincidencia.
 *
 * @param {Array} coloresDetectados  resultado de detectarColoresDeImagen()
 * @param {Array} catalogo           colores de la tienda [{id_color, nombre, codigo_hex}]
 * Cuando los dos colores más presentes ocupan partes similares de la prenda
 * (p. ej. una camiseta mitad negra, mitad blanca) no tiene sentido forzar uno
 * solo como "el" principal — `principales` trae ambos en ese caso.
 *
 * @returns {{ principales: object[], secundarios: object[], todos: object[] }}
 */
export function emparejarConCatalogo(coloresDetectados, catalogo) {
  if (!catalogo || catalogo.length === 0 || coloresDetectados.length === 0) {
    return { principales: [], secundarios: [], todos: [] };
  }

  const catalogoRGB = catalogo
    .filter(c => c.codigo_hex)
    .map(c => {
      const hex = c.codigo_hex.replace("#", "");
      return {
        ...c,
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    });

  const porId = new Map();
  for (const detectado of coloresDetectados) {
    let mejor = null, mejorDist = Infinity;
    for (const candidato of catalogoRGB) {
      const d = distanciaRGB(detectado, candidato);
      if (d < mejorDist) { mejorDist = d; mejor = candidato; }
    }
    if (!mejor) continue;
    const previo = porId.get(mejor.id_color);
    if (previo) {
      previo.porcentaje += detectado.porcentaje;
    } else {
      porId.set(mejor.id_color, {
        id_color: mejor.id_color,
        nombre: mejor.nombre,
        codigo_hex: mejor.codigo_hex,
        porcentaje: detectado.porcentaje,
      });
    }
  }

  const todos = [...porId.values()].sort((a, b) => b.porcentaje - a.porcentaje);

  // "Mitad y mitad": los dos colores con más presencia están a menos de
  // DIFERENCIA_BICOLOR uno del otro y ambos superan PORCENTAJE_MIN_BICOLOR —
  // ninguno domina claramente sobre el otro, así que se tratan como dos
  // colores principales en vez de forzar uno como secundario.
  const [primero, segundo] = todos;
  const esBicolor = !!(primero && segundo
    && segundo.porcentaje >= PORCENTAJE_MIN_BICOLOR
    && (primero.porcentaje - segundo.porcentaje) <= DIFERENCIA_BICOLOR);

  const principales = primero ? (esBicolor ? [primero, segundo] : [primero]) : [];
  return {
    principales,
    secundarios: todos.filter(c => !principales.includes(c)),
    todos,
    esBicolor,
  };
}
