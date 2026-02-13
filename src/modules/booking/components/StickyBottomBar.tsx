"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/modules/services/lib/currency";

type StickyBottomBarProps = {
  selectedServiceNames: string[];
  totalPrice: number;
  selectedDate: string | null;
  canConfirm: boolean;
  onConfirmClick: () => void;
};

export function StickyBottomBar({
  selectedServiceNames,
  totalPrice,
  selectedDate,
  canConfirm,
  onConfirmClick,
}: StickyBottomBarProps) {
  if (selectedServiceNames.length === 0) return null;

  const servicesText =
    selectedServiceNames.length <= 2
      ? selectedServiceNames.join(" + ")
      : `${selectedServiceNames[0]} +${selectedServiceNames.length - 1}`;

  const dateText = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
      })
    : "--";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Selected
            </div>
            <div className="text-sm font-semibold uppercase truncate">
              {servicesText}
            </div>
          </div>
          <div className="hidden sm:block border-l pl-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Total
            </div>
            <div className="text-sm font-semibold">
              {formatPrice(totalPrice)}
            </div>
          </div>
          <div className="hidden sm:block border-l pl-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Date
            </div>
            <div className="text-sm font-semibold">{dateText}</div>
          </div>
        </div>

        {/* Mobile price */}
        <div className="sm:hidden text-sm font-semibold mr-3">
          {formatPrice(totalPrice)}
        </div>

        <Button
          onClick={onConfirmClick}
          disabled={!canConfirm}
          className="shrink-0 uppercase tracking-wider text-xs font-semibold gap-2"
        >
          Confirm Booking
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
