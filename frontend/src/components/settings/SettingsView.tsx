"use client";

import clsx from "clsx";
import { ArrowLeft, Bell, Gift, IdCard, Info, MessageSquare, Moon, Search, UserRound, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useHydrated } from "@/hooks/useHydrated";
import { useMe } from "@/lib/queries";

import { ThemePicker } from "./ThemePicker";

type Section = "appearance" | "profile" | "notifications" | "recording" | "about";

interface SectionItem {
  value: Section;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

// Grouped like the Fireflies settings menu, with a divider between groups.
const GROUPS: SectionItem[][] = [
  [{ value: "appearance", label: "Appearance", icon: Moon, badge: "BETA" }],
  [
    { value: "recording", label: "Recording & Privacy", icon: Video },
    { value: "notifications", label: "Notifications", icon: Bell },
  ],
  [{ value: "profile", label: "Profile", icon: UserRound }],
  [{ value: "about", label: "About", icon: Info }],
];
const SECTIONS = GROUPS.flat();

const menuItem =
  "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-brand-500";

function Card({ title, badge, description, children }: { title: string; badge?: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 text-sm font-medium text-gray-900">
        {title}
        {badge ? <Badge text={badge} /> : null}
      </h2>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Badge({ text }: { text: string }) {
  return <span className="rounded bg-brand-50 px-1.5 py-px text-xs text-brand-600">{text}</span>;
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

/**
 * Fireflies-style settings: a full-screen page with its own sidebar (account, grouped sections)
 * and the chosen section on the right. The section lives in the URL (?section=...).
 */
export function SettingsView() {
  const router = useRouter();
  const pathname = usePathname();
  const requested = useSearchParams().get("section");
  const section: Section = SECTIONS.some((item) => item.value === requested) ? (requested as Section) : "appearance";
  const [filter, setFilter] = useState("");
  // The user is only shown after hydration: this view hydrates late (Suspense), when the cache may already have it.
  const hydrated = useHydrated();
  const { data } = useMe();
  const me = hydrated ? data : undefined;

  const open = (value: Section) => router.replace(`${pathname}?section=${value}`, { scroll: false });
  const current = SECTIONS.find((item) => item.value === section)!;
  const visibleGroups = GROUPS.map((group) =>
    group.filter((item) => item.label.toLowerCase().includes(filter.trim().toLowerCase())),
  ).filter((group) => group.length > 0);

  return (
    <div className="flex h-full">
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-line bg-[#fcfcfd] md:flex dark:bg-[#1e1e1f]">
        <div className="px-3 pt-3">
          <Link
            href="/"
            aria-label="Back to the app"
            className="inline-flex rounded p-1 text-gray-500 hover:bg-raised hover:text-gray-900"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="mt-3 flex items-center gap-2.5 px-1">
            {me ? <Avatar id={me.id} name={me.name} square /> : <Skeleton className="size-8" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-700">{me?.email ?? "…"}</p>
              <p className="text-xs text-gray-400">Free Plan</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 rounded-md bg-gray-100 p-1 dark:bg-[#292929]">
            <span className="rounded bg-surface py-1 text-center text-sm font-medium text-gray-700 shadow-[0_2px_2px_rgba(16,24,40,0.04)] dark:bg-[#48494c]">
              Personal
            </span>
            <button
              type="button"
              onClick={() => toast.info("Team settings are coming soon.")}
              className="rounded py-1 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Team
            </button>
          </div>
        </div>

        <nav aria-label="Settings sections" className="mt-3 flex-1 overflow-y-auto px-2">
          {visibleGroups.map((group, index) => (
            <div key={index} className={clsx("space-y-0.5 py-2", index > 0 && "border-t border-line")}>
              {group.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-current={section === item.value ? "page" : undefined}
                  onClick={() => open(item.value)}
                  className={clsx(
                    menuItem,
                    section === item.value
                      ? "bg-gray-100 font-medium text-gray-700 dark:bg-[#292929]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? <Badge text={item.badge} /> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-1 px-2 pb-3">
          <button
            type="button"
            onClick={() => toast.info("Referrals are coming soon.")}
            className="flex w-full items-center gap-2.5 rounded-lg bg-brand-50 p-3 text-left text-sm text-gray-900 dark:bg-[#1f1b3f]"
          >
            <Gift className="size-4" /> Refer and earn $5 each
          </button>
          <button type="button" onClick={() => open("profile")} className={clsx(menuItem, "text-gray-500 hover:bg-gray-50 hover:text-gray-700")}>
            <IdCard className="size-4" /> Account
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto bg-canvas">
        <div className="flex items-center gap-3 px-4 pt-4 md:px-6">
          <Link href="/" aria-label="Back to the app" className="rounded p-1 text-gray-500 hover:bg-raised md:hidden">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="relative mx-auto w-full max-w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search settings"
              aria-label="Search settings"
              className="h-9 w-full rounded border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <button
            type="button"
            onClick={() => toast.info("Feedback is coming soon.")}
            className="hidden items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 sm:inline-flex"
          >
            <MessageSquare className="size-4" /> Feedback
          </button>
        </div>

        {/* Below md the sidebar is hidden, so the sections become a row of pills. */}
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto px-4 pt-4 md:hidden">
          {SECTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-current={section === item.value ? "page" : undefined}
              onClick={() => open(item.value)}
              className={clsx(
                "shrink-0 rounded-md px-3 py-1.5 text-sm",
                section === item.value ? "bg-gray-100 font-medium text-gray-700 dark:bg-[#292929]" : "text-gray-500",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mx-auto max-w-[732px] px-4 pb-10 pt-6 md:pt-10">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-sm text-gray-900">{current.label}</h1>
            <button
              type="button"
              onClick={() => toast.info("Feedback is coming soon.")}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 underline underline-offset-4 hover:text-gray-900"
            >
              <MessageSquare className="size-3.5" /> Share Feedback
            </button>
          </div>
          {section === "appearance" ? (
            <Card
              title="Theme"
              badge="BETA"
              description="Choose how the application looks. Select System to automatically match your device settings."
            >
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
      </main>
    </div>
  );
}
