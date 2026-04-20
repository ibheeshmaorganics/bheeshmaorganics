export type VariantOption = {
  size: string;
  price: number;
};

export type VariantProduct = {
  _id: string;
  name: string;
  price: number;
  discount?: number;
  quantity?: number;
  unit?: string;
  variants?: VariantOption[];
};

export function getAllVariants(product: VariantProduct): VariantOption[] {
  const baseVariant = {
    size: `${product.quantity || 1} ${product.unit || 'kg'}`,
    price: Number(product.price),
  };

  if (!product.variants || product.variants.length === 0) {
    return [baseVariant];
  }

  return [baseVariant, ...product.variants.map((variant) => ({ ...variant, price: Number(variant.price) }))];
}

export function getVariantPrice(basePrice: number, discount?: number): number {
  if (!discount || discount <= 0) {
    return basePrice;
  }
  return Math.round(basePrice - (basePrice * discount / 100));
}
