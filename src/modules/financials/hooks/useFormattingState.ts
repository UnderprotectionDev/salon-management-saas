import { useState } from "react";
import type { NumberFormat } from "../lib/number-format";
import type { CellData, CellMap } from "../lib/spreadsheet-types";

export interface FormattingState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fontSize: string;
  fontFamily: string;
  numberFormat: NumberFormat;
}

export interface FormattingActions {
  setBold: (v: boolean) => void;
  setItalic: (v: boolean) => void;
  setUnderline: (v: boolean) => void;
  setAlign: (v: "left" | "center" | "right") => void;
  setFontSize: (v: string) => void;
  setFontFamily: (v: string) => void;
  setNumberFormat: (v: NumberFormat) => void;
  handleBold: () => void;
  handleItalic: () => void;
  handleUnderline: () => void;
  handleAlignChange: (a: "left" | "center" | "right") => void;
  handleFontSizeChange: (s: string) => void;
  handleFontFamilyChange: (f: string) => void;
  handleFillColor: (color: string | null) => void;
  handleTextColor: (color: string | null) => void;
  handleNumberFormatChange: (format: NumberFormat) => void;
  syncFormattingFromCell: (cellData: CellData | undefined) => void;
  resetFormatting: () => void;
}

interface UseFormattingStateDeps {
  getSelectionRefs: () => string[];
  mergedCells: CellMap;
  readOnlyCells: Set<string>;
  handleCellChange: (ref: string, data: CellData) => void;
}

export function useFormattingState(
  deps: UseFormattingStateDeps,
): FormattingState & FormattingActions {
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [numberFormat, setNumberFormat] = useState<NumberFormat>("general");

  function applyFormatToSelection(key: keyof CellData, value: unknown) {
    const refs = deps.getSelectionRefs();
    for (const ref of refs) {
      if (deps.readOnlyCells.has(ref)) continue;
      const existing = deps.mergedCells[ref] ?? { value: "" };
      deps.handleCellChange(ref, { ...existing, [key]: value });
    }
  }

  function handleBold() {
    setBold((prev) => {
      const next = !prev;
      applyFormatToSelection("bold", next);
      return next;
    });
  }

  function handleItalic() {
    setItalic((prev) => {
      const next = !prev;
      applyFormatToSelection("italic", next);
      return next;
    });
  }

  function handleUnderline() {
    setUnderline((prev) => {
      const next = !prev;
      applyFormatToSelection("underline", next);
      return next;
    });
  }

  function handleAlignChange(a: "left" | "center" | "right") {
    setAlign(a);
    applyFormatToSelection("align", a);
  }

  function handleFontSizeChange(s: string) {
    setFontSize(s);
    applyFormatToSelection("fontSize", s);
  }

  function handleFontFamilyChange(f: string) {
    setFontFamily(f);
    applyFormatToSelection("fontFamily", f);
  }

  function handleFillColor(color: string | null) {
    applyFormatToSelection("bgColor", color ?? undefined);
  }

  function handleTextColor(color: string | null) {
    applyFormatToSelection("textColor", color ?? undefined);
  }

  function handleNumberFormatChange(format: NumberFormat) {
    setNumberFormat(format);
    applyFormatToSelection("numberFormat", format);
  }

  function syncFormattingFromCell(cellData: CellData | undefined) {
    setBold(cellData?.bold ?? false);
    setItalic(cellData?.italic ?? false);
    setUnderline(cellData?.underline ?? false);
    setAlign(cellData?.align ?? "left");
    setFontSize(cellData?.fontSize ?? "12");
    setFontFamily(cellData?.fontFamily ?? "Inter");
    setNumberFormat(cellData?.numberFormat ?? "general");
  }

  function resetFormatting() {
    setBold(false);
    setItalic(false);
    setUnderline(false);
    setAlign("left");
    setFontSize("12");
    setFontFamily("Inter");
    setNumberFormat("general");
  }

  return {
    bold,
    italic,
    underline,
    align,
    fontSize,
    fontFamily,
    numberFormat,
    setBold,
    setItalic,
    setUnderline,
    setAlign,
    setFontSize,
    setFontFamily,
    setNumberFormat,
    handleBold,
    handleItalic,
    handleUnderline,
    handleAlignChange,
    handleFontSizeChange,
    handleFontFamilyChange,
    handleFillColor,
    handleTextColor,
    handleNumberFormatChange,
    syncFormattingFromCell,
    resetFormatting,
  };
}
