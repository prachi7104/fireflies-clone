"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useMe } from "@/lib/queries";

/**
 * AskFred, Fireflies' Q&A assistant, as a placeholder: the brief lists AI chat as a bonus, so
 * the panel matches the Fireflies layout but answering is "coming soon" (no network call).
 */
export function AskFredPanel({
  greeting,
  suggestions,
  contextLabel,
}: {
  greeting: string;
  suggestions: { label: string; onSelect?: () => void }[];
  contextLabel: string;
}) {
  const { data: me } = useMe();
  const [draft, setDraft] = useState("");
  const firstName = me?.name.split(" ")[0] ?? "there";

  function send(text: string) {
    if (!text.trim()) return;
    toast.info("AskFred answers are coming soon.");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="bg-gradient-to-b from-emerald-50/80 via-brand-25 to-transparent px-5 pb-6 pt-10 dark:from-emerald-950/40">
          <Sparkles className="mb-4 size-6 text-emerald-500" />
          <p className="text-xl font-medium leading-snug text-gray-900">
            Hi {firstName}!
            <br />
            {greeting}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 px-5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => (suggestion.onSelect ? suggestion.onSelect() : setDraft(suggestion.label))}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-raised"
            >
              <Sparkles className="size-3.5 shrink-0 text-emerald-500" />
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>
      <form
        className="m-3 shrink-0 rounded-xl border border-line bg-surface p-3 focus-within:border-brand-300"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <span className="inline-flex rounded bg-raised px-2 py-0.5 text-xs text-gray-600"># {contextLabel}</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          rows={2}
          placeholder="Ask anything. Type / to run AI skills."
          aria-label="Ask AskFred"
          className="mt-2 w-full resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            aria-label="Send"
            className="flex size-8 items-center justify-center rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40"
            disabled={!draft.trim()}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
