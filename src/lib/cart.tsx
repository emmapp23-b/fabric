"use client";

/**
 * Cart + favorites store, persisted to localStorage per signed-in user.
 * Cart lines are measured in YARDS (a full piece = 6 yards minimum).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { MIN_YARDS, type Product } from "./data";

export interface CartLine {
  id: string;
  name: string;
  spec: string;
  pricePerYard: number;
  img: string;
  yards: number;
}

interface ShopCtx {
  cart: CartLine[];
  cartCount: number; // total yards
  cartTotal: number;
  addToCart: (p: Product, yards?: number) => void;
  setYards: (id: string, yards: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}

const Ctx = createContext<ShopCtx | null>(null);

function storageKey(uid: string | undefined): string {
  return `fv-shop-${uid ?? "guest"}`;
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const key = storageKey(user?.uid);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { cart?: CartLine[]; favorites?: string[] };
        setCart(Array.isArray(parsed.cart) ? parsed.cart : []);
        setFavorites(Array.isArray(parsed.favorites) ? parsed.favorites : []);
        return;
      }
    } catch {
      /* corrupted storage → start clean */
    }
    setCart([]);
    setFavorites([]);
  }, [key]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ cart, favorites }));
    } catch {
      /* storage full/blocked — non-fatal */
    }
  }, [key, cart, favorites]);

  const addToCart = useCallback((p: Product, yards = MIN_YARDS) => {
    const y = Math.max(MIN_YARDS, Math.round(yards));
    setCart((prev) => {
      const found = prev.find((l) => l.id === p.id);
      if (found) {
        // Adding the same fabric again increases its yardage.
        return prev.map((l) => (l.id === p.id ? { ...l, yards: l.yards + y } : l));
      }
      return [
        ...prev,
        { id: p.id, name: p.name, spec: p.spec, pricePerYard: p.price, img: p.img, yards: y },
      ];
    });
  }, []);

  const setYards = useCallback((id: string, yards: number) => {
    setCart((prev) =>
      yards < MIN_YARDS
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, yards: Math.round(yards) } : l)),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.yards, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((n, l) => n + l.yards * l.pricePerYard, 0),
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      cartCount,
      cartTotal,
      addToCart,
      setYards,
      removeFromCart,
      clearCart,
      favorites,
      isFavorite,
      toggleFavorite,
    }),
    [cart, cartCount, cartTotal, addToCart, setYards, removeFromCart, clearCart, favorites, isFavorite, toggleFavorite],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShop must be used inside <ShopProvider>");
  return ctx;
}
