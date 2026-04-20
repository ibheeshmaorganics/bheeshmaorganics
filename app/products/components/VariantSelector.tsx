'use client';

import { type VariantOption } from '@/lib/product-variants';

type VariantSelectorProps = {
  variants: VariantOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  className: string;
  activeClassName: string;
};

export function VariantSelector({
  variants,
  selectedIndex,
  onSelect,
  className,
  activeClassName,
}: VariantSelectorProps) {
  return (
    <>
      {variants.map((variant, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(idx)}
          className={`${className} ${selectedIndex === idx ? activeClassName : ''}`}
          style={variants.length === 1 ? { pointerEvents: 'none' } : {}}
        >
          {variant.size}
        </button>
      ))}
    </>
  );
}
