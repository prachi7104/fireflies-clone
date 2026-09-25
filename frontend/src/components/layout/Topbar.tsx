"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CaptureButton } from "./CaptureButton";
import { NotificationsButton } from "./NotificationsButton";

const TITLES: Record<string, string> = {
  "/": "Home",
  "/meetings": "Meetings",
  "/tasks": "Tasks",
  "/settings": "Settings",
  "/askfred": "AskFred",
  "/skills": "AI Skills",
  "/analytics": "Analytics",
  "/live": "Agents",
  "/team": "Team",
  "/integrations": "Integrations",
};

/** Page title, global search (Ctrl/⌘+K) and the Capture menu, laid out like the Fireflies top bar. */
export function Topbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = pathname === "/meetings" ? (searchParams.get("q") ?? "") : "";
  const title = TITLES[pathname] ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
      <h1 className="hidden w-32 shrink-0 truncate text-[15px] font-medium text-gray-900 sm:block">{title}</h1>
      <div className="flex min-w-0 flex-1 justify-center">
        {/* Remounting on URL change keeps the box in sync with Back/Forward and "Clear filters". */}
        <SearchBox key={urlQuery} initialQuery={urlQuery} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => toast.info("Plans and billing are out of scope for this demo.")}
          className="hidden h-8 items-center rounded-md border border-emerald-600/30 px-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 md:inline-flex dark:text-emerald-400 dark:hover:bg-emerald-950"
        >
          Upgrade
        </button>
        <NotificationsButton />
        <CaptureButton />
      </div>
    </header>
  );
}

function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K / ⌘K focuses search from anywhere, like Fireflies.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit(value: string) {
    const params = new URLSearchParams(pathname === "/meetings" ? searchParams.toString() : "");
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    const qs = params.toString();
    router.push(qs ? `/meetings?${qs}` : "/meetings");
  }

  return (
    <form
      role="search"
      className="relative w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        submit(query);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by title or keyword"
        aria-label="Search meetings"
        aria-keyshortcuts="Control+K Meta+K"
        className="h-9 w-full rounded-lg border border-gray-200 bg-surface pl-9 pr-16 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            submit("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="size-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 text-xs text-gray-400 md:block">
          Ctrl + K
        </kbd>
      )}
    </form>
  );
}
