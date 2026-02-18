"use client";

import { useQuery } from "convex/react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { CreditPurchaseDialog } from "../../components/CreditPurchaseDialog";

// =============================================================================
// Types
// =============================================================================

interface OrgAICreditManagerProps {
  organizationId: Id<"organization">;
}

// =============================================================================
// Constants
// =============================================================================

const FEATURE_LABELS: Record<string, string> = {
  photoAnalysis: "Photo Analysis",
  quickQuestion: "Quick Question",
  virtualTryOn: "Virtual Try-On",
  careSchedule: "Care Schedule",
};

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof ArrowUpCircle; className: string }
> = {
  purchase: {
    label: "Purchase",
    icon: ArrowUpCircle,
    className: "text-green-600",
  },
  usage: {
    label: "Usage",
    icon: ArrowDownCircle,
    className: "text-red-600",
  },
  refund: {
    label: "Refund",
    icon: RotateCcw,
    className: "text-blue-600",
  },
};

// =============================================================================
// Main Component
// =============================================================================

export function OrgAICreditManager({
  organizationId,
}: OrgAICreditManagerProps) {
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const orgBalance = useQuery(api.aiCredits.getOrgBalance, {
    organizationId,
  });

  const transactions = useQuery(api.aiCredits.getOrgTransactionHistory, {
    organizationId,
    limit: 50,
  });

  const balance = orgBalance?.balance ?? 0;

  return (
    <>
      <div className="space-y-6">
        {/* Balance Card */}
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Coins className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Organization Credit Balance
                </p>
                <p className="font-bold text-3xl tabular-nums">{balance}</p>
              </div>
            </div>

            <Button onClick={() => setPurchaseOpen(true)}>
              <Sparkles className="mr-1.5 size-4" />
              Buy Credits
            </Button>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions === undefined ? (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Loading transactions...
              </p>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No transactions yet. Purchase credits to get started.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const config = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.usage;
                    const Icon = config.icon;
                    const featureLabel = tx.featureType
                      ? (FEATURE_LABELS[tx.featureType] ?? tx.featureType)
                      : (tx.description ?? "—");

                    return (
                      <TableRow key={tx._id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`gap-1 ${config.className}`}
                          >
                            <Icon className="size-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {featureLabel}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium tabular-nums ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreditPurchaseDialog
        open={purchaseOpen}
        onOpenChange={setPurchaseOpen}
      />
    </>
  );
}
