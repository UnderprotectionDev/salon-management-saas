"use client";

import { FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: {
    pageSize: "A4" | "LETTER";
    orientation: "portrait" | "landscape";
    exportRange: "all" | "selection";
    includeHeader: boolean;
    margins: "normal" | "narrow" | "wide";
    fileName: string;
  }) => void;
  selectionRange?: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  sheetName?: string;
}

export function PdfExportDialog({
  open,
  onOpenChange,
  onExport,
  selectionRange,
  sheetName = "Sheet",
}: PdfExportDialogProps) {
  const [pageSize, setPageSize] = useState<"A4" | "LETTER">("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );
  const [exportRange, setExportRange] = useState<"all" | "selection">("all");
  const [includeHeader, setIncludeHeader] = useState(false);
  const [margins, setMargins] = useState<"normal" | "narrow" | "wide">(
    "normal",
  );
  const [fileName, setFileName] = useState(sheetName);
  const [exporting, setExporting] = useState(false);

  const hasSelection =
    selectionRange &&
    (Math.abs(selectionRange.startRow - selectionRange.endRow) > 0 ||
      Math.abs(selectionRange.startCol - selectionRange.endCol) > 0);

  // Reset fileName when sheet name changes
  useEffect(() => {
    setFileName(sheetName);
  }, [sheetName]);

  // Reset range to "all" if no selection
  useEffect(() => {
    if (!hasSelection) setExportRange("all");
  }, [hasSelection]);

  async function handleExport() {
    setExporting(true);
    try {
      onExport({
        pageSize,
        orientation,
        exportRange,
        includeHeader,
        margins,
        fileName: fileName.trim() || sheetName,
      });
      onOpenChange(false);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="size-4" />
            Export to PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File name */}
          <div className="space-y-1">
            <Label className="text-xs">File Name</Label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="h-8 text-xs"
              placeholder="Sheet"
            />
          </div>

          {/* Export range */}
          <div className="space-y-1">
            <Label className="text-xs">Export Range</Label>
            <Select
              value={exportRange}
              onValueChange={(v) => setExportRange(v as "all" | "selection")}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All data (auto-detect)
                </SelectItem>
                <SelectItem
                  value="selection"
                  className="text-xs"
                  disabled={!hasSelection}
                >
                  Current selection
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page size */}
          <div className="space-y-1">
            <Label className="text-xs">Page Size</Label>
            <Select
              value={pageSize}
              onValueChange={(v) => setPageSize(v as "A4" | "LETTER")}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4" className="text-xs">
                  A4 (210 x 297 mm)
                </SelectItem>
                <SelectItem value="LETTER" className="text-xs">
                  Letter (8.5 x 11 in)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orientation */}
          <div className="space-y-1">
            <Label className="text-xs">Orientation</Label>
            <Select
              value={orientation}
              onValueChange={(v) =>
                setOrientation(v as "portrait" | "landscape")
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait" className="text-xs">
                  Portrait
                </SelectItem>
                <SelectItem value="landscape" className="text-xs">
                  Landscape
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Margins */}
          <div className="space-y-1">
            <Label className="text-xs">Margins</Label>
            <Select
              value={margins}
              onValueChange={(v) =>
                setMargins(v as "normal" | "narrow" | "wide")
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal" className="text-xs">
                  Normal
                </SelectItem>
                <SelectItem value="narrow" className="text-xs">
                  Narrow
                </SelectItem>
                <SelectItem value="wide" className="text-xs">
                  Wide
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include header row */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeHeader"
              checked={includeHeader}
              onCheckedChange={(v) => setIncludeHeader(v === true)}
            />
            <Label htmlFor="includeHeader" className="text-xs cursor-pointer">
              Repeat first row as header on each page
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
