"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { NotificationsButton } from "./NotificationsButton";
import { ProfileMenu } from "./ProfileMenu";

/** Global search drives the meetings library: it reads and writes ?q= in the URL. */
export function Topbar({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = pathname === "/meetings" ? (searchParams.get("q") ?? "") : "";

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 md:px-6">
      {/* Remounting on URL change keeps the box in sync with Back/Forward and "Clear filters". */}
      <SearchBox key={urlQuery} initialQuery={urlQuery} />
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <NotificationsButton />
        <ProfileMenu />
      </div>
    </header>
  );
}

function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

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
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search meetings, transcripts and people"
        aria-label="Search meetings"
        className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-sm text-gray-900 shadow-card placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:hidden"
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
      ) : null}
    </form>
  );
}
