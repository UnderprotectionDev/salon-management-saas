"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Heart, Store } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { getConvexErrorMessage } from "@/lib/convex-error";
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
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FavoriteSalonsSkeleton } from "./skeletons/FavoriteSalonsSkeleton";

export function FavoriteSalonsSection() {
  const { isAuthenticated } = useConvexAuth();
  const favorites = useQuery(
    api.favoriteSalons.list,
    isAuthenticated ? {} : "skip",
  );
  const toggleFavorite = useMutation(api.favoriteSalons.toggle);

  if (!isAuthenticated) return null;

  if (favorites === undefined) {
    return <FavoriteSalonsSkeleton />;
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Favorite Salons</CardTitle>
          <CardDescription>Salons you&apos;ve saved</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border rounded-lg">
            <EmptyMedia variant="icon">
              <Heart className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No favorite salons yet</EmptyTitle>
            <EmptyDescription>
              Save salons to favorites for quick access when booking.
            </EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const handleRemove = async (organizationId: Id<"organization">) => {
    try {
      await toggleFavorite({ organizationId });
      toast.success("Removed from favorites");
    } catch (error: unknown) {
      toast.error(getConvexErrorMessage(error, "Unexpected error occurred"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Favorite Salons</CardTitle>
        <CardDescription>
          {favorites.length} salon{favorites.length > 1 ? "s" : ""} saved
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {favorites.map((fav) => (
          <div
            key={fav._id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <Link
              href={`/${fav.organizationSlug}/book`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Avatar className="size-10">
                {fav.organizationLogo && (
                  <AvatarImage src={fav.organizationLogo} />
                )}
                <AvatarFallback>
                  <Store className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{fav.organizationName}</p>
                <p className="text-xs text-muted-foreground">Tap to book</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(fav.organizationId)}
              aria-label={`Remove ${fav.organizationName} from favorites`}
            >
              <Heart className="size-4 fill-current text-red-500" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
