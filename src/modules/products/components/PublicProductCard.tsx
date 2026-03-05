"use client";

import { Package } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";

type PublicProduct = {
  _id: string;
  name: string;
  description?: string;
  categoryName?: string;
  brand?: string;
  sellingPrice: number;
  inStock: boolean;
  imageUrls?: string[];
};

export function PublicProductCard({ product }: { product: PublicProduct }) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted">
        {product.imageUrls?.[0] ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Stock badge */}
        <Badge
          variant={product.inStock ? "default" : "secondary"}
          className="absolute top-2 right-2 text-xs"
        >
          {product.inStock ? "In Stock" : "Out of Stock"}
        </Badge>
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <div className="min-w-0">
          <p className="font-medium truncate leading-tight">{product.name}</p>
          {product.brand && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.brand}
            </p>
          )}
        </div>

        {product.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between border-t pt-3">
          {product.categoryName ? (
            <Badge variant="outline" className="text-xs font-normal">
              {product.categoryName}
            </Badge>
          ) : (
            <span />
          )}
          <span className="ml-auto text-lg font-semibold">
            {formatPrice(product.sellingPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
