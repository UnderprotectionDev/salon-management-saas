"use client";

import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useActiveOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";

export function SetupChecklist() {
  const activeOrganization = useActiveOrganization();

  const progress = useQuery(
    api.organizations.getSetupProgress,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  const dismiss = useMutation(api.organizations.dismissSetupChecklist);

  if (!progress || progress.dismissed) return null;

  const completedCount = progress.items.filter((i) => i.completed).length;
  const totalCount = progress.items.length;
  const allDone = completedCount === totalCount;
  const percentage = Math.round((completedCount / totalCount) * 100);

  const handleDismiss = async () => {
    if (!activeOrganization) return;
    await dismiss({ organizationId: activeOrganization._id });
  };

  const handleShareBooking = (href: string) => {
    const url = `${window.location.origin}${href}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Getting Started</CardTitle>
            <CardDescription>
              {allDone
                ? "You're all set!"
                : `${completedCount} of ${totalCount} completed`}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleDismiss}
          >
            <X className="size-4" />
          </Button>
        </div>
        <Progress value={percentage} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1">
          {progress.items.map((item) => (
            <li key={item.id}>
              {item.id === "share-booking" ? (
                <button
                  type="button"
                  onClick={() => handleShareBooking(item.href)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  {item.completed ? (
                    <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={
                      item.completed
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {item.label}
                  </span>
                  <Copy className="size-3.5 text-muted-foreground ml-auto" />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  {item.completed ? (
                    <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={
                      item.completed
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {item.label}
                  </span>
                  <ExternalLink className="size-3.5 text-muted-foreground ml-auto" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
