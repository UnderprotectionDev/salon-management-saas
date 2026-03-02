"use client";

import { useRef, useState } from "react";
import type { CellData } from "../lib/spreadsheet-types";

export interface UndoEntry {
  ref: string;
  before: CellData;
  after: CellData;
}

type UndoItem = UndoEntry | UndoEntry[];

const MAX_HISTORY = 50;

export function useUndoHistory() {
  const pastRef = useRef<UndoItem[]>([]);
  const futureRef = useRef<UndoItem[]>([]);
  const [_revision, setRevision] = useState(0);

  function pushChange(ref: string, before: CellData, after: CellData) {
    pastRef.current.push({ ref, before, after });
    if (pastRef.current.length > MAX_HISTORY) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setRevision((r) => r + 1);
  }

  /** Push a batch of changes as a single undo step */
  function pushBatch(entries: UndoEntry[]) {
    if (entries.length === 0) return;
    if (entries.length === 1) {
      pushChange(entries[0].ref, entries[0].before, entries[0].after);
      return;
    }
    pastRef.current.push(entries);
    if (pastRef.current.length > MAX_HISTORY) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setRevision((r) => r + 1);
  }

  function undo(): UndoEntry[] | null {
    const item = pastRef.current.pop();
    if (!item) return null;
    futureRef.current.push(item);
    setRevision((r) => r + 1);
    return Array.isArray(item) ? item : [item];
  }

  function redo(): UndoEntry[] | null {
    const item = futureRef.current.pop();
    if (!item) return null;
    pastRef.current.push(item);
    setRevision((r) => r + 1);
    return Array.isArray(item) ? item : [item];
  }

  function clear() {
    pastRef.current = [];
    futureRef.current = [];
    setRevision((r) => r + 1);
  }

  return {
    pushChange,
    pushBatch,
    undo,
    redo,
    clear,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
