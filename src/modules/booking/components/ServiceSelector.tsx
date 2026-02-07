"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/modules/services/lib/currency";
import type { Id } from "../../../../convex/_generated/dataModel";

type Service = {
  _id: Id<"services">;
  name: string;
  duration: number;
  price: number;
  description?: string;
  categoryName?: string;
  isPopular?: boolean;
};

type ServiceSelectorProps = {
  services: Service[];
  selectedIds: Id<"services">[];
  onSelectionChange: (ids: Id<"services">[]) => void;
};

export function ServiceSelector({
  services,
  selectedIds,
  onSelectionChange,
}: ServiceSelectorProps) {
  const toggleService = (id: Id<"services">) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const totalDuration = services
    .filter((s) => selectedIds.includes(s._id))
    .reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = services
    .filter((s) => selectedIds.includes(s._id))
    .reduce((sum, s) => sum + s.price, 0);

  // Group by category
  const grouped = new Map<string, Service[]>();
  for (const service of services) {
    const cat = service.categoryName ?? "Other";
    const list = grouped.get(cat) ?? [];
    list.push(service);
    grouped.set(cat, list);
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([category, categoryServices]) => (
        <div key={category}>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {category}
          </h3>
          <div className="space-y-2">
            {categoryServices.map((service) => (
              <label
                key={service._id}
                className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedIds.includes(service._id) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <Checkbox
                  checked={selectedIds.includes(service._id)}
                  onCheckedChange={() => toggleService(service._id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    {service.isPopular && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-medium">
                    {formatPrice(service.price)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {service.duration} min
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {selectedIds.length} service
            {selectedIds.length !== 1 ? "s" : ""} selected{" · "}
            {totalDuration} min total
          </div>
          <div className="font-semibold">{formatPrice(totalPrice)}</div>
        </div>
      )}
    </div>
  );
}
