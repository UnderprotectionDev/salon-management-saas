import { Mail, Phone, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { ProductDetail } from "./ProductDetailTypes";

export function ProductSupplierTab({ detail }: { detail: ProductDetail }) {
  const info = detail.supplierInfo;
  const hasInfo = info && (info.name || info.phone || info.email || info.notes);

  if (!hasInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-3">
          <Truck className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No supplier information</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add supplier details by editing this product
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {info.name && (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <Truck className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Supplier</p>
            <p className="text-sm font-medium">{info.name}</p>
          </div>
        </div>
      )}
      {info.phone && (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <Phone className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{info.phone}</p>
          </div>
        </div>
      )}
      {info.email && (
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
            <Mail className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{info.email}</p>
          </div>
        </div>
      )}
      {info.notes && (
        <div>
          <Separator className="my-2" />
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {info.notes}
          </p>
        </div>
      )}
    </div>
  );
}
