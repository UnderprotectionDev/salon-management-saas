"use client";

import { useQuery } from "convex/react";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../../convex/_generated/api";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const organization = useQuery(api.organizations.getBySlug, { slug });

  // Loading state
  if (organization === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  // Organization not found
  if (organization === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Salon not found</h2>
          <p className="text-muted-foreground mt-1">
            The salon you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="text-primary hover:underline mt-4 inline-block"
          >
            Browse all salons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/${slug}/book`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <Avatar className="size-10 border">
              {organization.logo ? (
                <AvatarImage src={organization.logo} alt={organization.name} />
              ) : (
                <AvatarFallback>
                  <Building2 className="size-5" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h1 className="font-semibold text-lg">{organization.name}</h1>
              <p className="text-xs text-muted-foreground">
                Book an appointment
              </p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Simple Footer */}
      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
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
