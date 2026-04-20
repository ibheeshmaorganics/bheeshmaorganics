import { type CartItem } from '@/lib/cart';

export function upsertCartItem(cart: CartItem[], nextItem: CartItem): CartItem[] {
  const existingIdx = cart.findIndex((item) => item._id === nextItem._id);
  if (existingIdx === -1) {
    return [...cart, nextItem];
  }

  return cart.map((item, idx) =>
    idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
  );
}

export function updateCartItemQuantity(cart: CartItem[], cartId: string, delta: number): CartItem[] {
  const existingIdx = cart.findIndex((item) => item._id === cartId);
  if (existingIdx === -1) {
    return cart;
  }

  return cart
    .map((item, idx) =>
      idx === existingIdx ? { ...item, quantity: item.quantity + delta } : item
    )
    .filter((item) => item.quantity > 0);
}
