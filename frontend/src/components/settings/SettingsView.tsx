"use client";

import clsx from "clsx";
import { Bell, Info, Moon, UserRound, Video, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHydrated } from "@/hooks/useHydrated";
import { useMe } from "@/lib/queries";

import { ThemePicker } from "./ThemePicker";

type Section = "appearance" | "profile" | "notifications" | "recording" | "about";

const SECTIONS: { value: Section; label: string; icon: LucideIcon; badge?: string }[] = [
  { value: "appearance", label: "Appearance", icon: Moon, badge: "BETA" },
  { value: "profile", label: "Profile", icon: UserRound },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "recording", label: "Recording & Privacy", icon: Video },
  { value: "about", label: "About", icon: Info },
];

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-[15px] font-medium text-gray-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlaceholderToggle({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-500">{hint}</p>
      </div>
      <span className="rounded bg-raised px-2 py-0.5 text-xs text-gray-500">Coming soon</span>
      <span aria-hidden className="h-5 w-9 rounded-full bg-gray-200 p-0.5">
        <span className="block size-4 rounded-full bg-surface shadow-card" />
      </span>
    </div>
  );
}

/** Fireflies-style settings: a section menu on the left, cards on the right. The section lives in the URL. */
export function SettingsView() {
  const router = useRouter();
  const pathname = usePathname();
  const requested = useSearchParams().get("section");
  const section: Section = SECTIONS.some((item) => item.value === requested) ? (requested as Section) : "appearance";
  // The user is only shown after hydration: this view hydrates late (Suspense), when the cache may already have it.
  const hydrated = useHydrated();
  const { data } = useMe();
  const me = hydrated ? data : undefined;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6 md:py-8">
      <aside className="md:w-56 md:shrink-0">
        <div className="mb-4 hidden items-center gap-3 md:flex">
          {me ? <Avatar id={me.id} name={me.name} square /> : <Skeleton className="size-8" />}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{me?.email ?? "…"}</p>
            <p className="text-xs text-gray-500">Free Plan</p>
          </div>
        </div>
        <nav aria-label="Settings sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 md:flex-col md:overflow-visible">
          {SECTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-current={section === item.value ? "page" : undefined}
              onClick={() => router.replace(`${pathname}?section=${item.value}`, { scroll: false })}
              className={clsx(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                section === item.value ? "bg-brand-50 font-medium text-brand-700" : "text-gray-600 hover:bg-raised hover:text-gray-900",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
              {item.badge ? (
                <span className="ml-auto rounded bg-brand-100 px-1.5 text-[10px] font-semibold text-brand-700">{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 max-w-2xl flex-1 space-y-4">
        {section === "appearance" ? (
          <Card title="Theme" description="Choose how the application looks. Select System to automatically match your device settings.">
            <ThemePicker />
          </Card>
        ) : section === "profile" ? (
          <Card title="Profile" description="Authentication is mocked in this demo, so the default user is always signed in.">
            {!me ? (
              <Skeleton className="h-12 w-72" />
            ) : (
              <div className="flex items-center gap-4">
                <Avatar id={me.id} name={me.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{me.name}</p>
                  <p className="truncate text-sm text-gray-500">{me.email}</p>
                </div>
              </div>
            )}
          </Card>
        ) : section === "notifications" ? (
          <Card title="Email notifications">
            <div className="divide-y divide-line">
              <PlaceholderToggle label="Meeting recap email" hint="Send a recap after each meeting is processed." />
              <PlaceholderToggle label="Mentions" hint="Email me when a teammate mentions me in a comment." />
            </div>
          </Card>
        ) : section === "recording" ? (
          <Card title="Recording">
            <div className="divide-y divide-line">
              <PlaceholderToggle label="Auto-record meetings" hint="The notetaker joins and records your calendar events." />
              <PlaceholderToggle label="Meeting language" hint="English (Global), for transcripts and summaries." />
            </div>
          </Card>
        ) : (
          <Card title="About this app">
            <div className="space-y-3 text-sm leading-6 text-gray-600">
              <p>
                This is an educational clone of the Fireflies.ai meeting workspace, built for an assignment.{" "}
                <strong className="font-medium text-gray-800">It isn&apos;t affiliated with or endorsed by Fireflies.ai.</strong>
              </p>
              <p>Built with Next.js and TypeScript, a FastAPI backend and SQLite. Transcripts are uploaded or pasted; there&apos;s no audio.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
