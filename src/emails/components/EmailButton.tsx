import { Button } from "@react-email/components";
import type * as React from "react";

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      href={href}
      className="box-border block rounded bg-brand px-5 py-3 text-center text-sm font-medium text-brand-foreground no-underline"
    >
      {children}
    </Button>
  );
}
