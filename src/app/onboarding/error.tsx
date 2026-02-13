"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleSignOut = async () => {
    try {
      // Dispatch event BEFORE sign out to skip queries immediately
      window.dispatchEvent(new Event("auth:signing-out"));

      // Small delay to allow React to process the state update
      await new Promise((resolve) => setTimeout(resolve, 50));

      await authClient.signOut();

      // Notify that sign out is complete
      window.dispatchEvent(new Event("auth:signed-out"));

      router.push("/sign-in");
    } catch (error) {
      console.error("Sign out failed:", error);
      window.dispatchEvent(new Event("auth:signed-out"));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="size-12 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            An error occurred during onboarding. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
