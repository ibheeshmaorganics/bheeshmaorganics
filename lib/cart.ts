export const CART_STORAGE_KEY = 'bheeshma_cart';
export const CART_UPDATED_EVENT = 'bheeshma-cart-updated';

export type CartItem = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  images?: string[];
  [key: string]: unknown;
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function notifyCartUpdated(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function readCart(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  notifyCartUpdated();
}

export function clearCart(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(CART_STORAGE_KEY);
  notifyCartUpdated();
}

export function getCartCount(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
}
