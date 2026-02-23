"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function CompletionOverlay({
  salonName,
  slug,
}: {
  salonName: string;
  slug: string;
}) {
  const router = useRouter();
  const confettiFiredRef = useRef(false);

  useEffect(() => {
    if (confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!prefersReducedMotion) {
      import("canvas-confetti").then((mod) => {
        const confetti = mod.default;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      });
    }

    // Auto-redirect after 4 seconds
    const timer = setTimeout(() => {
      router.push(`/${slug}/dashboard?welcome=true`);
    }, 4000);

    return () => clearTimeout(timer);
  }, [router, slug]);

  const handleGo = () => {
    router.push(`/${slug}/dashboard?welcome=true`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-[onboarding-fade-in_0.3s_ease-out]">
      <div className="text-center space-y-6 max-w-md mx-auto px-6">
        {/* Animated checkmark */}
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-[scale-in_0.3s_ease-out]">
          <svg
            className="size-10 text-green-600 dark:text-green-400"
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

        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tight">
            {salonName} is ready!
          </h2>
          <p className="text-sm text-muted-foreground">
            Your booking page is live at{" "}
            <span className="font-mono font-medium text-foreground/70">
              yoursite.com/{slug}
            </span>
          </p>
        </div>

        <Button
          onClick={handleGo}
          size="lg"
          className="px-8 text-[11px] font-bold tracking-[0.15em] uppercase gap-2 bg-brand hover:bg-brand/90 text-brand-foreground"
        >
          GO TO DASHBOARD
          <ArrowRight className="size-3.5" />
        </Button>

        <p className="text-xs text-muted-foreground/50">
          Redirecting automatically...
        </p>
      </div>
    </div>
  );
}
