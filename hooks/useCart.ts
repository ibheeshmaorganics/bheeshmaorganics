'use client';

import { useCallback, useEffect, useState } from 'react';
import { readCart, writeCart, clearCart, type CartItem } from '@/lib/cart';

type ProductVariant = { size: string; price: number };
type ProductRecord = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  discount?: number;
  quantity?: number;
  unit?: string;
  images?: string[];
  imageUrl?: string;
  variants?: ProductVariant[];
};

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>(() => readCart());

  const getBaseProductId = (rawId: string) => rawId.slice(0, 36);

  const getVariantSizeFromCartId = (rawId: string): string | null => {
    if (!rawId || rawId.length <= 37) return null;
    return rawId.slice(37);
  };

  const getLatestPriceForItem = (product: ProductRecord, cartId: string) => {
    const defaultSize = `${product.quantity || 1} ${product.unit || 'kg'}`;
    const selectedSize = getVariantSizeFromCartId(cartId) || defaultSize;
    const variants = [
      { size: defaultSize, price: Number(product.price) || 0 },
      ...((product.variants || []).map((variant) => ({
        size: variant.size,
        price: Number(variant.price) || 0,
      }))),
    ];
    const matchedVariant = variants.find((variant) => variant.size === selectedSize) || variants[0];
    const basePrice = Number(matchedVariant.price) || 0;
    const discount = Number(product.discount) || 0;
    return discount > 0 ? Math.round(basePrice - (basePrice * discount / 100)) : basePrice;
  };

  const syncWithLatestProducts = useCallback(async (sourceItems: CartItem[]) => {
    if (!sourceItems.length) return sourceItems;
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      if (!res.ok) return sourceItems;
      const data = await res.json();
      if (!data?.products || !Array.isArray(data.products)) return sourceItems;

      const productMap = new Map<string, ProductRecord>();
      (data.products as ProductRecord[]).forEach((product) => {
        const pid = String(product._id || product.id || '');
        if (pid) productMap.set(pid, product);
      });

      let changed = false;
      const normalized = sourceItems
        .map((item) => {
          const baseProductId = item.productIdOriginal
            ? String(item.productIdOriginal)
            : getBaseProductId(String(item._id || ''));
          const latestProduct = productMap.get(baseProductId);
          if (!latestProduct) {
            changed = true;
            return null;
          }

          const selectedSize = getVariantSizeFromCartId(String(item._id || ''));
          const updatedName = selectedSize ? `${latestProduct.name} - ${selectedSize}` : latestProduct.name;
          const updatedPrice = getLatestPriceForItem(latestProduct, String(item._id || ''));
          const updatedImage = latestProduct.imageUrl || (latestProduct.images && latestProduct.images[0]) || item.imageUrl || '';

          const updatedItem: CartItem = {
            ...item,
            name: updatedName,
            price: updatedPrice,
            imageUrl: updatedImage,
            images: latestProduct.images || item.images || [],
          };

          if (updatedItem.name !== item.name || updatedItem.price !== item.price || updatedItem.imageUrl !== item.imageUrl) {
            changed = true;
          }
          return updatedItem;
        })
        .filter((item): item is CartItem => Boolean(item))
        .filter((item) => (Number(item.price) || 0) > 0);

      if (changed) {
        setCart(normalized);
        writeCart(normalized);
      }

      return normalized;
    } catch {
      return sourceItems;
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      const latestLocal = readCart();
      setCart(latestLocal);
      void syncWithLatestProducts(latestLocal);
    };

    const interval = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [syncWithLatestProducts]);

  const syncCart = useCallback((items: CartItem[]) => {
    setCart(items);
    writeCart(items);
    void syncWithLatestProducts(items);
  }, [syncWithLatestProducts]);

  const clearCartState = useCallback(() => {
    setCart([]);
    clearCart();
  }, []);

  const refreshCartWithLatest = useCallback(async () => {
    const latestLocal = readCart();
    setCart(latestLocal);
    return syncWithLatestProducts(latestLocal);
  }, [syncWithLatestProducts]);

  return {
    cart,
    syncCart,
    clearCartState,
    refreshCartWithLatest,
  };
}
