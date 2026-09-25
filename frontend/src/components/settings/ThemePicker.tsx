"use client";

import clsx from "clsx";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { useHydrated } from "@/hooks/useHydrated";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Fireflies' Appearance setting: Light, Dark, or follow the device. */
export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  // The saved choice lives in the browser, so nothing is shown as selected until after hydration.
  const hydrated = useHydrated();

  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-3">
      {OPTIONS.map((option) => {
        const selected = hydrated && preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(option.value)}
            className={clsx(
              "flex h-[72px] w-24 flex-col items-center justify-center gap-1.5 rounded-lg border text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              selected ? "border-brand-400 bg-brand-50 text-brand-700" : "border-line text-gray-600 hover:bg-raised",
            )}
          >
            <option.icon className="size-5" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
