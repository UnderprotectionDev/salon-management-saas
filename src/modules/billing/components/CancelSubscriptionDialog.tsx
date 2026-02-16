"use client";

import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { AlertTriangle, Loader2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "missing_features", label: "Missing features" },
  { value: "switched_service", label: "Switched to another service" },
  { value: "unused", label: "Not using it enough" },
  { value: "customer_service", label: "Customer service issues" },
  { value: "low_quality", label: "Quality not meeting expectations" },
  { value: "too_complex", label: "Too complex to use" },
  { value: "other", label: "Other" },
] as const;

export function CancelSubscriptionDialog() {
  const { activeOrganization } = useOrganization();
  const cancelSubscription = useMutation(api.subscriptions.cancelSubscription);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async (e: React.MouseEvent) => {
    // Prevent dialog from closing during async operation
    e.preventDefault();

    if (!activeOrganization) return;

    setIsLoading(true);
    try {
      await cancelSubscription({
        organizationId: activeOrganization._id,
        reason: reason || undefined,
        comment: comment.trim() || undefined,
      });
      toast.success(
        "Subscription cancelled. You will retain access until the end of your billing period.",
      );
      setOpen(false);
      setReason("");
      setComment("");
    } catch (error) {
      console.error("Cancel subscription error:", error);
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message ||
            "Failed to cancel subscription."
          : "Failed to cancel subscription. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Cancel Subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className="size-5 text-destructive"
              aria-hidden="true"
            />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your subscription? You will retain
            access until the end of your current billing period. After that,
            your salon will be suspended and you won&apos;t be able to manage
            bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="cancel-reason"
              className="text-sm font-medium leading-none"
            >
              Why are you cancelling?
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="cancel-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="cancel-comment"
              className="text-sm font-medium leading-none"
            >
              Additional comments (optional)
            </label>
            <Textarea
              id="cancel-comment"
              placeholder="Tell us how we can improve..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
