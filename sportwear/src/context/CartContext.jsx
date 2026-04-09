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
        dispatch({ type: "LOAD_ITEMS", payload: cargarDesdeStorage(userId) });
        dispatch({ type: "SHOW_CART" });
      }
    };
    const handleLogout = () => {
      setIdUsuario(null);
      setUsuarioData(null); // ✅
      dispatch({ type: "HIDE_CART" });
    };
    window.addEventListener("user-login", handleLogin);
    window.addEventListener("user-logout", handleLogout);
    return () => {
      window.removeEventListener("user-login", handleLogin);
      window.removeEventListener("user-logout", handleLogout);
    };
  }, []);

  const itemsRef = useRef(state.items);
  useEffect(() => { itemsRef.current = state.items; }, [state.items]);

  const usuarioRef = useRef(usuarioData);
  useEffect(() => { usuarioRef.current = usuarioData; }, [usuarioData]); // ✅

  useEffect(() => {
    guardarEnStorage(state.items, idUsuario);
  }, [state.items, idUsuario]);

  // ── Guardar carrito abandonado en backend ──────────────────────────────
  const guardarCarritoAbandonado = useCallback(async (usuario) => {
    const items = itemsRef.current;
    if (!usuario || items.length === 0) return;

    // ✅ Obtener id_cliente del objeto usuario
    const id_cliente = usuario?.id_cliente || usuario?.id;

    // ✅ Si no hay id_cliente, no intentar guardar en BD (carrito anónimo)
    if (!id_cliente) return;

    const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

    try {
      await api.post("/ventas/abandonado", {
        id_cliente, // ✅ incluir en el body
        total,
        items: items.map((i) => ({
          id_producto: i.id,
          id_variante: i.id_variante ?? null,
          cantidad:    i.cantidad,
          precio:      i.precio,
        })),
      });
    } catch (err) {
      console.warn("No se pudo guardar el carrito abandonado:", err);
    }
  }, []);

  // ── Acciones ───────────────────────────────────────────────────────────
  const agregarItem        = (producto)     => dispatch({ type: "ADD_ITEM",        payload: producto });
  const eliminarItem       = (id)           => dispatch({ type: "REMOVE_ITEM",     payload: id });
  const actualizarCantidad = (id, cantidad) => dispatch({ type: "UPDATE_QUANTITY", payload: { id, cantidad } });
  const vaciarCarrito      = ()             => dispatch({ type: "CLEAR_CART" });
  const cargarItems        = (items)        => dispatch({ type: "LOAD_ITEMS",      payload: items });

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
        vaciarCarrito,
        cargarItems,
        guardarCarritoAbandonado,
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