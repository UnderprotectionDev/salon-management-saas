"use client";

import { useQuery } from "convex/react";
import { Camera, ChevronDown, ChevronUp, Eye, Sparkles } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../convex/_generated/api";

// =============================================================================
// Types
// =============================================================================

type ActivityType = "analysis" | "tryon";

interface ActivityItem {
  id: string;
  type: ActivityType;
  status: string;
  createdAt: number;
}

interface AIRecentActivityProps {
  onSelectItem: (type: ActivityType, id: string) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

// =============================================================================
// Main Component
// =============================================================================

export function AIRecentActivity({ onSelectItem }: AIRecentActivityProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const analyses = useQuery(
    api.aiAnalysis.listMyAnalyses,
    isAuthenticated ? { limit: 5 } : "skip",
  );
  const simulations = useQuery(
    api.aiSimulations.listMySimulations,
    isAuthenticated ? { limit: 5 } : "skip",
  );

  if (analyses === undefined || simulations === undefined) return null;

  // Merge and sort by creation time
  const items: ActivityItem[] = [];

  for (const a of analyses) {
    items.push({
      id: a._id,
      type: "analysis",
      status: a.status,
      createdAt: a.createdAt,
    });
  }
  for (const s of simulations) {
    items.push({
      id: s._id,
      type: "tryon",
      status: s.status,
      createdAt: s.createdAt,
    });
  }

  items.sort((a, b) => b.createdAt - a.createdAt);
  const recent = items.slice(0, 5);

  if (recent.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between py-2 text-sm"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">Recent Activity</span>
          <Badge variant="secondary" className="text-xs">
            {recent.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-1 space-y-1">
          {recent.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2.5">
                {item.type === "analysis" ? (
                  <Camera className="size-3.5 text-muted-foreground" />
                ) : (
                  <Sparkles className="size-3.5 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {item.type === "analysis"
                    ? "Photo Analysis"
                    : "Virtual Try-On"}
                </span>
                <Badge
                  variant={
                    item.status === "completed"
                      ? "default"
                      : item.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {item.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">
                  {formatRelativeDate(item.createdAt)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onSelectItem(item.type, item.id)}
                >
                  <Eye className="mr-1 size-3" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
