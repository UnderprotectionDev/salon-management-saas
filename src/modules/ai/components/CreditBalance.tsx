"use client";

import { useMutation, useQuery } from "convex/react";
import { AlertTriangle, Coins, FlaskConical, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../convex/_generated/api";
import { CreditPurchaseDialog } from "./CreditPurchaseDialog";

// =============================================================================
// Types
// =============================================================================

type CreditBalanceProps = Record<string, never>;

// =============================================================================
// Main Component
// =============================================================================

export function CreditBalance(_props: CreditBalanceProps) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const balanceData = useQuery(
    api.aiCredits.getMyBalance,
    isAuthenticated ? {} : "skip",
  );
  const claimTestCredits = useMutation(api.aiCredits.claimTestCredits);

  async function handleClaimTest() {
    setClaiming(true);
    try {
      const { newBalance } = await claimTestCredits({});
      toast.success(`100 test credits added! New balance: ${newBalance}`);
    } catch {
      toast.error("Failed to claim test credits");
    } finally {
      setClaiming(false);
    }
  }

  const isLoading = balanceData === undefined;
  const balance = balanceData?.balance ?? 0;
  const isZero = !isLoading && balance === 0;

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Coins className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">AI Credits</p>
              <p className="text-2xl font-bold tabular-nums">{balance}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isZero && (
              <div className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                <span>No credits</span>
              </div>
            )}
            {/* Test credits button — dev/staging only */}
            {process.env.NEXT_PUBLIC_ALLOW_TEST_CREDITS === "true" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClaimTest}
                disabled={claiming}
              >
                <FlaskConical className="mr-1.5 size-4" />
                +100 Test
              </Button>
            )}
            <Button
              size="sm"
              variant={isZero ? "default" : "outline"}
              onClick={() => setPurchaseOpen(true)}
            >
              <Sparkles className="mr-1.5 size-4" />
              {isZero ? "Buy Credits" : "Buy More"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreditPurchaseDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
      />
    </>
  );
}
