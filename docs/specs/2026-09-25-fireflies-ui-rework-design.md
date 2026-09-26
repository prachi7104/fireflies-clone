# Fireflies UI Rework: Design Spec

- **Date:** 2026-09-25 (evening)
- **Status:** Implemented
- **Extends:** `2026-09-25-fireflies-clone-design.md`. That spec still holds for the backend, schema, API and behaviour. This one replaces its §11 "UI" details and the "original logo" decision.
- **Why:** the brief says the app "should totally resemble Fireflies's design", and UI/UX similarity is an evaluation criterion. A side-by-side check against the logged-in Fireflies app showed that every feature works but the layout and shell don't look like Fireflies.

## 1. Decisions

| Topic | Decision |
|---|---|
| Theme | **Dark by default** (matching the logged-in Fireflies workspace), plus a **Light / Dark / System** picker in Settings, the same as Fireflies. This also covers the brief's "Dark mode" bonus. |
| Branding | The Fireflies "F" logo mark (chosen over an earlier lookalike mark), used in the rail and as the tab icon. No ".clone" text. Tab titles read "… · Fireflies". The "not affiliated" note is in Settings → About and the README. |
| Scope | All screens: shell, meeting page, Meetings library, Home, Tasks, Settings. |

## 2. Reference observations (logged-in Fireflies, 2026-09-25)

- **Colours (light):** the Untitled-UI greys we already use (text #101828 / #344054 / #475467 / #667085, labels #98A2B3), chips #F9FAFB with a 4px radius, tab pills #F2F4F7 with a 6px radius, timestamp links #175CD3, violet primary (~#6938EF). Fonts are Inter, with DM Sans on tabs.
- **Colours (dark):** page #131314, panels #1E1E1F, raised #292929, text #FAFAFB / #D1D1D6 / #AEAEB2 / #868686, timestamp links #84CAFF.
- **Shell:** a 56px icon rail with tooltips (Home, AskFred, Meetings, Tasks, Skills, Analytics, Agents, Upgrade; at the bottom Invite, Integrations, Settings). The top bar shows the page title, a centred search "Search by title or keyword · Ctrl+K", Upgrade, a bell and a violet **Capture ▾** split button.
- **Home:** a welcome banner, three Quick Start cards (Schedule / Upload File / Capture) and a list with Recent / Upcoming / AI Feed tabs.
- **Meetings:** three columns: a channels panel (My Meetings, All Meetings, Voice Agent Meetings, Uploads, channels), the list with "Hosted by me / Shared with me", Filters and a search icon, and an AskFred panel. The Filters pop-over has two panes (categories on the left; options on the right, e.g. Any Time / Today / Last 7 / 14 / 30 days / Custom).
- **Meeting page:**
  - breadcrumb "#All Meetings / Title" with a "…" menu (Share, Copy Link, Meeting info, Download) and a Share button;
  - left: "Smart Search" (AI filters with counts, sentiments, speaker talk time, topic trackers);
  - centre: Notes / AI Skills tabs, then title and meta, General Summary, topic headings, bullets with blue `(mm:ss)` links, and action items grouped by person;
  - right: AskFred / Transcript tabs. The transcript has a "Find or Replace" box, square letter avatars, and "Name · 00:00" above each paragraph;
  - bottom: a full-width player (time on the left; speed, −/+ skip and play in the centre).
- **Tasks:** My Tasks / All Tasks and "+ New".
- **Settings:** a left menu (Personal/Team, Appearance, …) with cards on the right. Appearance is a Light / Dark / System picker.

## 3. Theme system

- `globals.css` keeps the Tailwind scale names (`gray-50…900`, `brand-*`) but points them at CSS variables. Light values are declared on `:root` and dark values on `[data-theme="dark"]`. Components keep classes like `text-gray-700`, and dark mode flips the scale.
- Semantic tokens replace the 33 hard-coded `bg-white`: `bg-surface` (panels), `bg-canvas` (page), `bg-raised` (chips, pills). Link blue becomes `text-link`.
- `lib/theme.ts` holds a `ThemePreference` of `light | dark | system` (default `dark`), stored in `localStorage` under `theme`, resolved with `matchMedia('(prefers-color-scheme: dark)')`, and applied as `data-theme` on `<html>`.
- A tiny inline script in `layout.tsx` sets `data-theme` before the first paint, so there's no light flash. It's wrapped in try/catch because storage can be blocked.

## 4. Shell

- `IconRail` replaces `Sidebar`:
  - Home `/`, AskFred `/askfred`, Meetings `/meetings`, Tasks `/tasks`, Skills `/skills`, Analytics `/analytics`, Agents `/live`, and Upgrade (toast);
  - at the bottom: Invite `/team`, Integrations `/integrations`, Settings `/settings`;
  - every item has a tooltip and an `aria-label`, and the active item gets a tinted square;
  - "Coming soon" pages stay for AskFred, Skills, Analytics, Agents, Team and Integrations.
- `Topbar`:
  - the page title on the left;
  - a centred search with a `Ctrl+K` / `⌘K` hint and shortcut, driving `/meetings?q=` as it does today;
  - on the right: Upgrade (toast), notifications and a **Capture ▾** split button. The main button and "Upload audio or video" open the create dialog on the Upload tab; "Paste transcript" opens the Paste tab; "Add to live meeting" and "Schedule new meeting" show a Coming Soon toast;
  - the avatar and profile menu sit at the top of the rail, as in Fireflies.
- The meeting page has its own header with the breadcrumb, so the global top bar is hidden on `/meetings/[id]`, as in Fireflies.

## 5. Screens

**Home `/`** (it used to redirect to `/meetings`):
- a welcome banner, "Welcome aboard, Jordan!";
- three Quick Start cards: Schedule Meeting (toast), Upload File (create dialog), Capture Meeting (toast);
- tabs:
  - **Recent** shows the 5 latest meetings;
  - **Upcoming** shows an empty state ("Connect a calendar", coming soon);
  - **AI Feed** shows the latest meetings' overview snippets.
- It uses the existing `GET /api/meetings`.

**Meetings `/meetings`**
- **Left channels panel:**
  - My Meetings and All Meetings: the same list, because there's one user;
  - Uploads: `view=uploads`, as today;
  - Voice Agent Meetings: disabled, with a Soon tag;
  - "All channels": the empty state with "+ Channel" (toast).
- **Centre:**
  - a toolbar with "Hosted by me / Shared with me": "Shared" shows an empty state, because sharing is out of scope;
  - a **Filters** pop-over with two panes:
    - Participants: a checkbox list with search;
    - Date Range: Any Time / Today / Last 7 / 14 / 30 days / Custom;
    - Captured From: Upload / Paste / Seed, mapped to the existing `source` param;
  - a sort toggle;
  - a search icon that expands an inline search box;
  - rows keep today's data in a Fireflies row style.
- **Right: AskFred panel.** Greeting, suggestion chips and an input. Sending shows "AskFred is coming soon". It's hidden below 1280px.
- All state stays in the URL, as today.

**Meeting page `/meetings/[id]`**
- **Header:**
  - breadcrumb "#All Meetings / Title";
  - a "…" menu with Edit details, Copy link, Download (Task 19; until then a toast), and Delete;
  - a Share button that copies the link, with a toast;
  - Upgrade.
- **Left, Smart Search** (about 300px; it collapses to its icon strip below 1280px). Every count is computed in the browser from data we already have, in `lib/smartSearch.ts`, which is pure and unit-tested:
  - **AI filters:**
    - Questions: sentences ending in "?";
    - Tasks: segments that have an action item;
    - Metrics: numbers, % and currency;
    - Date & Time: weekdays, months, "tomorrow", "next week" and times.
  - **Speaker talk time:** per speaker, the % of spoken time and words per minute.
  - **Topic trackers:** our keywords as chips.
  - Clicking a filter narrows the transcript to the matching lines, with a "Showing N · Clear" bar. Clicking a keyword puts it into the transcript search.
  - Sentiment is **left out**, because a keyword-list sentiment score would be misleading. It's listed under "future work".
- **Centre, Notes:**
  - "Notes" and "AI Skills (soon)" pill tabs;
  - the title, then meta: "Jordan Lee · Sep 25 2026, 6:27 PM · 31 min · 5 participants", with participant avatars;
  - keywords as chips;
  - "General Summary": the overview paragraph;
  - **Notes** as bullets;
  - **Outline**: chapter headings, each with its gist and a blue `(mm:ss)` link that seeks;
  - **Action items grouped by assignee** (then "Unassigned"). Each row keeps today's controls: checkbox, inline edit, assignee menu, timestamp link, delete. The "+ Add action item" row stays.
- **Right:** "AskFred / Transcript" tabs, with Transcript selected by default because it's a core feature. The transcript row matches Fireflies: square avatar, "Name · 00:00" in link blue, then text. The search box keeps next/previous and the "1 of 5" count. Auto-follow and the resume button stay.
- **Bottom:** a full-width player with a thin seek bar across the top. The time sits on the left; speed, −15 / play / +15 in the centre; chapter ticks on the seek bar. The "simulated playback" note becomes a tooltip on an info icon.
- Sync behaviour, hooks and the `?t=` deep link don't change.

**Tasks `/tasks`** (new):
- "My Tasks / All Tasks" pill tabs, and "Open / Completed" filter chips;
- a list grouped by meeting (meeting title with a link to its date). Each row has a checkbox, text, assignee and a timestamp link that opens `/meetings/{id}?t=…`;
- "+ New" opens a small dialog: a meeting select, text and an assignee chosen from that meeting's participants.
- **Backend (test-first):** `GET /api/action-items?scope=mine|all&status=open|done|all`.
  - Scoped to the current user's meetings.
  - `mine` means the assignee is the participant linked to the current user (`participants.user_id`).
  - Sorted by open items first, then the meeting's `started_at` descending.
  - Response: `{items: TaskItem[]}`, where `TaskItem` is `ActionItem` plus `{meeting_title, meeting_started_at, assignee_name}`.
  - The rest of creating, editing, completing and deleting reuses the existing endpoints.

**Settings `/settings`**
- A left menu: Appearance, Profile, Notifications, Recording & Privacy (placeholder), About.
- **Appearance:** the Light / Dark / System picker (working).
- **Profile:** from `/api/me`.
- **Notifications and Recording:** toggles as placeholders, with a Coming soon badge.
- **About:** the educational-clone disclaimer.

**Dialogs:** the existing create, edit and delete dialogs switch to theme tokens and match the Fireflies modal. They keep today's behaviour.

## 6. Responsive

- ≥ 1280px: all columns.
- 1024–1279px: the AskFred panel is hidden and Smart Search collapses to icons.
- < 1024px: the channels panel becomes a dropdown above the list, and the meeting page stacks (tabs switch between Notes and Transcript), with the player still fixed at the bottom.
- The 56px rail stays at every width, including phones.

## 7. Testing

- **Vitest:** `smartSearch` (each filter, talk-time maths, empty input), `theme` (resolving the preference), and grouping action items by assignee.
- **Pytest:** the tasks endpoint: scope, status, ownership (another user's meetings are never returned), and ordering.
- `npm run lint`, `npm run typecheck`, `npx vitest run`, `npm run build` and the backend `pytest` all pass. Then a click-through in the built-in browser, in light and dark, at 1440 / 1024 / 390px, compared screen by screen with the Fireflies screenshots.

## 8. Order of work and cut line

1. Theme tokens, the theme switcher and the shell (rail, top bar, Capture menu, logo).
2. Meeting page layout: header, notes centre, transcript tab, full-width player.
3. Smart Search panel.
4. Meetings library: three columns and the Filters pop-over.
5. Home.
6. Tasks: backend endpoint, then page.
7. Settings.

Each step is committed separately and pushed only with approval. If the 07:30 freeze gets close, cut from the bottom: 7, then 6, then 5. Steps 1–4 are the core of the similarity score.

## 9. Out of scope

- Real AskFred answers (the Groq "ask" endpoint stays a nice-to-have).
- Sentiment, channels, voice agents, sharing and calendar.
- Their exact logo asset.
