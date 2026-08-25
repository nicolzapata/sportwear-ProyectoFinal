// src/context/CartContext.jsx
import { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from "react";
import api from "../services/api";

const CartContext = createContext();

// ── Helpers de persistencia ────────────────────────────────────────────────
const STORAGE_KEY = "carrito_items";

const getStorageKey = (idUsuario) => idUsuario ? `carrito_${idUsuario}` : STORAGE_KEY;

const cargarDesdeStorage = (idUsuario = null) => {
  try {
    const key = getStorageKey(idUsuario);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const guardarEnStorage = (items, idUsuario = null) => {
  try {
    const key = getStorageKey(idUsuario);
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
};

// ── NUEVO: fusiona el carrito anónimo (lo que se agregó antes de loguearse)
// con el carrito ya guardado a nombre del usuario que inicia sesión. Si el
// mismo producto/variante aparece en ambos, se SUMAN las cantidades en vez de
// perder uno de los dos — antes, iniciar sesión simplemente reemplazaba el
// carrito anónimo por el guardado, y lo que acababas de agregar se perdía. ──
const fusionarItems = (base, entrantes) => {
  const resultado = [...base];
  entrantes.forEach((item) => {
    const idx = resultado.findIndex((i) =>
      item.id_variante ? i.id_variante === item.id_variante : i.id === item.id
    );
    if (idx >= 0) {
      resultado[idx] = { ...resultado[idx], cantidad: resultado[idx].cantidad + item.cantidad };
    } else {
      resultado.push(item);
    }
  });
  return resultado;
};

// ── Reducer ────────────────────────────────────────────────────────────────
const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const nuevaCantidad = action.payload.cantidad || 1;

      const existe = state.items.find((i) =>
        action.payload.id_variante
          ? i.id_variante === action.payload.id_variante
          : i.id === action.payload.id
      );

      if (existe) {
        return {
          ...state,
          items: state.items.map((i) => {
            const match = action.payload.id_variante
              ? i.id_variante === action.payload.id_variante
              : i.id === action.payload.id;
            return match ? { ...i, cantidad: i.cantidad + nuevaCantidad } : i;
          }),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, cantidad: nuevaCantidad }],
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) =>
          i.id_variante ? i.id_variante !== action.payload : i.id !== action.payload
        ),
      };

    case "UPDATE_QUANTITY": {
      const { id, cantidad } = action.payload;
      if (cantidad <= 0)
        return {
          ...state,
          items: state.items.filter((i) =>
            i.id_variante ? i.id_variante !== id : i.id !== id
          ),
        };
      return {
        ...state,
        items: state.items.map((i) => {
          const match = i.id_variante ? i.id_variante === id : i.id === id;
          return match ? { ...i, cantidad } : i;
        }),
      };
    }

    case "CLEAR_CART":
      return { ...state, items: [], oculto: false };

    case "LOAD_ITEMS":
      return { ...state, items: action.payload };

    // ── NUEVO: cambia la variante (talla/color) de un ítem ya en el carrito,
    // sin quitarlo ni volver a agregarlo — se usa cuando el cliente elige una
    // sugerencia de alternativa por falta de stock en el checkout. ──
    case "REPLACE_VARIANT": {
      const { idViejo, nuevaVariante } = action.payload;
      return {
        ...state,
        items: state.items.map((i) => {
          const match = i.id_variante ? i.id_variante === idViejo : i.id === idViejo;
          if (!match) return i;
          return {
            ...i,
            id_variante: nuevaVariante.id_variante,
            talla:       nuevaVariante.talla,
            color:       nuevaVariante.color,
            stock:       nuevaVariante.stock,
          };
        }),
      };
    }

    case "HIDE_CART":
      return { ...state, oculto: true };

    case "SHOW_CART":
      return { ...state, oculto: false };

    default:
      return state;
  }
};

// ── Provider ───────────────────────────────────────────────────────────────
export const CartProvider = ({ children }) => {
  const [idUsuario, setIdUsuario] = useState(null);
  const [usuarioData, setUsuarioData] = useState(null); // ✅ guardar datos completos del usuario
  const [state, dispatch] = useReducer(cartReducer, { items: [], oculto: false });

  // itemsRef se declara ANTES del efecto de login/logout para que este pueda
  // leer el carrito anónimo actual (itemsRef.current) en el momento exacto en
  // que el usuario inicia sesión, sin quedarse con el valor inicial (vacío)
  // por culpa del closure del efecto que solo corre una vez al montar.
  const itemsRef = useRef(state.items);
  useEffect(() => { itemsRef.current = state.items; }, [state.items]);

  useEffect(() => {
    const savedUser = localStorage.getItem("sz_usuario");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        const userId = user?.id_usuario || user?.id;
        if (userId) {
          setIdUsuario(userId);
          setUsuarioData(user); // ✅
          dispatch({ type: "LOAD_ITEMS", payload: cargarDesdeStorage(userId) });
          dispatch({ type: "SHOW_CART" });
        }
      } catch {
        dispatch({ type: "LOAD_ITEMS", payload: cargarDesdeStorage(null) });
      }
    } else {
      dispatch({ type: "LOAD_ITEMS", payload: cargarDesdeStorage(null) });
    }
  }, []);

  useEffect(() => {
    const handleLogin = (e) => {
      const user = e.detail;
      const userId = user?.id_usuario || user?.id;
      setIdUsuario(userId);
      setUsuarioData(user); // ✅
      if (userId) {
        // ── CORREGIDO: antes esto reemplazaba el carrito anónimo por el
        // guardado del usuario, perdiendo lo que se acababa de agregar sin
        // sesión. Ahora se fusionan ambos, sumando cantidades si coincide
        // el mismo producto/variante. ──
        const carritoAnonimo = itemsRef.current;
        const carritoUsuario = cargarDesdeStorage(userId);
        const fusionado = fusionarItems(carritoUsuario, carritoAnonimo);
        dispatch({ type: "LOAD_ITEMS", payload: fusionado });
        dispatch({ type: "SHOW_CART" });
      }
    };
    const handleLogout = () => {
      setIdUsuario(null);
      setUsuarioData(null); // ✅
      // ── CORREGIDO: antes esto ocultaba el carrito (HIDE_CART) al cerrar
      // sesión — era un remanente de cuando el carrito exigía login para
      // verse. Ahora el carrito debe seguir visible y usable sin sesión, así
      // que ya no se oculta al cerrar sesión.
    };
    window.addEventListener("user-login", handleLogin);
    window.addEventListener("user-logout", handleLogout);
    return () => {
      window.removeEventListener("user-login", handleLogin);
      window.removeEventListener("user-logout", handleLogout);
    };
  }, []);

  const usuarioRef = useRef(usuarioData);
  useEffect(() => { usuarioRef.current = usuarioData; }, [usuarioData]); // ✅

  useEffect(() => {
    guardarEnStorage(state.items, idUsuario);
  }, [state.items, idUsuario]);

  // ── El carrito ya se guarda automáticamente en localStorage ───────────────
  // Cuando el usuario cierra sesión, el useEffect arriba guarda en localStorage.
  // No se guarda en la base de datos (tabla Ventas) hasta que el pedido esté confirmado.

  // ── Acciones ───────────────────────────────────────────────────────────
  const agregarItem        = (producto)     => dispatch({ type: "ADD_ITEM",        payload: producto });
  const eliminarItem       = (id)           => dispatch({ type: "REMOVE_ITEM",     payload: id });
  const actualizarCantidad = (id, cantidad) => dispatch({ type: "UPDATE_QUANTITY", payload: { id, cantidad } });
  const vaciarCarrito      = ()             => dispatch({ type: "CLEAR_CART" });
  const cargarItems        = (items)        => dispatch({ type: "LOAD_ITEMS",      payload: items });
  // ── NUEVO: cambiar la variante de un ítem (usado por las sugerencias de alternativas sin stock) ──
  const cambiarVariante    = (idViejo, nuevaVariante) => dispatch({ type: "REPLACE_VARIANT", payload: { idViejo, nuevaVariante } });

  const total      = state.items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const totalItems = state.items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <CartContext.Provider value={{
        items:               state.items,
        total,
        totalItems,
        oculto:              state.oculto,
        agregarItem,
        agregarAlCarrito:    agregarItem,
        eliminarItem,
        actualizarCantidad,
        cambiarVariante,
        vaciarCarrito,
        cargarItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
};