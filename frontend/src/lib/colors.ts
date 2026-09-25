// Avatar colours are computed from the participant id, so they're stable without being stored.
const PALETTE = ["#7a5af8", "#0ba5ec", "#12b76a", "#f79009", "#ee46bc", "#2e90fa", "#f04438", "#15b79e"];

export function participantColor(id: number): string {
  return PALETTE[Math.abs(id) % PALETTE.length];
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}
