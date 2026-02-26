import type { Id } from "../../../../convex/_generated/dataModel";
import type { ProductDetail } from "./ProductDetailTypes";
import { VariantMatrixTable } from "./VariantMatrixTable";

export function ProductVariantsTab({
  detail,
  organizationId,
}: {
  detail: ProductDetail;
  organizationId: Id<"organization">;
}) {
  return (
    <div className="space-y-4">
      {/* Variant Summary */}
      {detail.variantOptions && detail.variantOptions.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {detail.variantOptions.map((opt, i) => (
              <span key={opt._id}>
                {i > 0 && " · "}
                <span className="font-medium text-foreground">{opt.name}</span>{" "}
                ({opt.values.length} values)
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="tabular-nums">
              <span className="text-muted-foreground">Variants:</span>{" "}
              <span className="font-medium">
                {detail.variants?.length ?? 0}
              </span>
            </span>
            <span className="tabular-nums">
              <span className="text-muted-foreground">Total Stock:</span>{" "}
              <span className="font-medium">
                {detail.variants?.reduce(
                  (sum, v) => sum + (v.stockQuantity ?? 0),
                  0,
                ) ?? 0}
              </span>
            </span>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Variant Matrix
        </p>
        <VariantMatrixTable
          productId={detail._id}
          organizationId={organizationId}
        />
      </div>
    </div>
  );
}
