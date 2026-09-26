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
    <div role="tablist" aria-label={label} className={clsx("inline-flex rounded-md bg-gray-100 p-1 dark:bg-[#292929]", className)}>
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
              "inline-flex h-[22px] items-center gap-1.5 rounded px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
              selected
                ? "bg-surface text-gray-700 shadow-[0_2px_2px_rgba(16,24,40,0.04)] dark:bg-[#48494c] dark:text-gray-900"
                : "text-gray-500 hover:text-gray-700",
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
