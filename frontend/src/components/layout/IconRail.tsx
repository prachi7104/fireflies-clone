"use client";

import clsx from "clsx";
import {
  Bot,
  BotMessageSquare,
  ChartColumn,
  House,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
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
import type { ReactNode } from "react";

import { Tooltip } from "@/components/ui/Tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useStoredFlag } from "@/hooks/useStoredFlag";

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
  [{ href: "/upgrade", label: "Upgrade", icon: Zap, match: exact("/upgrade") }],
];

const BOTTOM: RailLink[] = [
  { href: "/team", label: "Invite teammates", icon: UserPlus, match: exact("/team") },
  { href: "/integrations", label: "Integrations", icon: Layers, match: exact("/integrations") },
  { href: "/settings", label: "Settings", icon: Settings, match: exact("/settings") },
];

const itemBase =
  "flex h-10 items-center rounded-lg transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500";

function itemClass(expanded: boolean, active: boolean) {
  return clsx(
    itemBase,
    expanded ? "w-full gap-3 px-3 text-sm" : "w-10 justify-center",
    active ? "bg-brand-50 font-medium text-brand-600" : "text-gray-500 hover:bg-raised hover:text-gray-900",
  );
}

/** Collapsed, an item is an icon with a tooltip; expanded, the name sits next to the icon (no tooltip needed). */
function WithTooltip({ label, show, children }: { label: string; show: boolean; children: ReactNode }) {
  return show ? <Tooltip label={label}>{children}</Tooltip> : <>{children}</>;
}

function RailItem({ item, pathname, expanded }: { item: RailLink; pathname: string; expanded: boolean }) {
  const active = item.match(pathname);
  return (
    <WithTooltip label={item.label} show={!expanded}>
      <Link
        href={item.href}
        aria-label={expanded ? undefined : item.label}
        aria-current={active ? "page" : undefined}
        className={itemClass(expanded, active)}
      >
        <item.icon className="size-[18px] shrink-0" />
        {expanded ? <span className="truncate">{item.label}</span> : null}
      </Link>
    </WithTooltip>
  );
}

/**
 * Fireflies-style navigation: a narrow rail of icons with tooltips that can be expanded to show names,
 * like Fireflies' "Expand sidebar". The choice is remembered; on phones the rail always stays narrow.
 */
export function IconRail() {
  const pathname = usePathname();
  const [savedExpanded, setExpanded] = useStoredFlag("sidebar-expanded");
  const isWide = useMediaQuery("(min-width: 768px)");
  const expanded = savedExpanded && isWide;
  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen;

  return (
    <nav
      aria-label="Main"
      className={clsx(
        "flex shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-surface py-3 transition-[width] duration-200",
        expanded ? "w-56 px-3" : "w-14 items-center",
      )}
    >
      <div className={clsx("mb-2 flex items-center gap-2", expanded ? "justify-between px-1" : "flex-col")}>
        <BrandMark />
        {isWide ? (
          <WithTooltip label="Expand sidebar" show={!expanded}>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={expanded}
              className="rounded-md p-1.5 text-gray-500 hover:bg-raised hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <ToggleIcon className="size-[18px]" />
            </button>
          </WithTooltip>
        ) : null}
      </div>
      {GROUPS.map((group, index) => (
        <div key={index} className={clsx("flex flex-col gap-1 border-t border-line pt-2", expanded ? "" : "items-center")}>
          {group.map((item) => (
            <RailItem key={item.href} item={item} pathname={pathname} expanded={expanded} />
          ))}
        </div>
      ))}

      <div className={clsx("mt-auto flex flex-col gap-1", expanded ? "" : "items-center")}>
        {BOTTOM.map((item) => (
          <RailItem key={item.href} item={item} pathname={pathname} expanded={expanded} />
        ))}
        <div className={clsx("mt-1", expanded ? "px-1.5" : "")}>
          <ProfileMenu />
        </div>
      </div>
    </nav>
  );
}
