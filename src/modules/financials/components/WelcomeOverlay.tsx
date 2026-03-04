"use client";

import { Keyboard, MousePointerClick, Type } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "spreadsheet-welcome-dismissed";

interface WelcomeOverlayProps {
  cellCount: number;
}

export function WelcomeOverlay({ cellCount }: WelcomeOverlayProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === "true");
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  if (dismissed || cellCount > 0) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // localStorage may be unavailable
    }
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4 shadow-lg">
        <CardContent className="pt-6 pb-4 px-6">
          <h3 className="text-base font-semibold mb-4">Getting Started</h3>
          <div className="space-y-3 mb-5">
            <Tip
              icon={<Type className="size-4" />}
              title="Start typing"
              description="Select a cell and type to enter data"
            />
            <Tip
              icon={<Keyboard className="size-4" />}
              title="Use formulas"
              description="Type = to start a formula (e.g. =SUM(A1:A10))"
            />
            <Tip
              icon={<MousePointerClick className="size-4" />}
              title="Right-click for more"
              description="Insert rows, columns, sort, and more options"
            />
          </div>
          <Button onClick={handleDismiss} className="w-full" size="sm">
            Got it
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Tip({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-primary shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
