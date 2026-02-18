"use client";

import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { Coins, CreditCard, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";

// =============================================================================
// Types
// =============================================================================

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceDisplay: string;
  badge?: string;
}

const VALID_PACKAGE_IDS = ["starter", "popular", "pro"] as const;
type PackageId = (typeof VALID_PACKAGE_IDS)[number];

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
  const initiatePurchase = useAction(api.aiCreditActions.initiatePurchase);
  const getCreditPackages = useAction(api.aiCreditActions.getCreditPackages);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  // Fetch live pricing from Polar when the dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setPackagesLoading(true);

    getCreditPackages({})
      .then((result) => {
        if (!cancelled) setPackages(result);
      })
      .catch((err) => {
        console.error("Failed to fetch credit packages:", err);
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, getCreditPackages]);

  async function handlePurchase(packageId: PackageId) {
    setLoadingPackageId(packageId);
    try {
      const successUrl = `${window.location.origin}${window.location.pathname}?credits_purchased=1`;
      const { url } = await initiatePurchase({ packageId, successUrl });
      // Redirect to Polar hosted checkout
      window.location.href = url;
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message ||
            "Failed to initiate purchase."
          : "Failed to initiate purchase. Please try again.";
      toast.error(message);
      setLoadingPackageId(null);
    }
    // Don't reset loadingPackageId on success — page is navigating away
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
          {packagesLoading ? (
            <>
              <Skeleton className="h-[88px] w-full" />
              <Skeleton className="h-[88px] w-full" />
              <Skeleton className="h-[88px] w-full" />
            </>
          ) : packages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No credit packages available. Please try again later.
            </p>
          ) : (
            packages.map((pkg) => {
              const isPopular = !!pkg.badge;
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
                    <span className="text-lg font-bold">
                      {pkg.priceDisplay}
                    </span>
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
                      onClick={() => {
                        if (!VALID_PACKAGE_IDS.includes(pkg.id as PackageId)) {
                          toast.error("Invalid package selected");
                          return;
                        }
                        handlePurchase(pkg.id as PackageId);
                      }}
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
            })
          )}
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
