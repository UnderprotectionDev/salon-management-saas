"use client";

import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { FileText, Loader2, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../../../convex/_generated/api";

interface OrderItem {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  productName: string;
  status: string;
  billingReason: string;
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const STATUS_MAP: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  paid: { label: "Paid", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  refunded: { label: "Refunded", variant: "outline" },
  partially_refunded: { label: "Partially Refunded", variant: "outline" },
  disputed: { label: "Disputed", variant: "destructive" },
};

const BILLING_REASON_MAP: Record<string, string> = {
  purchase: "Purchase",
  subscription_create: "New Subscription",
  subscription_cycle: "Renewal",
  subscription_update: "Plan Change",
};

export function BillingHistory() {
  const getBillingHistory = useAction(api.polarActions.getBillingHistory);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (hasLoaded) return;

    async function fetchHistory() {
      try {
        const data = await getBillingHistory();
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch billing history:", error);
        const message =
          error instanceof ConvexError
            ? (error.data as { message?: string })?.message ||
              "Failed to load billing history."
            : "Failed to load billing history.";
        toast.error(message);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    }

    fetchHistory();
  }, [getBillingHistory, hasLoaded]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="size-5" aria-hidden="true" />
          <div>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your past invoices and payments</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <FileText className="size-10" aria-hidden="true" />
            <p>No billing history yet.</p>
            <p className="text-sm">
              Invoices will appear here after your first payment.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const statusInfo = STATUS_MAP[order.status] ?? {
                  label: order.status,
                  variant: "outline" as const,
                };
                const reasonLabel =
                  BILLING_REASON_MAP[order.billingReason] ??
                  order.billingReason;

                return (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{order.productName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {reasonLabel}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatAmount(order.amount, order.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {orders.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            For detailed invoices and PDF downloads, use the &quot;Manage
            Subscription&quot; button above to visit the customer portal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
