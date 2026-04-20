'use client';

type QuantityStepperProps = {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  containerStyle?: React.CSSProperties;
  decrementButtonStyle?: React.CSSProperties;
  incrementButtonStyle?: React.CSSProperties;
  quantityStyle?: React.CSSProperties;
  containerClassName?: string;
  decrementButtonClassName?: string;
  incrementButtonClassName?: string;
  quantityClassName?: string;
};

export function QuantityStepper({
  quantity,
  onDecrement,
  onIncrement,
  containerStyle,
  decrementButtonStyle,
  incrementButtonStyle,
  quantityStyle,
  containerClassName,
  decrementButtonClassName,
  incrementButtonClassName,
  quantityClassName,
}: QuantityStepperProps) {
  return (
    <div className={containerClassName} style={containerStyle}>
      <button onClick={onDecrement} className={decrementButtonClassName} style={decrementButtonStyle}>
        -
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <span className={quantityClassName} style={quantityStyle}>{quantity}</span>
      </div>
      <button onClick={onIncrement} className={incrementButtonClassName} style={incrementButtonStyle}>
        +
      </button>
    </div>
  );
}
