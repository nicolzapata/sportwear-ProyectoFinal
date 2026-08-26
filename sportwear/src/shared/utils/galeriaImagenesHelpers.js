export const colorInfo = (id_color, todosColores) => {
  if (!id_color) return null;
  return todosColores.find(c => String(c.id_color) === String(id_color)) || null;
};

export const contarFotos = (id_color, imagenes, imagenesLocales) => {
  const idStr = String(id_color);
  const enServidor = imagenes.filter(i => String(i.id_color) === idStr).length;
  const enLocal = imagenesLocales.filter(i => String(i.id_color) === idStr).length;
  return enServidor + enLocal;
};

// ── Agrupación de todas las imágenes (server + locales) por color ─────────
export const construirGrupos = (imagenes, imagenesLocales, todosColores) => {
  const mapa = new Map();
  const clave = (id_color) => (id_color ? String(id_color) : "sin-color");
  const asegurar = (id_color) => {
    const k = clave(id_color);
    if (!mapa.has(k)) {
      mapa.set(k, { key: k, info: id_color ? colorInfo(id_color, todosColores) : null, items: [] });
    }
    return mapa.get(k);
  };
  imagenes.forEach(img => asegurar(img.id_color).items.push({ tipo: "servidor", img }));
  imagenesLocales.forEach((img, idx) => asegurar(img.id_color).items.push({ tipo: "local", img, idx }));

  const ordenColores = todosColores.map(c => String(c.id_color));
  return [...mapa.values()].sort((a, b) => {
    if (a.key === "sin-color") return 1;
    if (b.key === "sin-color") return -1;
    return ordenColores.indexOf(a.key) - ordenColores.indexOf(b.key);
  });
};
