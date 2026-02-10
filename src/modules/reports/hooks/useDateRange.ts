"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDefault30Days() {
  const now = new Date();
  const to = formatDate(now);
  const from = new Date(now);
  from.setDate(from.getDate() - 29);
  return { from: formatDate(from), to };
}

export function useDateRange() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const defaults = getDefault30Days();
  const from = searchParams.get("from") ?? defaults.from;
  const to = searchParams.get("to") ?? defaults.to;

  function setRange(newFrom: string, newTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return { from, to, setRange };
}
