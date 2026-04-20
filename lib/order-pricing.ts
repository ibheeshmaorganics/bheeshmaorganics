export function calculateOnlineDiscount(subtotalAmount: number, paymentMethod: string): number {
  if (paymentMethod !== 'Razorpay') {
    return 0;
  }
  return Math.round(subtotalAmount * 0.10);
}

export function calculatePayableTotal(subtotalAmount: number, paymentMethod: string): number {
  const discount = calculateOnlineDiscount(subtotalAmount, paymentMethod);
  const codConvenienceFee = paymentMethod === 'Cash' ? 50 : 0;
  return Math.max(0, subtotalAmount - discount + codConvenienceFee);
}
