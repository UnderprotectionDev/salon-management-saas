"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Coins, CreditCard, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "../../../../convex/_generated/api";
import { CREDIT_PACKAGES } from "../../../../convex/lib/aiConstants";

// =============================================================================
// Types
// =============================================================================

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function CreditPurchaseDialog({
  open,
  onOpenChange,
}: CreditPurchaseDialogProps) {
  const initiatePurchase = useMutation(api.aiCredits.initiatePurchase);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  async function handlePurchase(packageId: "starter" | "popular" | "pro") {
    setLoadingPackageId(packageId);
    try {
      await initiatePurchase({ packageId });
      toast.success("Purchase initiated successfully!");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message ||
            "Failed to initiate purchase."
          : "Failed to initiate purchase. Please try again.";
      toast.error(message);
    } finally {
      setLoadingPackageId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Purchase AI Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit package to power AI features like photo analysis,
            virtual try-on, and quick questions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {CREDIT_PACKAGES.map((pkg) => {
            const isPopular = "badge" in pkg && pkg.badge;
            const isLoading = loadingPackageId === pkg.id;
            const isDisabled = loadingPackageId !== null;

            return (
              <Card
                key={pkg.id}
                className={isPopular ? "border-primary shadow-sm" : undefined}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{pkg.name}</CardTitle>
                    {isPopular && (
                      <Badge variant="default" className="text-xs">
                        {pkg.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="text-lg font-bold">{pkg.priceDisplay}</span>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Coins className="size-4" />
                    <span>{pkg.credits} credits</span>
                  </div>
                  <Button
                    size="sm"
                    variant={isPopular ? "default" : "outline"}
                    disabled={isDisabled}
                    onClick={() =>
                      handlePurchase(pkg.id as "starter" | "popular" | "pro")
                    }
                  >
                    {isLoading ? (
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-1.5 size-4" />
                    )}
                    Purchase
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loadingPackageId !== null}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
