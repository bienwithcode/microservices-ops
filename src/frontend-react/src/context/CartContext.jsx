import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from './SessionContext.jsx';
import { getCart } from '../api/cart.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { sessionId } = useSession();
  const [cart, setCart] = useState(null);
  const [cartSize, setCartSize] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      const res = await getCart(sessionId);
      const items = res.data?.items || [];
      setCart(res.data);
      setCartSize(items.reduce((sum, item) => sum + (item.quantity || 0), 0));
    } catch {
      setCart(null);
      setCartSize(0);
    }
  }, [sessionId]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{ cart, cartSize, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
