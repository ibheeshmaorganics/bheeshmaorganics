import { describe, expect, it } from 'vitest';
import { calculateOnlineDiscount, calculatePayableTotal } from '../lib/order-pricing';

describe('order pricing', () => {
  it('applies 10 percent discount for Razorpay', () => {
    expect(calculateOnlineDiscount(1000, 'Razorpay')).toBe(100);
    expect(calculatePayableTotal(1000, 'Razorpay')).toBe(900);
  });

  it('does not apply online discount for Cash', () => {
    expect(calculateOnlineDiscount(1000, 'Cash')).toBe(0);
    expect(calculatePayableTotal(1000, 'Cash')).toBe(1000);
  });
});
