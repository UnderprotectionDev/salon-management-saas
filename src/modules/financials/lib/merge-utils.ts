/**
 * Utilities for merged cell regions.
 */

export interface MergedRegion {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/**
 * Find the merge region that contains a given cell.
 * Returns the region or null if the cell is not merged.
 */
export function findMergeForCell(
  row: number,
  col: number,
  regions: MergedRegion[],
): MergedRegion | null {
  for (const r of regions) {
    if (
      row >= r.startRow &&
      row <= r.endRow &&
      col >= r.startCol &&
      col <= r.endCol
    ) {
      return r;
    }
  }
  return null;
}

/**
 * Check if a cell is the primary (top-left) cell of a merge region.
 */
export function isMergePrimaryCell(
  row: number,
  col: number,
  regions: MergedRegion[],
): MergedRegion | null {
  for (const r of regions) {
    if (row === r.startRow && col === r.startCol) {
      return r;
    }
  }
  return null;
}

/**
 * Check if a cell is hidden (part of a merge but not the primary).
 */
export function isMergeHiddenCell(
  row: number,
  col: number,
  regions: MergedRegion[],
): boolean {
  const region = findMergeForCell(row, col, regions);
  if (!region) return false;
  return !(row === region.startRow && col === region.startCol);
}

/**
 * Validate that a new merge doesn't overlap with existing merges.
 */
export function validateMerge(
  newRegion: MergedRegion,
  existingRegions: MergedRegion[],
): boolean {
  for (const existing of existingRegions) {
    const noOverlap =
      newRegion.endRow < existing.startRow ||
      newRegion.startRow > existing.endRow ||
      newRegion.endCol < existing.startCol ||
      newRegion.startCol > existing.endCol;
    if (!noOverlap) return false;
  }
  return true;
}

/**
 * Add a merge region, returning updated array.
 * First unmerges any overlapping regions.
 */
export function addMerge(
  region: MergedRegion,
  existing: MergedRegion[],
): MergedRegion[] {
  // Remove any overlapping regions
  const filtered = existing.filter((r) => {
    const noOverlap =
      region.endRow < r.startRow ||
      region.startRow > r.endRow ||
      region.endCol < r.startCol ||
      region.startCol > r.endCol;
    return noOverlap;
  });
  return [...filtered, region];
}

/**
 * Remove the merge region that contains the given cell.
 */
export function removeMerge(
  row: number,
  col: number,
  regions: MergedRegion[],
): MergedRegion[] {
  return regions.filter((r) => {
    const contains =
      row >= r.startRow &&
      row <= r.endRow &&
      col >= r.startCol &&
      col <= r.endCol;
    return !contains;
  });
}

/**
 * Adjust merge regions when rows are shifted (insert/delete).
 */
export function adjustMergesOnRowShift(
  regions: MergedRegion[],
  fromRow: number,
  delta: number,
): MergedRegion[] {
  return regions
    .map((r) => {
      if (delta > 0) {
        // Insert: shift regions at or below fromRow
        return {
          startRow: r.startRow >= fromRow ? r.startRow + delta : r.startRow,
          startCol: r.startCol,
          endRow: r.endRow >= fromRow ? r.endRow + delta : r.endRow,
          endCol: r.endCol,
        };
      }
      // Delete: remove regions that contain the deleted row
      if (r.startRow <= fromRow && r.endRow >= fromRow) {
        if (r.startRow === r.endRow) return null; // single-row merge deleted
        return {
          startRow: r.startRow,
          startCol: r.startCol,
          endRow: r.endRow - 1,
          endCol: r.endCol,
        };
      }
      if (r.startRow > fromRow) {
        return {
          startRow: r.startRow - 1,
          startCol: r.startCol,
          endRow: r.endRow - 1,
          endCol: r.endCol,
        };
      }
      return r;
    })
    .filter((r): r is MergedRegion => r !== null);
}

/**
 * Adjust merge regions when columns are shifted (insert/delete).
 */
export function adjustMergesOnColShift(
  regions: MergedRegion[],
  fromCol: number,
  delta: number,
): MergedRegion[] {
  return regions
    .map((r) => {
      if (delta > 0) {
        return {
          startRow: r.startRow,
          startCol: r.startCol >= fromCol ? r.startCol + delta : r.startCol,
          endRow: r.endRow,
          endCol: r.endCol >= fromCol ? r.endCol + delta : r.endCol,
        };
      }
      if (r.startCol <= fromCol && r.endCol >= fromCol) {
        if (r.startCol === r.endCol) return null;
        return {
          startRow: r.startRow,
          startCol: r.startCol,
          endRow: r.endRow,
          endCol: r.endCol - 1,
        };
      }
      if (r.startCol > fromCol) {
        return {
          startRow: r.startRow,
          startCol: r.startCol - 1,
          endRow: r.endRow,
          endCol: r.endCol - 1,
        };
      }
      return r;
    })
    .filter((r): r is MergedRegion => r !== null);
}
