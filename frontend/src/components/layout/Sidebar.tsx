"use client";

import clsx from "clsx";
import { Bot, ChartColumn, CloudUpload, Puzzle, Settings, Sparkles, Users, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Logo } from "./Logo";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
  isActive: (pathname: string, view: string | null) => boolean;
}

const MAIN_NAV: NavItem[] = [
  { href: "/meetings", label: "Meetings", icon: Video, isActive: (p, v) => p.startsWith("/meetings") && v !== "uploads" },
  { href: "/meetings?view=uploads", label: "Uploads", icon: CloudUpload, isActive: (p, v) => p === "/meetings" && v === "uploads" },
  { href: "/askfred", label: "AskFred", icon: Sparkles, soon: true, isActive: (p) => p === "/askfred" },
  { href: "/live", label: "Live Notetaker", icon: Bot, soon: true, isActive: (p) => p === "/live" },
  { href: "/integrations", label: "Integrations", icon: Puzzle, soon: true, isActive: (p) => p === "/integrations" },
  { href: "/analytics", label: "Analytics", icon: ChartColumn, soon: true, isActive: (p) => p === "/analytics" },
  { href: "/team", label: "Team", icon: Users, soon: true, isActive: (p) => p === "/team" },
];

const SETTINGS: NavItem = { href: "/settings", label: "Settings", icon: Settings, isActive: (p) => p === "/settings" };

export function Sidebar() {
  const pathname = usePathname();
  const view = useSearchParams().get("view");

  const link = (item: NavItem) => {
    const active = item.isActive(pathname, view);
    return (
      <Link
        key={item.label}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={clsx(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        )}
      >
        <item.icon className={clsx("size-[18px]", active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-500")} />
        <span className="flex-1">{item.label}</span>
        {item.soon ? (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">Soon</span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex h-16 items-center px-3">
        <Logo />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2" aria-label="Main">
        {MAIN_NAV.map(link)}
      </nav>
      <div className="space-y-3 border-t border-gray-200 px-3 py-3">
        {link(SETTINGS)}
        <div className="rounded-lg bg-brand-25 p-3 ring-1 ring-brand-100">
          <p className="text-xs font-semibold text-gray-900">Free plan</p>
          <p className="mt-0.5 text-xs text-gray-500">Unlimited transcripts in this demo workspace.</p>
          <button
            type="button"
            onClick={() => toast.info("Billing is out of scope for this demo.")}
            className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            Upgrade
          </button>
        </div>
        <p className="px-1 text-[11px] leading-4 text-gray-400">Educational clone · not affiliated with Fireflies.ai</p>
      </div>
    </aside>
  );
}
