"use client";

import clsx from "clsx";
import {
  Bot,
  BotMessageSquare,
  ChartColumn,
  House,
  Layers,
  ListChecks,
  Settings,
  Sparkles,
  UserPlus,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { Tooltip } from "@/components/ui/Tooltip";

import { BrandMark } from "./BrandMark";
import { ProfileMenu } from "./ProfileMenu";

interface RailLink {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
}

const exact = (href: string) => (pathname: string) => pathname === href;

// Grouped like the Fireflies rail: home + assistant, meeting work, then reporting.
const GROUPS: RailLink[][] = [
  [
    { href: "/", label: "Home", icon: House, match: exact("/") },
    { href: "/askfred", label: "AskFred", icon: Bot, match: exact("/askfred") },
  ],
  [
    { href: "/meetings", label: "Meetings", icon: Video, match: (p) => p.startsWith("/meetings") },
    { href: "/tasks", label: "Tasks", icon: ListChecks, match: exact("/tasks") },
    { href: "/skills", label: "AI Skills", icon: Sparkles, match: exact("/skills") },
  ],
  [
    { href: "/analytics", label: "Analytics", icon: ChartColumn, match: exact("/analytics") },
    { href: "/live", label: "Agents", icon: BotMessageSquare, match: exact("/live") },
  ],
];

const BOTTOM: RailLink[] = [
  { href: "/team", label: "Invite teammates", icon: UserPlus, match: exact("/team") },
  { href: "/integrations", label: "Integrations", icon: Layers, match: exact("/integrations") },
  { href: "/settings", label: "Settings", icon: Settings, match: exact("/settings") },
];

const itemClass =
  "flex size-10 items-center justify-center rounded-lg transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

function RailItem({ item, pathname }: { item: RailLink; pathname: string }) {
  const active = item.match(pathname);
  return (
    <Tooltip label={item.label}>
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={clsx(
          itemClass,
          active ? "bg-brand-50 text-brand-600" : "text-gray-500 hover:bg-raised hover:text-gray-900",
        )}
      >
        <item.icon className="size-[18px]" />
      </Link>
    </Tooltip>
  );
}

/** Fireflies-style navigation: a narrow rail of icons with tooltips. It stays visible at every width. */
export function IconRail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-line bg-surface py-3"
    >
      <div className="mb-2">
        <BrandMark />
      </div>
      {GROUPS.map((group, index) => (
        <div key={index} className="flex flex-col items-center gap-1 border-t border-line pt-2 first-of-type:border-t-0">
          {group.map((item) => (
            <RailItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ))}
      <div className="border-t border-line pt-2">
        <Tooltip label="Upgrade">
          <button
            type="button"
            aria-label="Upgrade"
            onClick={() => toast.info("Plans and billing are out of scope for this demo.")}
            className={clsx(itemClass, "text-gray-500 hover:bg-raised hover:text-gray-900")}
          >
            <Zap className="size-[18px]" />
          </button>
        </Tooltip>
      </div>

      <div className="mt-auto flex flex-col items-center gap-1">
        {BOTTOM.map((item) => (
          <RailItem key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="mt-1">
          <ProfileMenu />
        </div>
      </div>
    </nav>
  );
}
