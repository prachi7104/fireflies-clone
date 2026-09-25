"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { DEFAULT_FILTERS, parseFilters, serializeFilters, type LibraryFilters } from "@/lib/filters";

/** Library filters read from and written to the URL, so Back/Forward and shared links just work. */
export function useMeetingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<LibraryFilters>) => {
      const query = serializeFilters({ ...filters, ...patch }).toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  // Clearing keeps the current view (All meetings vs Uploads).
  const reset = useCallback(() => setFilters({ ...DEFAULT_FILTERS, view: filters.view }), [filters.view, setFilters]);

  return { filters, setFilters, reset };
}
