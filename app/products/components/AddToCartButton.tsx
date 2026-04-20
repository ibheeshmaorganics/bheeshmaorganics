'use client';

type AddToCartButtonProps = {
  inStock: boolean;
  onAdd: () => void;
  className?: string;
  style?: React.CSSProperties;
  outOfStockClassName?: string;
  outOfStockStyle?: React.CSSProperties;
  label?: string;
  outOfStockLabel?: string;
};

export function AddToCartButton({
  inStock,
  onAdd,
  className,
  style,
  outOfStockClassName,
  outOfStockStyle,
  label = 'Add to Cart',
  outOfStockLabel = 'Out of Stock',
}: AddToCartButtonProps) {
  if (!inStock) {
    return (
      <button disabled className={outOfStockClassName || className} style={outOfStockStyle || style}>
        {outOfStockLabel}
      </button>
    );
  }

  return (
    <button onClick={onAdd} className={className} style={style}>
      {label}
    </button>
  );
}
