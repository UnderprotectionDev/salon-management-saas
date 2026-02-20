"use client";

import {
  CalendarPlus,
  Clock,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const QUICK_ACTIONS = [
  {
    icon: CalendarPlus,
    label: "Add Services",
    description: "Define what you offer",
    href: "services",
  },
  {
    icon: Clock,
    label: "Set Hours",
    description: "Configure business hours",
    href: "settings",
  },
  {
    icon: UserPlus,
    label: "Invite Team",
    description: "Add your staff members",
    href: "settings",
  },
] as const;

export function WelcomeModal({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(searchParams.get("welcome") === "true");

  const handleClose = () => {
    setOpen(false);
    // Clean up the URL parameter
    router.replace(`/${slug}/dashboard`, { scroll: false });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          {/* Animated checkmark */}
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="size-8 text-green-600 dark:text-green-400 animate-[scale-in_0.3s_ease-out]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
                className="animate-[draw-check_0.4s_ease-out_0.2s_both]"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: 24,
                }}
              />
            </svg>
          </div>
          <DialogTitle className="text-xl">Your salon is ready!</DialogTitle>
          <DialogDescription>
            Here are a few things you can do to get the most out of your salon
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 mt-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={`/${slug}/${action.href}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <Button onClick={handleClose} className="w-full mt-2">
          Go to Dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
}
