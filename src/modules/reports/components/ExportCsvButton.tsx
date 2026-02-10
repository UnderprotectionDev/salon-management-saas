"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportCsvButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Download className="mr-2 size-4" />
      Export CSV
    </Button>
  );
}
