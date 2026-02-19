"use client";

import { ImagePlus, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DesignEmptyStateProps {
  slug: string;
}

export function DesignEmptyState({ slug }: DesignEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed py-20">
      {/* Illustration */}
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="font-semibold text-lg">
          Start building your design portfolio
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
          Upload designs for customers to browse and virtually try on. Organize
          them by category for easy discovery.
        </p>
      </div>

      <Button asChild size="lg">
        <Link href={`/${slug}/ai/designs/new`}>
          <Plus className="mr-2 h-4 w-4" />
          Add Your First Design
        </Link>
      </Button>
    </div>
  );
}
