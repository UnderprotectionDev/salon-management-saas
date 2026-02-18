"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Check, Heart, ImageOff, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

type MoodBoardViewProps = Record<string, never>;

// =============================================================================
// Subcomponents
// =============================================================================

function MoodBoardCard({
  item,
  imageUrl,
  onUpdateNote,
  onDelete,
}: {
  item: Doc<"aiMoodBoard">;
  imageUrl: string | undefined;
  onUpdateNote: (itemId: Id<"aiMoodBoard">, note: string) => void;
  onDelete: (itemId: Id<"aiMoodBoard">) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editNote, setEditNote] = useState(item.note ?? "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const sourceLabel =
    item.source === "analysis" ? "From Analysis" : "From Try-On";

  function handleSaveNote() {
    onUpdateNote(item._id, editNote);
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setEditNote(item.note ?? "");
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSaveNote();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  }

  return (
    <>
      <Card className="group overflow-hidden py-0">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {imageUrl ? (
            // biome-ignore lint/performance/noImgElement: Dynamic storage URLs require <img>
            <img
              src={imageUrl}
              alt={item.note || "Saved style"}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {/* Source badge */}
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            {sourceLabel}
          </Badge>

          {/* Delete button */}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Note */}
        <CardContent className="p-3">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a note..."
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleSaveNote}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleCancelEdit}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="text-muted-foreground text-sm">
                {item.note || "No note"}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  setEditNote(item.note ?? "");
                  setIsEditing(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="mt-1 text-muted-foreground text-xs">
            {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from mood board?</AlertDialogTitle>
            <AlertDialogDescription>
              This style will be permanently removed from your mood board. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => onDelete(item._id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MoodBoardView(_props: MoodBoardViewProps) {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  // Track attempted IDs to prevent infinite re-render loop when some URLs fail
  const attemptedIds = useRef<Set<string>>(new Set());

  // Queries
  const moodBoard = useQuery(api.aiMoodBoard.listMyMoodBoard, {});

  // Mutations
  const updateNote = useMutation(api.aiMoodBoard.updateNote);
  const removeFromMoodBoard = useMutation(api.aiMoodBoard.removeFromMoodBoard);
  const getFileUrl = useMutation(api.files.getFileUrl);

  // Resolve image URLs from storage IDs
  useEffect(() => {
    if (!moodBoard || moodBoard.length === 0) return;

    // Skip IDs already attempted (resolved or failed) — prevents infinite loop
    const pendingIds = moodBoard
      .map((item) => item.imageStorageId)
      .filter((id) => !attemptedIds.current.has(id as string));

    if (pendingIds.length === 0) return;

    for (const id of pendingIds) {
      attemptedIds.current.add(id as string);
    }

    let cancelled = false;

    async function resolveUrls() {
      const newUrls: Record<string, string> = {};

      for (const storageId of pendingIds) {
        try {
          const url = await getFileUrl({ storageId });
          if (url && !cancelled) {
            newUrls[storageId as string] = url;
          }
        } catch {
          // Silently skip failed URL resolutions
        }
      }

      if (!cancelled && Object.keys(newUrls).length > 0) {
        setImageUrls((prev) => ({ ...prev, ...newUrls }));
      }
    }

    resolveUrls();

    return () => {
      cancelled = true;
    };
  }, [moodBoard, getFileUrl]);

  // Handlers
  async function handleUpdateNote(itemId: Id<"aiMoodBoard">, note: string) {
    try {
      await updateNote({ itemId, note });
      toast.success("Note updated");
    } catch (error) {
      if (error instanceof ConvexError) {
        const message =
          (error.data as { message?: string })?.message ??
          "Failed to update note";
        toast.error(message);
      } else {
        toast.error("Failed to update note");
      }
    }
  }

  async function handleDelete(itemId: Id<"aiMoodBoard">) {
    try {
      await removeFromMoodBoard({ itemId });
      toast.success("Removed from mood board");
    } catch (error) {
      if (error instanceof ConvexError) {
        const message =
          (error.data as { message?: string })?.message ??
          "Failed to remove item";
        toast.error(message);
      } else {
        toast.error("Failed to remove item");
      }
    }
  }

  // Loading state
  if (moodBoard === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {["skeleton-a", "skeleton-b", "skeleton-c"].map((key) => (
          <Card key={key} className="overflow-hidden py-0">
            <div className="aspect-square w-full animate-pulse bg-muted" />
            <CardContent className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (moodBoard.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Heart />
          </EmptyMedia>
          <EmptyTitle>No saved styles yet</EmptyTitle>
          <EmptyDescription>
            Save your first style from an analysis or try-on
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Grid view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          My Styles ({moodBoard.length})
        </h3>
        <Badge variant="outline" className="text-xs">
          Free to save
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {moodBoard.map((item) => (
          <MoodBoardCard
            key={item._id}
            item={item}
            imageUrl={imageUrls[item.imageStorageId as string]}
            onUpdateNote={handleUpdateNote}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
