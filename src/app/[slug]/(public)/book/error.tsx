"use client";

import { Button } from "@/components/ui/button";

export default function BookingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-lg font-semibold uppercase tracking-wider">
          Something went wrong
        </h2>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load the booking page. This might be a temporary
          issue.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <pre className="text-xs text-destructive bg-destructive/5 p-3 rounded-md overflow-auto text-left">
            {error.message}
          </pre>
        )}
        <Button
          onClick={reset}
          variant="outline"
          className="uppercase tracking-wider text-xs font-semibold"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
