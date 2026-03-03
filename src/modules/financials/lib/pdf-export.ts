import { evaluateConditionalFormats } from "./conditional-format-engine";
import type { CondFormatRule } from "./conditional-format-types";
import type { MergedRegion } from "./merge-utils";
import { formatCellDisplay } from "./number-format";
import { evalFormula } from "./spreadsheet-formula";
import type { CellData, CellMap } from "./spreadsheet-types";
import { cellRef } from "./spreadsheet-utils";

export interface PdfExportOptions {
  cells: CellMap;
  columnCount: number;
  rowCount: number;
  mergedRegions?: MergedRegion[];
  conditionalFormats?: CondFormatRule[];
  sheetName?: string;
  pageSize?: "A4" | "LETTER";
  orientation?: "portrait" | "landscape";
  /** Optional range to export. If omitted, exports all non-empty rows/cols */
  range?: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
  columnWidths?: Record<number, number>;
  /** Repeat first row as header on each page */
  includeHeader?: boolean;
  /** Margin preset */
  margins?: "normal" | "narrow" | "wide";
  /** Download file name (without .pdf extension) */
  fileName?: string;
}

function resolveDisplayValue(
  cellData: CellData | undefined,
  cells: CellMap,
): string {
  if (!cellData?.value) return "";
  const raw = cellData.value.startsWith("=")
    ? evalFormula(cellData.value, cells)
    : cellData.value;
  const fmt = cellData.numberFormat ?? "general";
  return fmt !== "general" ? formatCellDisplay(raw, fmt) : raw;
}

/** Detect the used range (non-empty cells) */
function detectUsedRange(
  cells: CellMap,
  maxRow: number,
  maxCol: number,
): { startRow: number; startCol: number; endRow: number; endCol: number } {
  let minR = maxRow;
  let maxR = 0;
  let minC = maxCol;
  let maxC = 0;
  for (const [ref, data] of Object.entries(cells)) {
    if (!data?.value) continue;
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
    const row = Number.parseInt(m[2], 10) - 1;
    col -= 1;
    if (row < minR) minR = row;
    if (row > maxR) maxR = row;
    if (col < minC) minC = col;
    if (col > maxC) maxC = col;
  }
  if (minR > maxR) return { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
  return { startRow: minR, startCol: minC, endRow: maxR, endCol: maxC };
}

/** Check if a cell is the primary cell of a merge */
function getMergeRegion(
  row: number,
  col: number,
  mergedRegions: MergedRegion[],
): MergedRegion | null {
  for (const m of mergedRegions) {
    if (m.startRow === row && m.startCol === col) return m;
  }
  return null;
}

/** Check if a cell is hidden by a merge (not the primary) */
function isHiddenByMerge(
  row: number,
  col: number,
  mergedRegions: MergedRegion[],
): boolean {
  for (const m of mergedRegions) {
    if (
      row >= m.startRow &&
      row <= m.endRow &&
      col >= m.startCol &&
      col <= m.endCol &&
      !(row === m.startRow && col === m.startCol)
    ) {
      return true;
    }
  }
  return false;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  return [
    Number.parseInt(m[1], 16),
    Number.parseInt(m[2], 16),
    Number.parseInt(m[3], 16),
  ];
}

export async function exportToPdf(options: PdfExportOptions): Promise<void> {
  const {
    cells,
    columnCount,
    rowCount,
    mergedRegions = [],
    conditionalFormats = [],
    sheetName = "Sheet",
    pageSize = "A4",
    orientation = "portrait",
    range,
    columnWidths = {},
    includeHeader = false,
    margins: marginPreset = "normal",
    fileName,
  } = options;

  // Dynamic import to avoid loading pdfmake (~2MB) until needed
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  // Assign virtual file system for fonts
  const pdfMakeDefault = pdfMakeModule.default as unknown as {
    vfs: Record<string, string>;
    createPdf: (docDefinition: unknown) => {
      download: (filename: string) => void;
    };
  };
  const fontsDefault = pdfFontsModule as unknown as {
    default?: { pdfMake?: { vfs: Record<string, string> } };
    pdfMake?: { vfs: Record<string, string> };
  };
  const vfs = fontsDefault.default?.pdfMake?.vfs ?? fontsDefault.pdfMake?.vfs;
  if (vfs && !pdfMakeDefault.vfs) {
    pdfMakeDefault.vfs = vfs;
  }

  const exportRange = range ?? detectUsedRange(cells, rowCount, columnCount);
  const { startRow, startCol, endRow, endCol } = exportRange;

  if (endRow < startRow || endCol < startCol) {
    // Nothing to export
    return;
  }

  const _colCount = endCol - startCol + 1;
  const defaultColWidth = 120;

  // Build column widths for pdfmake
  const widths: (number | string)[] = [];
  for (let c = startCol; c <= endCol; c++) {
    widths.push(columnWidths[c] ?? defaultColWidth);
  }
  // Normalize widths to fit page
  const totalW = widths.reduce(
    (sum: number, w) => sum + (typeof w === "number" ? w : 100),
    0,
  );
  const pageWidth =
    orientation === "portrait"
      ? pageSize === "A4"
        ? 515
        : 530
      : pageSize === "A4"
        ? 770
        : 745;
  const scale = Math.min(1, pageWidth / totalW);
  const scaledWidths = widths.map((w) =>
    typeof w === "number" ? Math.round(w * scale) : w,
  );

  // Build table body
  type PdfCell = {
    text: string;
    bold?: boolean;
    italics?: boolean;
    fontSize?: number;
    alignment?: string;
    fillColor?: string;
    color?: string;
    colSpan?: number;
    rowSpan?: number;
  };

  const body: PdfCell[][] = [];

  for (let r = startRow; r <= endRow; r++) {
    const row: PdfCell[] = [];
    for (let c = startCol; c <= endCol; c++) {
      // Check merge
      if (isHiddenByMerge(r, c, mergedRegions)) {
        row.push({ text: "" });
        continue;
      }

      const ref = cellRef(r, c);
      const cellData = cells[ref];
      const displayValue = resolveDisplayValue(cellData, cells);

      // Conditional format
      const condStyle =
        conditionalFormats.length > 0
          ? evaluateConditionalFormats(
              ref,
              cellData?.value ?? "",
              conditionalFormats,
              cells,
            )
          : null;

      const cell: PdfCell = {
        text: displayValue,
        fontSize: cellData?.fontSize
          ? Number.parseInt(cellData.fontSize, 10)
          : 10,
        bold: condStyle?.bold || cellData?.bold || false,
        italics: condStyle?.italic || cellData?.italic || false,
        alignment: cellData?.align ?? "left",
      };

      // Background color
      const bgColor = condStyle?.bgColor ?? cellData?.bgColor;
      if (bgColor) {
        const rgb = hexToRgb(bgColor);
        if (rgb) cell.fillColor = bgColor;
      }

      // Text color
      const textColor = condStyle?.textColor ?? cellData?.textColor;
      if (textColor) cell.color = textColor;

      // Merge spans
      const merge = getMergeRegion(r, c, mergedRegions);
      if (merge) {
        const cs = merge.endCol - merge.startCol + 1;
        const rs = merge.endRow - merge.startRow + 1;
        if (cs > 1) cell.colSpan = cs;
        if (rs > 1) cell.rowSpan = rs;
      }

      row.push(cell);
    }
    body.push(row);
  }

  if (body.length === 0) return;

  // Margin presets
  const marginMap: Record<string, [number, number, number, number]> = {
    normal: [20, 40, 20, 30],
    narrow: [10, 25, 10, 15],
    wide: [40, 60, 40, 45],
  };
  const pageMargins = marginMap[marginPreset] ?? marginMap.normal;

  // If includeHeader, bold the first row and set headerRows
  const headerRows = includeHeader && body.length > 0 ? 1 : 0;
  if (includeHeader && body.length > 0) {
    for (const cell of body[0]) {
      cell.bold = true;
    }
  }

  const docDefinition = {
    pageSize,
    pageOrientation: orientation,
    pageMargins,
    header: {
      text: sheetName,
      alignment: "center" as const,
      fontSize: 9,
      color: "#999999",
      margin: [0, 15, 0, 0] as [number, number, number, number],
    },
    content: [
      {
        table: {
          headerRows,
          widths: scaledWidths,
          body,
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#d4d4d4",
          vLineColor: () => "#d4d4d4",
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 2,
          paddingBottom: () => 2,
        },
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} / ${pageCount}`,
      alignment: "center" as const,
      fontSize: 8,
      color: "#999999",
      margin: [0, 0, 0, 10] as [number, number, number, number],
    }),
  };

  // Generate and download
  const downloadName = (fileName ?? sheetName).replace(/\.pdf$/i, "");
  pdfMakeDefault.createPdf(docDefinition).download(`${downloadName}.pdf`);
}
