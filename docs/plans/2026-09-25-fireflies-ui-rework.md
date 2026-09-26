# Fireflies UI Rework Implementation Plan

> **How to use this plan:** work through the tasks in order. Steps use checkbox (`- [ ]`) syntax. Backend work is test-first; frontend logic in `lib/` is test-first with Vitest; visual components are verified with lint, typecheck, build and a browser click-through against the Fireflies reference.

**Goal:** Make the frontend look and behave like the logged-in Fireflies workspace (light by default with a Light/Dark/System theme, icon rail, Fireflies meeting page, three-column library, Home, Tasks, Settings), responsive down to phone width, with no regressions in the existing features.

**Architecture:**
- Only the presentation layer changes, plus one read-only backend endpoint (`GET /api/action-items`).
- Colours become CSS variables, so a theme flips by setting `data-theme` on `<html>`.
- Derived meeting insights (Smart Search) are pure functions in `lib/` over data the page already has.

**Tech stack:** Next.js 16 (App Router, params as Promises), React 19, Tailwind v4 (`@theme`), TanStack Query v5, Radix (Dialog, DropdownMenu, Popover, Tooltip), sonner, lucide-react, Vitest. Backend: FastAPI, SQLAlchemy 2, pytest.

**Spec:** `docs/specs/2026-09-25-fireflies-ui-rework-design.md` (UI), plus `docs/specs/2026-09-25-fireflies-clone-design.md` (everything else).

## Global constraints

- Stack only: Next.js + TypeScript, FastAPI, SQLite. No new services.
- `frontend/src/lib/api.ts` stays the only file that calls `fetch`. No `dangerouslySetInnerHTML`.
- Keep all existing behaviour: URL-driven filters, two-way sync, `?t=` deep link, transcript search, optimistic action-item toggle, create/edit/delete dialogs, toasts.
- Light theme is the default. Theme preference key: `localStorage["theme"]`, values `light | dark | system`.
- Brand: our own SVG mark (magenta rounded square, white "F"). Never the Fireflies logo file. No ".clone" text. Title template `%s · Fireflies`.
- Verification per task: `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build` (in `frontend/`), and `.venv/Scripts/python -m pytest` (in `backend/`) when backend changes.
- Commits: one per page or task, plain messages, only the files that belong to the change. Push after each verified page.
- Responsive targets: 1440, 1024, 768 and 390 px wide. No horizontal page scroll at any width.

## File map

| File | Responsibility |
|---|---|
| `src/app/globals.css` | Theme variables (light on `:root`, dark on `[data-theme=dark]`), Tailwind `@theme` mapping, semantic tokens |
| `src/lib/theme.ts` (+ test) | `ThemePreference` type, `resolveTheme()`, `readPreference()`, `applyTheme()`, and the pre-paint script string |
| `src/hooks/useTheme.ts` | React hook: current preference, setter, follows the system when `system` |
| `src/components/layout/BrandMark.tsx` | The SVG "F" mark |
| `src/components/layout/IconRail.tsx` | 56px icon navigation with tooltips (replaces `Sidebar.tsx`) |
| `src/components/layout/Topbar.tsx` | Page title, Ctrl+K search, Upgrade, notifications, Capture split button |
| `src/components/layout/CaptureButton.tsx` | "Capture ▾" split button; opens the create dialog on the right tab |
| `src/components/layout/AppShell.tsx` | Rail + (top bar unless on a meeting page) + main |
| `src/components/ui/Tooltip.tsx`, `Popover.tsx`, `Tabs.tsx` | Radix wrappers styled with tokens |
| `src/lib/smartSearch.ts` (+ test) | AI-filter matchers, counts, speaker talk time |
| `src/lib/actionItems.ts` (+ test) | `groupByAssignee()` for the notes panel and the Tasks page |
| `src/components/meeting-detail/*` | New layout: `MeetingTopBar`, `SmartSearchPanel`, `NotesPanel` (restyled), `RightPanel` (AskFred/Transcript tabs), `PlayerBar` (full width) |
| `src/components/meetings/*` | `ChannelsPanel`, `FiltersPopover`, `AskFredPanel`, restyled `MeetingRow` |
| `src/app/page.tsx` + `src/components/home/*` | Home |
| `src/app/tasks/page.tsx` + `src/components/tasks/*` | Tasks |
| `src/app/settings/page.tsx` + `src/components/settings/*` | Settings with the theme picker |
| `backend/app/routers/action_items.py`, `services/action_item_service.py`, `schemas/action_item.py`, `tests/test_tasks_api.py` | `GET /api/action-items` |

---

### Task 1: Theme system and Fireflies shell

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/layout/AppShell.tsx`, `src/components/layout/Topbar.tsx`, `src/components/layout/ProfileMenu.tsx`, `src/components/ui/Button.tsx`, `Dialog.tsx`, `DropdownMenu.tsx`, `Avatar.tsx`, `ComingSoon.tsx`, `EmptyState.tsx`, plus every file using `bg-white` (33 uses)
- Create: `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/hooks/useTheme.ts`, `src/components/layout/BrandMark.tsx`, `src/components/layout/IconRail.tsx`, `src/components/layout/CaptureButton.tsx`, `src/components/ui/Tooltip.tsx`, `src/app/tasks/page.tsx` (temporary ComingSoon, replaced in Task 6), `src/app/skills/page.tsx`
- Delete: `src/components/layout/Sidebar.tsx`, `src/components/layout/Logo.tsx`, `src/components/layout/UploadButton.tsx` (replaced by CaptureButton)

**Interfaces (produced):**
- `type ThemePreference = "light" | "dark" | "system"`; `type ResolvedTheme = "light" | "dark"`
- `resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme`
- `parsePreference(raw: string | null): ThemePreference` (unknown → `"light"`)
- `THEME_SCRIPT: string`, an inline script that sets `data-theme` before paint
- `useTheme(): { preference: ThemePreference; resolved: ResolvedTheme; setPreference(p: ThemePreference): void }`
- `CaptureButton` and `openCreateDialog`: the create dialog accepts `initialTab?: "upload" | "paste"`
- Semantic Tailwind colours: `canvas` (page), `surface` (panels, cards), `raised` (chips, pills, hovers), `line` (borders), `link` (timestamp links)

- [ ] **Step 1: Failing test** `src/lib/theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsePreference, resolveTheme } from "./theme";

describe("theme", () => {
  it("defaults unknown or missing values to light", () => {
    expect(parsePreference(null)).toBe("light");
    expect(parsePreference("purple")).toBe("light");
    expect(parsePreference("dark")).toBe("dark");
    expect(parsePreference("system")).toBe("system");
  });
  it("resolves system from the OS setting and keeps explicit choices", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
```

- [ ] **Step 2:** `npx vitest run src/lib/theme.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `src/lib/theme.ts`:

```ts
// Theme preference: Light / Dark / System, like Fireflies' Appearance setting.
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

/** Runs before React hydrates, so a dark-theme user never sees a light flash. Storage can throw, hence try/catch. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;
```

- [ ] **Step 4:** `npx vitest run src/lib/theme.test.ts`. Expected: PASS.
- [ ] **Step 5: Colour tokens.** In `globals.css`, move the literal values into variables and point the Tailwind scale at them:

```css
@theme inline {
  --color-gray-25: var(--gray-25); /* … one line per step 25–900 */
  --color-brand-25: var(--brand-25); /* … 25–900 */
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-raised: var(--raised);
  --color-line: var(--line);
  --color-link: var(--link);
  --color-highlight: var(--highlight);
  --color-highlight-active: var(--highlight-active);
}
:root { /* light = today's Untitled-UI values */
  --canvas: #ffffff; --surface: #ffffff; --raised: #f9fafb; --line: #eaecf0; --link: #175cd3;
  --gray-25: #fcfcfd; … --gray-900: #101828;
  --brand-25: #fafaff; … --brand-900: #3e1c96;
  --highlight: #fef0c7; --highlight-active: #fdb022;
  color-scheme: light;
}
[data-theme="dark"] { /* sampled from Fireflies dark */
  --canvas: #131314; --surface: #1e1e1f; --raised: #292929; --line: #2e2e30; --link: #84caff;
  --gray-25: #1a1a1b; --gray-50: #232324; --gray-100: #2a2a2c; --gray-200: #333336; --gray-300: #45454a;
  --gray-400: #868686; --gray-500: #aeaeb2; --gray-600: #c7c7cc; --gray-700: #d1d1d6; --gray-800: #ececf0; --gray-900: #fafafb;
  --brand-25: #1c1830; --brand-50: #241d3f; --brand-100: #2f2553; --brand-200: #3e3170;
  --brand-300: #6a5acd; --brand-400: #9b8afb; --brand-500: #7a5af8; --brand-600: #8f75ff; --brand-700: #b3a3ff; --brand-800: #cfc4ff; --brand-900: #e5deff;
  --highlight: #5c4400; --highlight-active: #b7791f;
  color-scheme: dark;
}
body { background: var(--canvas); color: var(--gray-900); }
```

Replace every `bg-white` with `bg-surface` (panels, cards, inputs, menus) and the page background `bg-gray-25` with `bg-canvas`. Replace `border-gray-200` dividers with `border-line` in layout components only (the gray scale also flips, so the rest stays correct). `ring-white` on avatars becomes `ring-surface`.

- [ ] **Step 6: Pre-paint script and title.** `layout.tsx`: `<html lang="en" data-theme="light" suppressHydrationWarning …>`, `<head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>`. (This is the one allowed use: a static string constant, never user content. It's documented in a comment.) Title template: `{ default: "Fireflies", template: "%s · Fireflies" }`. The meeting page sets `document.title = \`${title} · Fireflies\``.
- [ ] **Step 7: `useTheme`.** Reads `parsePreference(localStorage)` inside try/catch. Subscribes to `matchMedia("(prefers-color-scheme: dark)")` while the preference is `system`. `setPreference` writes storage (try/catch) and sets `document.documentElement.dataset.theme`.
- [ ] **Step 8: `BrandMark`.** A 28px SVG: a rounded square filled with a linear gradient (#e4247b to #ff5a8a) and a white geometric "F" built from three rects. `aria-hidden`, wrapped in a `Link href="/"` with `aria-label="Home"`.
- [ ] **Step 9: `Tooltip`.** A Radix Tooltip wrapper: `side="right"`, 6px radius, `bg-gray-900 text-white text-xs` (flips in dark). Add `@radix-ui/react-tooltip` and `@radix-ui/react-popover` with `npm i`.
- [ ] **Step 10: `IconRail`** (`w-14`, full height, `border-r border-line bg-surface`). Top: the BrandMark. Then groups separated by a 1px line:
  - `Home` (House, `/`), `AskFred` (Bot, `/askfred`);
  - `Meetings` (Video, `/meetings`, active for `/meetings*`), `Tasks` (ListChecks, `/tasks`), `Skills` (Sparkles, `/skills`);
  - `Analytics` (ChartColumn, `/analytics`), `Agents` (BotMessageSquare, `/live`), `Upgrade` (Zap, toast "Plans are out of scope for this demo").
  - Bottom: `Invite teammates` (UserPlus, `/team`), `Integrations` (Layers, `/integrations`), `Settings` (Settings, `/settings`), then the ProfileMenu avatar.
  - Each item is a 40×40 rounded-lg button with `aria-label`, a Tooltip, and `aria-current="page"`; the active one gets `bg-brand-50 text-brand-600`.
  - Phones: the rail stays `w-14`, and tooltips are hidden on touch (Radix default).
- [ ] **Step 11: `Topbar`** (`h-14 border-b border-line bg-surface`):
  - left: the page title from a `usePathname()` map (`/`→Home, `/meetings`→Meetings, `/tasks`→Tasks, `/settings`→Settings, others → their ComingSoon title);
  - centre: the search box (max-w-md, placeholder "Search by title or keyword", a `Ctrl K` kbd hint on ≥ md, and a global keydown listener for Ctrl/⌘+K that focuses it). Submit behaviour is unchanged (`/meetings?q=`);
  - right: `Upgrade` (outlined green text like Fireflies, toast), `NotificationsButton`, `CaptureButton`;
  - below 640px the search collapses to an icon button that expands the box over the title.
- [ ] **Step 12: `CaptureButton`.** Primary part: "Capture" with a Video icon, which opens the create dialog on the upload tab. Chevron part: a dropdown with Add to live meeting (toast "Live capture is coming soon"), Schedule new meeting (toast), Upload audio or video (upload tab), Paste transcript (paste tab). `CreateMeetingDialog` gains an `initialTab` prop that feeds `useState(initialTab)`.
- [ ] **Step 13: `AppShell`:** `flex h-dvh`, then the rail, then a column holding `Topbar` (hidden when `pathname` matches `/meetings/[id]`) and `<main className="min-h-0 flex-1 overflow-y-auto bg-canvas">`. Delete `Sidebar.tsx`, `Logo.tsx` and `UploadButton.tsx`, and swap the library's empty-state `UploadButton` for `CaptureButton`.
- [ ] **Step 14: Placeholder pages.** `/skills` gets ComingSoon (Sparkles, "AI Skills"), and `/tasks` a temporary ComingSoon. The ComingSoon "Back to meetings" link stays. Then `npx next typegen`.
- [ ] **Step 15: Verify.** Lint, typecheck, vitest and build all pass. In the browser at 1440 and 390 px: the rail, tooltips, Ctrl+K, Capture menu → dialog tabs, and every existing page renders in both themes (toggle temporarily with `document.documentElement.dataset.theme='dark'`).
- [ ] **Step 16: Commit** with `git commit -m "feat(frontend): Fireflies shell with icon rail, capture menu and light/dark theme tokens"`.

### Task 2: Meeting page in the Fireflies layout

**Files:**
- Create: `src/lib/actionItems.ts`, `src/lib/actionItems.test.ts`, `src/components/meeting-detail/MeetingTopBar.tsx`, `src/components/meeting-detail/RightPanel.tsx`, `src/components/ui/Tabs.tsx`
- Modify: `MeetingDetailView.tsx`, `NotesPanel.tsx`, `ActionItemsList.tsx`, `ActionItemRow.tsx`, `TranscriptPanel.tsx`, `TranscriptLine.tsx`, `TranscriptSearchBar.tsx`, `PlayerBar.tsx`
- Delete: `MeetingHeader.tsx` (replaced by MeetingTopBar)

**Interfaces:**
- `groupByAssignee(items: ActionItem[], people: {id:number; name:string}[]): { assigneeId: number | null; name: string; items: ActionItem[] }[]`. Groups are ordered by first appearance, with "Unassigned" last. Inside a group: open first, then by id.
- `Tabs`: `<Tabs value onValueChange items={[{value,label,badge?}]} />`, a pill segmented control (`bg-raised` track, `bg-surface` active pill, 6px radius).

- [ ] **Step 1: Failing test** `src/lib/actionItems.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ActionItem } from "./types";
import { groupByAssignee } from "./actionItems";

const item = (id: number, assignee_id: number | null, is_done = false): ActionItem => ({
  id, meeting_id: 1, text: `t${id}`, assignee_id, segment_id: null, start_ms: null,
  is_done, completed_at: is_done ? "2026-01-01T00:00:00Z" : null, source: "ai", created_at: "2026-01-01T00:00:00Z",
});
const people = [{ id: 7, name: "Priya Nair" }, { id: 8, name: "Marcus Chen" }];

describe("groupByAssignee", () => {
  it("groups by person in order of first appearance, unassigned last, open before done", () => {
    const groups = groupByAssignee([item(1, 8), item(2, null), item(3, 7, true), item(4, 7)], people);
    expect(groups.map((g) => g.name)).toEqual(["Marcus Chen", "Priya Nair", "Unassigned"]);
    expect(groups[1].items.map((i) => i.id)).toEqual([4, 3]);
  });
  it("returns no groups for no items", () => {
    expect(groupByAssignee([], people)).toEqual([]);
  });
});
```

- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement** `src/lib/actionItems.ts`:

```ts
import type { ActionItem } from "./types";

export interface AssigneeGroup {
  assigneeId: number | null;
  name: string;
  items: ActionItem[];
}

/** Fireflies lists action items under each person's name. Unassigned items go last. */
export function groupByAssignee(items: ActionItem[], people: { id: number; name: string }[]): AssigneeGroup[] {
  const names = new Map(people.map((person) => [person.id, person.name]));
  const groups = new Map<number | null, AssigneeGroup>();
  for (const item of [...items].sort((a, b) => a.id - b.id)) {
    const key = item.assignee_id !== null && names.has(item.assignee_id) ? item.assignee_id : null;
    if (!groups.has(key)) groups.set(key, { assigneeId: key, name: key === null ? "Unassigned" : names.get(key)!, items: [] });
    groups.get(key)!.items.push(item);
  }
  const ordered = [...groups.values()].sort((a, b) => Number(a.assigneeId === null) - Number(b.assigneeId === null));
  for (const group of ordered) group.items.sort((a, b) => Number(a.is_done) - Number(b.is_done) || a.id - b.id);
  return ordered;
}
```

Note: sorting by id first gives "first appearance" order, because AI items are inserted in transcript order.

- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5: `MeetingTopBar`** (`h-14 border-b border-line bg-surface px-4`):
  - left: a `Menu` icon button that links to `/meetings` on phones (the rail is still there);
  - breadcrumb: `Link "#All Meetings"` → `/meetings`, then `/`, then the truncated title (with a `title` attribute);
  - an `Ellipsis` dropdown: Edit details, Copy link, Download (toast "Export arrives soon", later wired in Task 19 of the main plan), a separator, then Delete meeting (danger);
  - right: `Upgrade` (toast), then a **Share** primary button with a Globe icon. It copies `origin + /meetings/{id}` and toasts "Meeting link copied". Its `aria-label` is "Copy meeting link".
- [ ] **Step 6: Layout in `MeetingDetailView`.** A column: `MeetingTopBar`, then `flex-1 min-h-0` with three regions, then `PlayerBar` at full width.
  - `xl` (≥ 1280): `grid-cols-[300px_minmax(0,1fr)_minmax(0,440px)]`, Smart Search | Notes | RightPanel.
  - `lg` (1024–1279): `grid-cols-[48px_minmax(0,1fr)_minmax(0,400px)]`. Smart Search shows only its icon strip; clicking an icon opens the panel as an overlay drawer from the left.
  - `< lg`: a single column with `Tabs` at the top: Notes | Transcript | Insights (Smart Search). The player stays fixed at the bottom. The Transcript tab is the default on phones, because sync is the core demo.
  - Until Task 3, the Smart Search region renders a `SmartSearchPlaceholder` skeleton column with the heading "Smart Search".
- [ ] **Step 7: `NotesPanel` in Fireflies style**, `mx-auto max-w-3xl px-6 py-6`, no card borders:
  - the `Tabs` [Notes, AI Skills (badge "0")], where AI Skills shows a ComingSoon-style empty state;
  - the title (`text-2xl font-medium text-gray-900`);
  - a meta row: owner name (Jordan Lee, from `useMe`) with an underline · `formatMeetingDate` · `formatDuration` · "N participants", then the AvatarStack;
  - keywords as `bg-raised` chips with a 4px radius (`text-xs text-gray-700`);
  - the "✦ General Summary" label row (`text-sm text-gray-500`, Sparkles icon) and a copy-notes icon button (copies overview, notes and action items as plain text; toast "Notes copied");
  - **Overview**: a paragraph (`text-[15px] leading-7 text-gray-800`);
  - **Notes**: a `list-disc` of `summary.notes`;
  - **Outline**: each chapter is a `font-medium` title, then the gist, then a `(mm:ss)` link button in `text-link` that seeks. The active chapter gets a left brand bar;
  - **Action items**: `groupByAssignee`. Each group has a bold name heading, then `ActionItemRow`s restyled as bullet-width rows: checkbox, text, and a `(mm:ss)` link in `text-link`. The assign and delete controls appear on hover and focus (always visible on touch: `[@media(hover:none)]:opacity-100`). The add-row stays under the list;
  - the empty state and generated_by provenance stay as a small line under the title: "Notes generated from the transcript" or "Notes by {model}".
- [ ] **Step 8: `RightPanel`.** Tabs AskFred | Transcript, defaulting to Transcript.
  - **AskFred** (placeholder, no network): a gradient greeting "Hi Jordan! Ask anything about this meeting", three suggested questions built from keywords ("What was decided about {keyword}?"), a textarea "Ask anything…" with a send button. Send shows a toast "AskFred is coming soon"; the textarea is kept.
  - **Transcript**: the existing TranscriptPanel with these restyles:
    - search placeholder "Find in transcript" (a replace feature is out of scope);
    - the "N lines · click a line…" hint moves to a tooltip;
    - `TranscriptLine`: a square `rounded-md size-6` avatar with the initial, then `Name · 00:00` (timestamp `text-link` underline on hover), then text `text-[15px] leading-7`;
    - the active line: `bg-brand-25` with a 2px left brand bar;
    - the Smart Search filter (Task 3) narrows the lines.
- [ ] **Step 9: `PlayerBar`, full width.**
  - A thin (4px) seek track across the whole top edge: filled in brand, chapter ticks, and the existing range input stretched over it, with a thumb shown on hover and focus.
  - Row below (`h-14 px-4`): left, `currentTime / duration` (tabular); centre, the speed dropdown ("1×"), RotateCcw −15, a round Play/Pause (40px, `bg-brand-500`), RotateCw +15; right, an Info icon with a Tooltip ("Simulated playback: there's no audio for these transcripts, so the player follows the transcript timeline").
  - Phones: speed and info are hidden below 400px.
- [ ] **Step 10: Verify.** Lint, typecheck, vitest and build. In the browser: open meeting 1; click a line and it seeks; play and the highlight follows with auto-scroll; transcript search "pricing" with next/previous; chapter link seeks; action items add, complete, assign and delete; edit and delete from the "…" menu; Share copies the link; `?t=90` opens at 1:30. Check 1440, 1024 and 390 px in light and dark.
- [ ] **Step 11: Commit** with `git commit -m "feat(frontend): Fireflies meeting page with notes, transcript tabs and full-width player"`.

### Task 3: Smart Search panel

**Files:**
- Create: `src/lib/smartSearch.ts`, `src/lib/smartSearch.test.ts`, `src/components/meeting-detail/SmartSearchPanel.tsx`
- Modify: `MeetingDetailView.tsx` (filter state), `TranscriptPanel.tsx` (accepts `visibleIndexes`)

**Interfaces:**
- `type SmartFilter = "questions" | "tasks" | "metrics" | "dates"`
- `matchSmartFilter(filter: SmartFilter, text: string): boolean` (for `tasks`, pass the segment id through `taskSegmentIds` instead)
- `smartFilterIndexes(filter, segments: Segment[], taskSegmentIds: Set<number>): number[]` gives the indexes of matching segments
- `speakerStats(segments: Segment[], people: {id:number; name:string}[]): { id: number; name: string; talkMs: number; share: number; wpm: number }[]`, sorted by talkMs descending. `share` is 0–100, rounded, and the shares sum to 100 when there's any talk. `wpm = round(words / (talkMs / 60000))`, or 0 when talkMs is 0.

- [ ] **Step 1: Failing test** `src/lib/smartSearch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Segment } from "./types";
import { matchSmartFilter, smartFilterIndexes, speakerStats } from "./smartSearch";

const seg = (id: number, speaker_id: number, start_ms: number, end_ms: number, text: string): Segment => ({
  id, position: id, speaker_id, start_ms, end_ms, text,
});

describe("matchSmartFilter", () => {
  it("finds questions by their question mark", () => {
    expect(matchSmartFilter("questions", "Can you send it by Friday?")).toBe(true);
    expect(matchSmartFilter("questions", "Send it by Friday.")).toBe(false);
  });
  it("finds metrics: numbers, percentages and money", () => {
    expect(matchSmartFilter("metrics", "Conversion rose 12% last week")).toBe(true);
    expect(matchSmartFilter("metrics", "It costs $40 per seat")).toBe(true);
    expect(matchSmartFilter("metrics", "We shipped three things")).toBe(false);
  });
  it("finds dates and times", () => {
    expect(matchSmartFilter("dates", "Let's ship it next Tuesday")).toBe(true);
    expect(matchSmartFilter("dates", "Send it by tomorrow at 3pm")).toBe(true);
    expect(matchSmartFilter("dates", "The chart looks fine")).toBe(false);
  });
});

describe("smartFilterIndexes", () => {
  it("uses action-item segment ids for tasks", () => {
    const segments = [seg(1, 1, 0, 1000, "Hello."), seg(2, 1, 1000, 2000, "I'll do it.")];
    expect(smartFilterIndexes("tasks", segments, new Set([2]))).toEqual([1]);
  });
});

describe("speakerStats", () => {
  it("computes talk share and words per minute per speaker", () => {
    const segments = [
      seg(1, 1, 0, 60_000, Array(120).fill("word").join(" ")),
      seg(2, 2, 60_000, 90_000, Array(30).fill("word").join(" ")),
    ];
    const stats = speakerStats(segments, [{ id: 1, name: "Ann" }, { id: 2, name: "Bob" }]);
    expect(stats.map((s) => [s.name, s.share, s.wpm])).toEqual([["Ann", 67, 120], ["Bob", 33, 60]]);
  });
  it("handles an empty transcript", () => {
    expect(speakerStats([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Implement** `src/lib/smartSearch.ts`:

```ts
// "Smart Search" insights, computed in the browser from the transcript the page already loaded.
import type { Segment } from "./types";

export type SmartFilter = "questions" | "tasks" | "metrics" | "dates";

const METRIC = /(\d[\d,.]*\s?%|[$€£₹]\s?\d|\b\d+(?:[.,]\d+)?\s?(?:k|m|bn|percent|users|customers|seats|days|weeks|hours|minutes)?\b)/i;
const DATE = new RegExp(
  [
    "\\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\\b",
    "\\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}\\b",
    "\\b(?:today|tomorrow|tonight|yesterday|next week|next month|this week|end of (?:day|week|month)|eod|eow|q[1-4])\\b",
    "\\b\\d{1,2}(?::\\d{2})?\\s?(?:am|pm)\\b",
  ].join("|"),
  "i",
);

export function matchSmartFilter(filter: Exclude<SmartFilter, "tasks">, text: string): boolean {
  if (filter === "questions") return text.trim().endsWith("?") || /\?\s/.test(text);
  if (filter === "metrics") return METRIC.test(text);
  return DATE.test(text);
}

export function smartFilterIndexes(filter: SmartFilter, segments: Segment[], taskSegmentIds: Set<number>): number[] {
  const indexes: number[] = [];
  segments.forEach((segment, index) => {
    const hit = filter === "tasks" ? taskSegmentIds.has(segment.id) : matchSmartFilter(filter, segment.text);
    if (hit) indexes.push(index);
  });
  return indexes;
}

export interface SpeakerStat {
  id: number;
  name: string;
  talkMs: number;
  share: number;
  wpm: number;
}

export function speakerStats(segments: Segment[], people: { id: number; name: string }[]): SpeakerStat[] {
  const totals = new Map<number, { talkMs: number; words: number }>();
  for (const segment of segments) {
    const entry = totals.get(segment.speaker_id) ?? { talkMs: 0, words: 0 };
    entry.talkMs += Math.max(0, segment.end_ms - segment.start_ms);
    entry.words += segment.text.split(/\s+/).filter(Boolean).length;
    totals.set(segment.speaker_id, entry);
  }
  const allMs = [...totals.values()].reduce((sum, entry) => sum + entry.talkMs, 0);
  const names = new Map(people.map((person) => [person.id, person.name]));
  const stats = [...totals.entries()].map(([id, entry]) => ({
    id,
    name: names.get(id) ?? "Unknown speaker",
    talkMs: entry.talkMs,
    share: allMs > 0 ? (entry.talkMs / allMs) * 100 : 0,
    wpm: entry.talkMs > 0 ? Math.round(entry.words / (entry.talkMs / 60_000)) : 0,
  }));
  stats.sort((a, b) => b.talkMs - a.talkMs);
  // Round the shares so they still add up to 100 (largest remainder goes first).
  const floors = stats.map((s) => Math.floor(s.share));
  let left = allMs > 0 ? 100 - floors.reduce((a, b) => a + b, 0) : 0;
  const order = stats.map((s, i) => [s.share - floors[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) if (left-- > 0) floors[i] += 1;
  return stats.map((s, i) => ({ ...s, share: floors[i] }));
}
```

- [ ] **Step 4:** Run it. Expected: PASS. If the "three things" case trips METRIC because of the optional-unit number branch, tighten it: a bare number counts only with a unit, %, or currency, or when it has 2+ digits. Adjust the regex until the test passes without weakening the positives.
- [ ] **Step 5: `SmartSearchPanel`** (`bg-surface border-r border-line`, scrolls):
  - a header with a Search icon and "Smart Search";
  - **AI FILTERS** (`text-xs uppercase text-gray-400`, collapsible): a 2×2 grid of chips (`bg-raised rounded` with a coloured dot, label and count) for Questions (pink), Tasks (orange), Metrics (cyan) and Date & Time (teal). A chip with count 0 is disabled. The active chip gets `ring-1 ring-brand-300 bg-brand-50`;
  - **SPEAKER TALKTIME**: rows with a square avatar, name, `wpm` and `share%`, plus a thin bar `width: share%`;
  - **TOPIC TRACKERS**: keywords as chips. Clicking one calls `onKeyword(k)`, which puts the keyword into the transcript search and switches to the Transcript tab on phones.
  - The lg icon strip shows Search, Mic (talk time) and Hash (topics), each opening the drawer at its section.
- [ ] **Step 6: Wire the filter.** `MeetingDetailView` holds `smartFilter: SmartFilter | null`. `visibleIndexes = smartFilter ? smartFilterIndexes(...) : null`. `TranscriptPanel` gets `visibleIndexes?: number[] | null`; when set, it renders only those lines (keeping `data-line-index` = the original index, so sync and scroll still work) plus a bar "Showing 4 questions · Clear". The transcript search keeps working over the visible lines.
- [ ] **Step 7: Verify** in the browser: counts look right on meetings 1 and 6; each filter narrows the list and the highlight still follows playback; keyword → search. Lint, typecheck, vitest and build all pass.
- [ ] **Step 8: Commit** with `git commit -m "feat(frontend): Smart Search panel with transcript filters, talk time and topics"`.

### Task 4: Meetings library in the three-column layout

**Files:**
- Create: `src/components/ui/Popover.tsx`, `src/components/meetings/ChannelsPanel.tsx`, `src/components/meetings/FiltersPopover.tsx`, `src/components/meetings/AskFredPanel.tsx`
- Modify: `MeetingsLibrary.tsx`, `MeetingRow.tsx`, `MeetingList.tsx`, `lib/filters.ts` (+ `filters.test.ts`)
- Delete: `MeetingFilters.tsx`

**Interfaces:**
- `LibraryFilters` gains `preset: "any" | "today" | "7d" | "14d" | "30d" | "custom"` and `sources: MeetingSource[]` (URL `source`, repeatable). `toApiParams`: `today` → `date_from` = local midnight; `14d` → 13 days back; `sources` → `source`. `view=uploads` still forces `["upload","paste"]`.
- `hasActiveFilters` counts `sources.length > 0`.

- [ ] **Step 1: Failing tests** added to `src/lib/filters.test.ts`:

```ts
it("parses and serializes today/14d presets and source filters", () => {
  const f = parseFilters(new URLSearchParams("preset=14d&source=upload&source=seed"));
  expect(f.preset).toBe("14d");
  expect(f.sources).toEqual(["upload", "seed"]);
  expect(serializeFilters(f).toString()).toBe("preset=14d&source=upload&source=seed");
});
it("maps today and 14d to local-midnight lower bounds", () => {
  const now = new Date(2026, 8, 25, 15, 0);
  expect(toApiParams({ ...DEFAULT_FILTERS, preset: "today" }, now).date_from).toBe(new Date(2026, 8, 25).toISOString());
  expect(toApiParams({ ...DEFAULT_FILTERS, preset: "14d" }, now).date_from).toBe(new Date(2026, 8, 12).toISOString());
});
it("passes chosen sources to the API", () => {
  expect(toApiParams({ ...DEFAULT_FILTERS, sources: ["paste"] }, new Date()).source).toEqual(["paste"]);
});
```

- [ ] **Step 2:** Run it. Expected: FAIL. **Step 3:** Implement in `filters.ts`: valid presets `["today","7d","14d","30d","custom"]`; `sources` parsed from `getAll("source")` filtered to known values; days back `{today:0, "7d":6, "14d":13, "30d":29}`. **Step 4:** Run it. Expected: PASS (the old filter tests still pass).
- [ ] **Step 5: `ChannelsPanel`** (`w-60 border-r border-line bg-surface`, hidden below lg; below lg a `Select`-style dropdown above the list replaces it):
  - a "Search channels" input (filters the channel list client-side; there are no channels, so it's cosmetic);
  - items with icons: `# My Meetings` (`/meetings`), `All Meetings` (`/meetings?scope=all`, the same list; the scope is just highlighted), `Voice Agent Meetings` (disabled, Soon), `Uploads` with a NEW badge (`/meetings?view=uploads`);
  - an "All channels" section: a `#` icon, "Create channels to organize your conversations", and a "+ Channel" button (toast "Channels are coming soon").
- [ ] **Step 6: `FiltersPopover`** (a Radix Popover; the trigger is a "Filters" button with a count badge):
  - left pane categories: Participants, Date Range, Captured From;
  - right pane:
    - **Participants**: a search input and a checkbox list from `useParticipants()`, with meeting counts;
    - **Date Range**: radios Any Time / Today / Last 7 Days / Last 14 Days / Last 30 Days, then "Custom Date Range" with two date inputs;
    - **Captured From**: checkboxes Uploaded file / Pasted transcript / Recorded (seed);
  - footer: "Clear All Filters". Changes apply immediately (URL).
- [ ] **Step 7: Centre toolbar:**
  - `Hosted by me | Shared with me` segmented buttons. "Shared with me" sets local state and shows EmptyState "Nothing shared with you yet", with "Sharing is coming soon";
  - `FiltersPopover`;
  - the sort toggle (ArrowUpDown "Newest"/"Oldest");
  - a search icon button that expands to an inline input bound to `q` (debounced 300ms, `useDebouncedValue`);
  - active filters show as removable chips below the toolbar (participant names, date label, sources, the "q" text).
- [ ] **Step 8: `MeetingRow` in Fireflies style:** a white row, `px-4 py-3`, hover `bg-raised`, no card border, a divider `border-b border-line`.
  - left: a 36px `rounded-lg` source tile (`bg-brand-50`, icon);
  - title `text-sm font-medium`; below it `date · duration`;
  - right: AvatarStack, an open-tasks pill (`ListChecks 3`), and the "…" menu (unchanged);
  - the match snippet is kept.
  - Day group headings: `text-xs font-medium text-gray-500 px-4 py-2 bg-canvas` (sticky).
- [ ] **Step 9: `AskFredPanel`** (`w-[380px] border-l border-line`, shown at ≥ xl):
  - a header with the AskFred bot icon and a "new chat" icon button (disabled);
  - the gradient greeting "Hi Jordan! Get ready for your meeting";
  - chips "My action items" (→ `/tasks`) and "Key topics" (toast);
  - an input with "# My Meetings" context, "Ask anything. Type / to run AI skills.", a send button → toast "AskFred is coming soon".
- [ ] **Step 10: Verify** in the browser: search, every filter category, sort, the uploads view, clear, load more, and the empty/error states; widths 1440/1024/390; light and dark. Lint, typecheck, vitest and build.
- [ ] **Step 11: Commit** with `git commit -m "feat(frontend): three-column meetings library with Fireflies filters popover"`.

### Task 5: Home

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/home/HomeView.tsx`

- [ ] **Step 1:** `page.tsx` renders `<HomeView />` (a client component). Its content is `mx-auto max-w-4xl px-6 py-8`:
  - **Welcome banner:** `rounded-2xl` with a warm gradient in light (`from-[#fff4ed] to-[#fdeff4]`) and `from-[#3a1d0e] to-[#2a1420]` in dark. Title "Welcome aboard, {firstName}!" and the line "Your workspace is ready. Upload a transcript to see notes, action items and a synced transcript." On the right, a mock player card (a violet gradient tile with a play icon) that links to the newest meeting.
  - **Quick Start:** heading and subtitle, then three cards in a `grid md:grid-cols-3 gap-3`:
    - Schedule Meeting (Calendar icon, rose tint; toast "Calendar sync is coming soon");
    - Upload File (Upload icon, green tint; create dialog, upload tab);
    - Capture Meeting (Plus, violet tint; toast "Live capture is coming soon").
    - Each card: `rounded-xl border`, icon, label and ChevronRight.
  - **Tabs** Recent | Upcoming | AI Feed, with a "Settings" link on the right (→ `/settings`):
    - **Recent:** `useMeetings({ sort: "newest", limit: 5 })`; rows show the BrandMark-style tile, title and `formatMeetingDate`, each linking to the meeting; skeleton and empty state;
    - **Upcoming:** EmptyState with a Calendar icon, "No upcoming meetings", "Connect a calendar to see what's next (coming soon).";
    - **AI Feed:** the 5 newest meetings, each a card with title, date and the first 180 characters of the overview. The list endpoint has no overview, so fetch details with `useQueries` over the 5 ids (5 small requests are acceptable) and show a skeleton while loading.
- [ ] **Step 2: Verify** at three widths, in light and dark; lint, typecheck and build.
- [ ] **Step 3: Commit** with `git commit -m "feat(frontend): Home with welcome, quick start and recent meetings"`.

### Task 6: Tasks page and endpoint

**Files:**
- Backend: modify `app/schemas/action_item.py`, `app/services/action_item_service.py`, `app/routers/action_items.py`; create `tests/test_tasks_api.py`
- Frontend: modify `lib/types.ts`, `lib/api.ts`, `lib/queries.ts`, `src/app/tasks/page.tsx`; create `src/components/tasks/TasksView.tsx`, `src/components/tasks/NewTaskDialog.tsx`

**Interfaces:**
- `GET /api/action-items?scope=mine|all&status=open|done|all` (defaults `all`, `all`) → `{ items: TaskOut[] }`
- `TaskOut` = `ActionItemOut` fields plus `meeting_title: str`, `meeting_started_at: UTCDateTime`, `assignee_name: str | None`
- `action_item_service.list_tasks(db, owner, *, scope: Literal["mine","all"], status: Literal["open","done","all"]) -> list[TaskOut]`
- Frontend: `listTasks(params: {scope, status}): Promise<{items: TaskItem[]}>`; `useTasks(params)` with key `['tasks', params]`. Every action-item mutation also invalidates `['tasks']`.

- [ ] **Step 1: Failing tests** `backend/tests/test_tasks_api.py`:

```python
from tests.factories import make_meeting_rows, make_user
from tests.test_meetings_api import create


def jordan_id(meeting):
    return next(p["id"] for p in meeting["participants"] if p["name"] == "Jordan Lee")


def test_lists_all_tasks_across_meetings_with_meeting_context(client):
    a = create(client, title="Alpha")
    b = create(client, title="Beta")
    client.post(f"/api/meetings/{a['id']}/action-items", json={"text": "From alpha"})
    client.post(f"/api/meetings/{b['id']}/action-items", json={"text": "From beta"})
    items = client.get("/api/action-items").json()["items"]
    mine = [i for i in items if i["text"] in {"From alpha", "From beta"}]
    assert {i["meeting_title"] for i in mine} == {"Alpha", "Beta"}
    assert all("meeting_started_at" in i and "assignee_name" in i for i in items)


def test_mine_returns_only_items_assigned_to_the_current_user(client):
    m = create(client, participants=["Jordan Lee"])
    client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Mine", "assignee_id": jordan_id(m)})
    client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Not mine"})
    texts = [i["text"] for i in client.get("/api/action-items?scope=mine").json()["items"]]
    assert "Mine" in texts and "Not mine" not in texts
    assert client.get("/api/action-items?scope=mine").json()["items"][0]["assignee_name"] == "Jordan Lee"


def test_status_filter_and_open_first_ordering(client):
    m = create(client)
    done = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Done one"}).json()
    client.patch(f"/api/action-items/{done['id']}", json={"is_done": True})
    client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Open one"})
    open_texts = [i["text"] for i in client.get("/api/action-items?status=open").json()["items"]]
    assert "Open one" in open_texts and "Done one" not in open_texts
    done_texts = [i["text"] for i in client.get("/api/action-items?status=done").json()["items"]]
    assert done_texts == ["Done one"]
    all_items = client.get("/api/action-items").json()["items"]
    assert [i["is_done"] for i in all_items] == sorted(i["is_done"] for i in all_items)


def test_never_returns_other_users_tasks(client, db):
    other = make_user(db)
    make_meeting_rows(db, other, title="Secret")
    res = client.get("/api/action-items", headers={"X-User-Id": str(other.id)})
    assert res.status_code == 200
    create(client, title="Visible")
    assert all(i["meeting_title"] != "Secret" for i in client.get("/api/action-items").json()["items"])


def test_invalid_scope_is_422(client):
    assert client.get("/api/action-items?scope=everyone").status_code == 422
```

- [ ] **Step 2:** `.venv/Scripts/python -m pytest tests/test_tasks_api.py -v`. Expected: FAIL (404 / 405).
- [ ] **Step 3: Implement.**

Schema (append to `schemas/action_item.py`):

```python
class TaskOut(ActionItemOut):
    meeting_title: str
    meeting_started_at: UTCDateTime
    assignee_name: str | None


class TaskListOut(BaseModel):
    items: list[TaskOut]
```

Service (append to `action_item_service.py`; add `Participant` and `TaskOut` to the imports):

```python
def list_tasks(db: Session, owner: User, *, scope: str, status: str) -> list[TaskOut]:
    """Action items across all of the owner's meetings: open first, then newest meeting first."""
    query = (
        select(ActionItem, Meeting)
        .join(Meeting, Meeting.id == ActionItem.meeting_id)
        .where(Meeting.owner_id == owner.id)
    )
    if scope == "mine":
        me = select(Participant.id).where(Participant.user_id == owner.id).scalar_subquery()
        query = query.where(ActionItem.assignee_id == me)
    if status != "all":
        query = query.where(ActionItem.is_done == (status == "done"))
    query = query.order_by(ActionItem.is_done, Meeting.started_at.desc(), ActionItem.id)

    rows = db.execute(query).all()
    names = dict(db.execute(select(Participant.id, Participant.name)).all()) if rows else {}
    return [
        TaskOut(
            **to_action_item_out(item).model_dump(),
            meeting_title=meeting.title,
            meeting_started_at=meeting.started_at,
            assignee_name=names.get(item.assignee_id) if item.assignee_id else None,
        )
        for item, meeting in rows
    ]
```

Router (add to `routers/action_items.py`; `Literal` from typing, `Query` from fastapi):

```python
@router.get("/action-items", response_model=TaskListOut)
def list_action_items(
    scope: Literal["mine", "all"] = Query("all"),
    status: Literal["open", "done", "all"] = Query("all"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaskListOut:
    return TaskListOut(items=action_item_service.list_tasks(db, user, scope=scope, status=status))
```

Performance note: the names lookup loads every participant name. That's fine at demo scale, but in a larger system it should be scoped with `Participant.id.in_(assignee_ids)`. Implement it with `in_` from the start:
`ids = {item.assignee_id for item, _ in rows if item.assignee_id}`; `names = dict(db.execute(select(Participant.id, Participant.name).where(Participant.id.in_(ids))).all()) if ids else {}`.

- [ ] **Step 4:** Run `pytest tests/test_tasks_api.py -v`, then the full suite. Expected: all PASS.
- [ ] **Step 5: Frontend data.** `types.ts`: `TaskItem extends ActionItem { meeting_title: string; meeting_started_at: string; assignee_name: string | null }`, `TaskListParams { scope: "mine" | "all"; status: "open" | "done" | "all" }`. `api.ts`: `listTasks(params)` → GET `/api/action-items?scope=&status=`. `queries.ts`: `useTasks(params)`, and add `queryClient.invalidateQueries({ queryKey: ["tasks"] })` to the create, update and delete action-item mutations. Add `useUpdateTask()`, which calls `updateActionItem` and invalidates `['tasks']`, `['meeting', meeting_id]` and `['meetings']`.
- [ ] **Step 6: `TasksView`** (`mx-auto max-w-4xl px-6 py-8`):
  - `Tabs` My Tasks | All Tasks, chips Open | Completed | All, and a "+ New" primary button on the right;
  - a banner "Automatically send your tasks to your work apps" with Connect (toast, coming soon);
  - the list is grouped by meeting (heading: meeting title as a Link, plus `formatShortDate`). Rows: checkbox (useUpdateTask toggle), text, assignee avatar and name, and a `(mm:ss)` `text-link` that links to `/meetings/{id}?t={s}`;
  - empty state: ListChecks, "All your meeting tasks in one place", "Manage, assign and update all your meeting tasks here.", and "+ New".
- [ ] **Step 7: `NewTaskDialog`:** a meeting select (from `useMeetings({limit: 100})`), task text (1–500), and an assignee select (participants from `useMeeting(selectedId)`, plus "Unassigned"). It submits with `createActionItem`, then toasts "Task added" and invalidates `['tasks']`.
- [ ] **Step 8: Verify.** pytest, then lint, typecheck, vitest and build. In the browser: toggling a task updates the meeting page too; New task appears; My Tasks shows only Jordan's.
- [ ] **Step 9: Commit** backend and frontend separately:
  - `git commit -m "feat(backend): list action items across meetings for the Tasks page"`;
  - `git commit -m "feat(frontend): Tasks page with my/all tasks, status filter and new task dialog"`.

### Task 7: Settings

**Files:**
- Modify: `src/app/settings/page.tsx`
- Create: `src/components/settings/SettingsView.tsx`, `src/components/settings/ThemePicker.tsx`

- [ ] **Step 1: Layout.** A left menu (`w-60`; a horizontal scroll strip of pills below md) with Profile header card (avatar, email, "Free Plan"), then `Personal | Team` pills (Team disabled), then sections: Appearance (BETA badge), Profile, Notifications, Recording & Privacy, About. The menu uses `?section=` in the URL, and the right side renders the matching cards, `max-w-2xl`.
- [ ] **Step 2: `ThemePicker`.** Three 96×72 option buttons (Sun "Light", Moon "Dark", Monitor "System") in a `role="radiogroup"`. The selected one gets `ring-1 ring-brand-400 bg-brand-50 text-brand-700`. It uses `useTheme().setPreference`; the helper text is "Choose how the application looks. Select System to automatically match your device settings."
- [ ] **Step 3: Other sections.**
  - **Profile:** name and email (read-only, with a "Managed by your workspace" note).
  - **Notifications:** toggles "Meeting recap email", "Mentions", disabled, with a Coming soon badge.
  - **Recording & Privacy:** "Auto-join meetings", "Meeting language: English (Global)" (disabled select).
  - **About:** "This is an educational clone built for an assignment. It isn't affiliated with Fireflies.ai.", the stack, and a link to the GitHub repo.
- [ ] **Step 4: Verify.** The theme persists across reload and follows the OS when System is chosen (check with DevTools emulation or `resize_window colorScheme`). Lint, typecheck and build.
- [ ] **Step 5: Commit** with `git commit -m "feat(frontend): Fireflies-style settings with a working theme picker"`.

### Task 8: Responsive and accessibility pass, then live verification

- [ ] At 390px, check every page: no horizontal scroll; dialogs fit (`max-h-[90dvh]`, full-width on phones); the meeting page tabs work; the player is reachable; tap targets ≥ 36px.
- [ ] Keyboard: tab through the rail, top bar, Capture menu, filters pop-over, meeting tabs and transcript lines, with a visible `focus-visible` ring everywhere (`outline-brand-500`); Esc closes pop-overs and dialogs.
- [ ] Loading, empty and error states on Home, Meetings, the meeting page and Tasks (stop the backend locally to see errors, then Retry).
- [ ] Lint, typecheck, vitest, build and pytest all green. Then push, and let Vercel redeploy.
- [ ] Live click-through on the Vercel URL, every row of spec §17 (light and dark, desktop and phone width), plus a side-by-side look with the Fireflies tab. Fix blockers immediately; list cosmetic ones.
- [ ] Then the remaining main-plan items: delete-meeting check, Railway redeploy persistence check (user redeploys), README (main plan Task 16), extras (Tasks 17–19, explained first), final (Tasks 20–21).
