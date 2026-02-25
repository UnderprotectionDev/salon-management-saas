"use client";

type StockIndicatorBarProps = {
  stockQuantity: number;
  lowStockThreshold?: number;
  className?: string;
};

export function StockIndicatorBar({
  stockQuantity,
  lowStockThreshold,
  className,
}: StockIndicatorBarProps) {
  const qty = Math.max(0, stockQuantity);

  const color =
    qty === 0
      ? "bg-destructive"
      : lowStockThreshold !== undefined && lowStockThreshold > 0 && qty <= lowStockThreshold
        ? "bg-amber-500"
        : "bg-emerald-500";

  const safeThreshold = lowStockThreshold !== undefined && lowStockThreshold > 0
    ? lowStockThreshold
    : undefined;

  return (
    <div className={`h-[3px] w-full rounded-full bg-muted ${className ?? ""}`}>
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{
          width:
            qty === 0
              ? "100%"
              : safeThreshold
                ? `${Math.min(100, Math.max(15, (qty / (safeThreshold * 3)) * 100))}%`
                : "100%",
        }}
      />
    </div>
  );
}
