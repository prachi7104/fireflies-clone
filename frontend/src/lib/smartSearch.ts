// "Smart Search" insights, computed in the browser from the transcript the meeting page already loaded.
import type { Segment } from "./types";

export type SmartFilter = "questions" | "tasks" | "metrics" | "dates";

// A metric is a percentage, an amount of money, or a number followed by something countable.
const METRIC = new RegExp(
  [
    "\\d[\\d,.]*\\s?(?:%|percent\\b)",
    "[$€£₹]\\s?\\d",
    "\\b\\d[\\d,.]*\\s?(?:k|m|bn|x)\\b",
    "\\b\\d[\\d,.]*\\s+(?:users|customers|accounts|seats|signups|tickets|bugs|deals|leads|people|dollars|days|weeks|months|hours|minutes|points|stops|drivers|fleets)\\b",
  ].join("|"),
  "i",
);

const DATE = new RegExp(
  [
    "\\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\\b",
    "\\b(?:jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}\\b",
    "\\b(?:today|tomorrow|tonight|yesterday|next (?:week|month|quarter|sprint)|this week|end of (?:the )?(?:day|week|month)|eod|eow|q[1-4])\\b",
    "\\b\\d{1,2}(?::\\d{2})?\\s?(?:am|pm)\\b",
  ].join("|"),
  "i",
);

export function matchSmartFilter(filter: Exclude<SmartFilter, "tasks">, text: string): boolean {
  if (filter === "questions") return text.includes("?");
  if (filter === "metrics") return METRIC.test(text);
  return DATE.test(text);
}

/** Indexes of the transcript lines a filter matches. "Tasks" means lines an action item was taken from. */
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
  share: number; // whole percent; all speakers add up to 100
  wpm: number;
}

/** Talk time per speaker, like Fireflies' "Speaker talktime": share of speaking time and words per minute. */
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
  const stats = [...totals.entries()]
    .map(([id, entry]) => ({
      id,
      name: names.get(id) ?? "Unknown speaker",
      talkMs: entry.talkMs,
      exact: allMs > 0 ? (entry.talkMs / allMs) * 100 : 0,
      wpm: entry.talkMs > 0 ? Math.round(entry.words / (entry.talkMs / 60_000)) : 0,
    }))
    .sort((a, b) => b.talkMs - a.talkMs);

  // Round down, then hand the leftover points to the largest remainders so the total stays 100.
  const shares = stats.map((stat) => Math.floor(stat.exact));
  let leftover = allMs > 0 ? 100 - shares.reduce((sum, share) => sum + share, 0) : 0;
  const byRemainder = stats.map((stat, index) => index).sort((a, b) => stats[b].exact - shares[b] - (stats[a].exact - shares[a]));
  for (const index of byRemainder) {
    if (leftover <= 0) break;
    shares[index] += 1;
    leftover -= 1;
  }

  return stats.map((stat, index) => ({ id: stat.id, name: stat.name, talkMs: stat.talkMs, wpm: stat.wpm, share: shares[index] }));
}
