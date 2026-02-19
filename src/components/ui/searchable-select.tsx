"use client";

import { useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  items: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  onBlur?: () => void;
}

export function SearchableSelect({
  items,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  onBlur,
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? items.filter((item) => item.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <Combobox
      value={value}
      onValueChange={(val) => {
        onValueChange(val ?? "");
        setSearch("");
      }}
      disabled={disabled}
    >
      <ComboboxTrigger
        onBlur={onBlur}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow]",
          "focus:border-ring focus:ring-ring/50 focus:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        <ComboboxValue placeholder={placeholder} />
      </ComboboxTrigger>
      <ComboboxContent className="w-(--anchor-width)">
        <ComboboxInput
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          showTrigger={false}
          className="border-input focus-visible:border-border rounded-none border-0 px-0 py-2.5 shadow-none ring-0! outline-none! focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <ComboboxSeparator />
        {filtered.length === 0 ? (
          <p className="text-muted-foreground px-4 py-2.5 text-center text-sm">
            {emptyMessage}
          </p>
        ) : (
          <ComboboxList>
            <ScrollArea className="max-h-64">
              {filtered.map((item) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              ))}
            </ScrollArea>
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
