"use client";

import { formatPrice } from "@/modules/services/lib/currency";
import type { Id } from "../../../../convex/_generated/dataModel";

type Service = {
  _id: Id<"services">;
  name: string;
  duration: number;
  bufferTime?: number;
  price: number;
  description?: string;
  categoryName?: string;
  isPopular?: boolean;
};

type ServiceSelectorProps = {
  services: Service[];
  selectedIds: Id<"services">[];
  onSelectionChange: (ids: Id<"services">[]) => void;
  disabled?: boolean;
};

export function ServiceSelector({
  services,
  selectedIds,
  onSelectionChange,
  disabled = false,
}: ServiceSelectorProps) {
  const toggleService = (id: Id<"services">) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Group by category
  const grouped = new Map<string, Service[]>();
  for (const service of services) {
    const cat = service.categoryName ?? "Services";
    const list = grouped.get(cat) ?? [];
    list.push(service);
    grouped.set(cat, list);
  }

  let globalIndex = 0;

  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      {Array.from(grouped.entries()).map(([category, categoryServices]) => (
        <div key={category}>
          {grouped.size > 1 && (
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold py-2 border-b">
              {category}
            </div>
          )}
          {categoryServices.map((service) => {
            globalIndex++;
            const idx = String(globalIndex).padStart(2, "0");
            const isSelected = selectedIds.includes(service._id);
            return (
              <button
                key={service._id}
                type="button"
                onClick={() => toggleService(service._id)}
                aria-pressed={isSelected}
                className={`w-full flex items-center gap-4 py-4 px-3 border-b text-left transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                <span
                  className={`text-sm font-medium tabular-nums shrink-0 ${
                    isSelected
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {idx}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold uppercase text-sm tracking-wide">
                    {service.name}
                  </span>
                  {service.description && !isSelected && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className="font-semibold text-sm">
                    {formatPrice(service.price)}
                  </div>
                  <div
                    className={`text-xs ${
                      isSelected
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {service.duration}
                    {service.bufferTime ? ` +${service.bufferTime}` : ""} MIN
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
