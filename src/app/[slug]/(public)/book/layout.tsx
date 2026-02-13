"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthLoading, isAuthenticated, router]);

  // Auth loading or redirecting
  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="px-6 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page content (BookingPageHeader is rendered inside page.tsx) */}
      {children}

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground uppercase tracking-widest">
        <p>
          Powered by{" "}
          <Link href="/" className="text-primary hover:underline">
            Salon Management
          </Link>
        </p>
      </footer>
    </div>
  );
}
