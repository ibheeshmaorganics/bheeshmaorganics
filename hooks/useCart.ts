'use client';

import { useEffect, useState } from 'react';
import { readCart, writeCart, clearCart, type CartItem } from '@/lib/cart';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(readCart());
  }, []);

  const syncCart = (items: CartItem[]) => {
    setCart(items);
    writeCart(items);
  };

  const clearCartState = () => {
    setCart([]);
    clearCart();
  };

  return {
    cart,
    syncCart,
    clearCartState,
  };
}
