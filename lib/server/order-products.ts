type ProductSummary = {
  id: string;
  name: string;
};

type ProductMap = Record<string, { _id: string; id: string; name: string }>;

type RawOrderProduct = {
  productId?: string;
  name?: string;
  quantity?: number;
  price?: number;
  image?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createProductMap(products: ProductSummary[]): ProductMap {
  return products.reduce<ProductMap>((acc, p) => {
    acc[p.id] = { ...p, _id: p.id };
    return acc;
  }, {});
}

export function normalizeOrderProducts(rawProducts: unknown, productMap: ProductMap) {
  if (!Array.isArray(rawProducts)) {
    return [];
  }

  return rawProducts.map((item) => {
    const op = (isRecord(item) ? item : {}) as RawOrderProduct;
    const rawProductId = op.productId ? String(op.productId) : '';
    const baseId = rawProductId.slice(0, 36);
    const variantSuffix = rawProductId.length > 36 ? ` (${rawProductId.slice(37)})` : '';
    const mappedProduct = productMap[baseId];

    return {
      ...op,
      productId: mappedProduct
        ? { ...mappedProduct, name: mappedProduct.name + variantSuffix }
        : { _id: rawProductId, name: op.name || 'Unknown Product' },
    };
  });
}
