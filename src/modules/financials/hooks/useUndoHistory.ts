"use client";

import { useRef, useState } from "react";
import type { CellData } from "../lib/spreadsheet-types";

interface UndoEntry {
  ref: string;
  before: CellData;
  after: CellData;
}

const MAX_HISTORY = 50;

export function useUndoHistory() {
  const pastRef = useRef<UndoEntry[]>([]);
  const futureRef = useRef<UndoEntry[]>([]);
  const [revision, setRevision] = useState(0);

  function pushChange(ref: string, before: CellData, after: CellData) {
    pastRef.current.push({ ref, before, after });
    if (pastRef.current.length > MAX_HISTORY) {
      pastRef.current.shift();
    }
    futureRef.current = [];
    setRevision((r) => r + 1);
  }

  function undo(): UndoEntry | null {
    const entry = pastRef.current.pop();
    if (!entry) return null;
    futureRef.current.push(entry);
    setRevision((r) => r + 1);
    return entry;
  }

  function redo(): UndoEntry | null {
    const entry = futureRef.current.pop();
    if (!entry) return null;
    pastRef.current.push(entry);
    setRevision((r) => r + 1);
    return entry;
  }

  function clear() {
    pastRef.current = [];
    futureRef.current = [];
    setRevision((r) => r + 1);
  }

  return {
    pushChange,
    undo,
    redo,
    clear,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
