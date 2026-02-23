"use client";

import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";

export function useSlugAvailability() {
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const slugAvailability = useQuery(
    api.organizations.checkSlugAvailability,
    debouncedSlug.length >= 2 ? { slug: debouncedSlug } : "skip",
  );

  const updateDebouncedSlug = (slug: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSlug(slug);
    }, 500);
  };

  return { debouncedSlug, slugAvailability, updateDebouncedSlug };
}
