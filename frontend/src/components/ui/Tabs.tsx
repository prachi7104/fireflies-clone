"use client";

import clsx from "clsx";

export interface TabItem<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
}

/** Fireflies' pill-style segmented tabs (Notes | AI Skills, My Tasks | All Tasks, ...). */
export function Tabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  className,
}: {
  value: T;
  onValueChange: (value: T) => void;
  items: TabItem<T>[];
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={clsx("inline-flex rounded-lg bg-gray-100 p-1", className)}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onValueChange(item.value)}
            className={clsx(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-3 font-display text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
              selected ? "bg-surface font-medium text-gray-900 shadow-card" : "text-gray-500 hover:text-gray-800",
            )}
          >
            {item.label}
            {item.badge !== undefined ? <span className="text-xs text-gray-400">· {item.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
