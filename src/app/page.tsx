"use client";

import { useQuery } from "convex/react";
import { Building2, Calendar } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../convex/_generated/api";

function SalonListSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Home() {
  const salons = useQuery(api.organizations.listPublic);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight lg:text-6xl">
              Find Your Perfect Salon
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Browse salons, book appointments, and manage your beauty routine
              all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Salon Listings */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Available Salons
          </h2>
          <p className="text-muted-foreground mt-1">
            {salons !== undefined &&
              `${salons.length} ${salons.length === 1 ? "salon" : "salons"} ready to serve you`}
          </p>
        </div>

        {/* Loading State */}
        {salons === undefined && <SalonListSkeleton />}

        {/* Empty State */}
        {salons !== undefined && salons.length === 0 && (
          <Empty className="border rounded-lg py-12">
            <EmptyMedia variant="icon">
              <Building2 className="size-8" />
            </EmptyMedia>
            <EmptyTitle>No salons available yet</EmptyTitle>
            <EmptyDescription>
              Be the first to register your salon on our platform.
            </EmptyDescription>
            <Button asChild className="mt-4">
              <Link href="/onboarding">Register Your Salon</Link>
            </Button>
          </Empty>
        )}

        {/* Salon Grid */}
        {salons !== undefined && salons.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {salons.map((salon) => (
              <Link key={salon._id} href={`/${salon.slug}/book`}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="size-16 border-2">
                        {salon.logo ? (
                          <AvatarImage src={salon.logo} alt={salon.name} />
                        ) : (
                          <AvatarFallback>
                            <Building2 className="size-6" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {salon.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          /{salon.slug}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {salon.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {salon.description}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      <Calendar className="mr-2 size-4" />
                      Book Appointment
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t bg-muted/30 mt-12">
        <div className="container mx-auto px-4 py-12 text-center">
          <h3 className="text-xl font-semibold mb-2">Own a salon?</h3>
          <p className="text-muted-foreground mb-4">
            Join our platform and start accepting online bookings today.
          </p>
          <Button asChild size="lg">
            <Link href="/onboarding">Register Your Salon</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
