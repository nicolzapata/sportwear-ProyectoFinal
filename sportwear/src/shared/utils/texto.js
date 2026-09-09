// Utilidades genéricas de formateo de texto, compartidas entre features.

export const getInitials = (nombre) => {
  if (!nombre) return "?";
  return nombre.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
};

// Paleta de fondos pastel para avatares de iniciales — el color se elige de
// forma determinística a partir del id, para que el mismo registro siempre
// se vea con el mismo color.
const AVATAR_PALETTE = ['#f4ddd0', '#dcead9', '#e6e6e6', '#f7dbe6', '#dbe8f5', '#efe3d0'];
export const getAvatarColor = (id) => AVATAR_PALETTE[Math.abs(Number(id) || 0) % AVATAR_PALETTE.length];
