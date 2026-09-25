// Theme preference: Light / Dark / System, like Fireflies' Appearance setting. Light is the default.
export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function parsePreference(raw: string | null): ThemePreference {
  return raw === "dark" || raw === "system" || raw === "light" ? raw : "light";
}

export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

/**
 * Runs in <head> before React hydrates, so someone who chose dark never sees a light flash.
 * It's a fixed string (no user input). Storage can throw in private windows, hence the try/catch.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;
