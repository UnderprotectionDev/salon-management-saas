"use client";

import { useMutation, useQuery } from "convex/react";
import { GitMerge, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatPrice } from "@/modules/services/lib/currency";

type MergeCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryCustomerId: Id<"customers">;
  primaryCustomerName: string;
  organizationId: Id<"organization">;
};

export function MergeCustomerDialog({
  open,
  onOpenChange,
  primaryCustomerId,
  primaryCustomerName,
  organizationId,
}: MergeCustomerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDuplicate, setSelectedDuplicate] =
    useState<Id<"customers"> | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [step, setStep] = useState<"select" | "confirm">("select");

  const mergeCustomer = useMutation(api.customers.merge);

  const searchResults = useQuery(
    api.customers.list,
    open && searchQuery.trim().length > 0
      ? { organizationId, search: searchQuery }
      : "skip",
  );

  const duplicateCustomer = useQuery(
    api.customers.get,
    selectedDuplicate
      ? { organizationId, customerId: selectedDuplicate }
      : "skip",
  );

  const primaryCustomer = useQuery(
    api.customers.get,
    open ? { organizationId, customerId: primaryCustomerId } : "skip",
  );

  const filteredResults = searchResults?.filter(
    (c) => c._id !== primaryCustomerId,
  );

  const handleMerge = async () => {
    if (!selectedDuplicate) return;
    setIsMerging(true);
    try {
      await mergeCustomer({
        organizationId,
        primaryCustomerId,
        duplicateCustomerId: selectedDuplicate,
      });
      toast.success("Customers merged successfully");
      onOpenChange(false);
      resetState();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to merge customers";
      toast.error(message);
    } finally {
      setIsMerging(false);
    }
  };

  const resetState = () => {
    setSearchQuery("");
    setSelectedDuplicate(null);
    setStep("select");
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="size-5" />
            Merge Customers
          </DialogTitle>
          <DialogDescription>
            Merge a duplicate customer record into &ldquo;{primaryCustomerName}
            &rdquo;. Stats will be combined and the duplicate will be deleted.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search for duplicate customer</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Type a name to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {filteredResults && filteredResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border p-2">
                {filteredResults.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    className={`w-full text-left rounded-md p-2 text-sm hover:bg-accent transition-colors ${
                      selectedDuplicate === customer._id ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelectedDuplicate(customer._id)}
                  >
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.phone}
                      {customer.email ? ` \u00B7 ${customer.email}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.trim().length > 0 &&
              filteredResults &&
              filteredResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No matching customers found
                </p>
              )}
          </div>
        )}

        {step === "confirm" && primaryCustomer && duplicateCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Primary (kept)
                </Label>
                <div className="rounded-md border p-3 bg-accent/50">
                  <p className="font-medium text-sm">{primaryCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {primaryCustomer.phone}
                  </p>
                  <p className="text-xs mt-1">
                    Visits: {primaryCustomer.totalVisits ?? 0} | Spent:{" "}
                    {formatPrice(primaryCustomer.totalSpent ?? 0)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Duplicate (deleted)
                </Label>
                <div className="rounded-md border p-3">
                  <p className="font-medium text-sm">
                    {duplicateCustomer.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {duplicateCustomer.phone}
                  </p>
                  <p className="text-xs mt-1">
                    Visits: {duplicateCustomer.totalVisits ?? 0} | Spent:{" "}
                    {formatPrice(duplicateCustomer.totalSpent ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium">After merge:</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>
                  Total Visits:{" "}
                  {(primaryCustomer.totalVisits ?? 0) +
                    (duplicateCustomer.totalVisits ?? 0)}
                </li>
                <li>
                  Total Spent:{" "}
                  {formatPrice(
                    (primaryCustomer.totalSpent ?? 0) +
                      (duplicateCustomer.totalSpent ?? 0),
                  )}
                </li>
                <li>
                  Tags:{" "}
                  {[
                    ...new Set([
                      ...(primaryCustomer.tags ?? []),
                      ...(duplicateCustomer.tags ?? []),
                    ]),
                  ].join(", ") || "None"}
                </li>
              </ul>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "select" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!selectedDuplicate}
                onClick={() => setStep("confirm")}
              >
                Next
              </Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("select")}
                disabled={isMerging}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleMerge}
                disabled={isMerging}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  "Merge Customers"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
