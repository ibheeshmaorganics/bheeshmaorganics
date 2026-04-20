import { describe, expect, it } from 'vitest';
import { upsertCartItem, updateCartItemQuantity } from '../lib/cart-operations';
import { type CartItem } from '../lib/cart';

const sampleItem: CartItem = {
  _id: 'p1-100g',
  name: 'Sample Product - 100g',
  price: 100,
  quantity: 1,
};

describe('cart operations', () => {
  it('adds a new cart item if missing', () => {
    const updated = upsertCartItem([], sampleItem);
    expect(updated).toHaveLength(1);
    expect(updated[0].quantity).toBe(1);
  });

  it('increments quantity if item already exists', () => {
    const updated = upsertCartItem([sampleItem], sampleItem);
    expect(updated).toHaveLength(1);
    expect(updated[0].quantity).toBe(2);
  });

  it('removes item when quantity goes below one', () => {
    const updated = updateCartItemQuantity([sampleItem], sampleItem._id, -1);
    expect(updated).toHaveLength(0);
  });
});
