"use client";

import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";

export function CustomerPortalButton() {
  const generatePortalUrl = useAction(
    api.polarActions.generateCustomerPortalUrl,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await generatePortalUrl();
      window.location.href = result.url;
    } catch (error) {
      console.error("Customer portal error:", error);
      const message =
        error instanceof ConvexError
          ? (error.data as { message?: string })?.message ||
            "Failed to open customer portal."
          : "Failed to open customer portal. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <ExternalLink className="mr-2 size-4" />
      )}
      Manage Subscription
    </Button>
  );
}
