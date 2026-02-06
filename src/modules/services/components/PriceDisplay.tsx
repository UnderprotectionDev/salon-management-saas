"use client";

import { formatPrice } from "../lib/currency";

type PriceDisplayProps = {
  price: number;
  priceType: "fixed" | "starting_from" | "variable";
};

export function PriceDisplay({ price, priceType }: PriceDisplayProps) {
  const formatted = formatPrice(price);

  switch (priceType) {
    case "starting_from":
      return <span>{formatted}+</span>;
    case "variable":
      return <span className="text-muted-foreground italic">Variable</span>;
    default:
      return <span>{formatted}</span>;
  }
}
